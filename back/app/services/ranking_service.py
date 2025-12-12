import asyncio
import logging
from typing import Any

import google.generativeai as genai
import numpy as np

from app.core.config import settings

logger = logging.getLogger(__name__)


def _generate_embeddings_sync(
    profile_text: str, query: str | None, job_texts: list[str]
) -> tuple[np.ndarray, np.ndarray | None, np.ndarray]:
    """
    Helper to generate embeddings synchronously (for use in threads).
    """
    # A. Embed Profile (Query)
    profile_resp = genai.embed_content(
        model="models/text-embedding-004",
        content=profile_text,
        task_type="retrieval_query",
    )
    p_vec = np.array(profile_resp["embedding"])

    # B. Embed Query (if present)
    q_vec = None
    if query:
        query_resp = genai.embed_content(
            model="models/text-embedding-004",
            content=query,
            task_type="retrieval_query",
        )
        q_vec = np.array(query_resp["embedding"])

    # C. Embed Jobs (Batch)
    jobs_resp = genai.embed_content(
        model="models/text-embedding-004",
        content=job_texts,
        task_type="retrieval_document",
    )

    # The response structure for batch input usually contains a list of embeddings
    j_vecs = np.array(jobs_resp["embedding"])
    return p_vec, q_vec, j_vecs


class RankingService:
    def __init__(self):
        logger.info("⚖️ Initializing RankingService...")
        # Initialize Google GenAI (for Embeddings)
        gemini_api_key = settings.GEMINI_API_KEY
        if gemini_api_key:
            try:
                genai.configure(api_key=gemini_api_key)
                logger.info(
                    "✅ Google GenAI initialized successfully (for Embeddings)."
                )
                self.has_gemini = True
            except Exception as e:
                logger.error(f"❌ Failed to initialize Google GenAI: {e}")
                self.has_gemini = False
        else:
            logger.warning("⚠️ GEMINI_API_KEY not configured. Ranking will not work.")
            self.has_gemini = False

    async def compute_similarity_ranking(
        self,
        candidate_profile: str,
        jobs: list[dict[str, Any]],
        query: str | None = None,
    ) -> list[dict[str, Any]]:
        """
        Rerank jobs using Google Embeddings (text-embedding-004) with Batching + Async safety.
        Implements Weighted Hybrid Search:
        - If query is provided: Score = 0.7 * Query_Sim + 0.3 * Profile_Sim
        - If query is missing: Score = Profile_Sim
        """
        logger.info(f"⚖️ Reranking {len(jobs)} jobs using Google Embeddings...")
        if query:
            logger.info(f"🎯 using Weighted Hybrid Reranking (Query: '{query}')")

        # 1. Fast fail checks
        if not jobs or not self.has_gemini:
            return jobs

        # 2. Prepare Data (Sync part is fast enough to run in main thread)
        try:
            # Truncate profile to fit model limits (approx 2048 tokens ~ 8000 chars)
            profile_text = candidate_profile[:8000]

            job_texts = []
            valid_jobs = []

            # Pre-filter jobs to avoid empty text errors
            for job in jobs:
                title = job.get("intitule", "")
                desc = job.get("description", "")[:2000]
                # Skip jobs with literally no info
                if not title and len(desc) < 10:
                    continue

                text = f"Title: {title}\nDescription: {desc}"
                job_texts.append(text)
                valid_jobs.append(job)

            if not job_texts:
                return jobs

            # Cap at 100 to respect batch limits for now (simple safety)
            if len(job_texts) > 100:
                logger.warning(
                    f"⚠️ Capping reranking at 100 jobs (received {len(job_texts)})"
                )
                job_texts = job_texts[:100]
                valid_jobs = valid_jobs[:100]

            # 4. Run blocking network calls in a thread pool
            profile_vector, query_vector, job_vectors = await asyncio.to_thread(
                _generate_embeddings_sync, profile_text, query, job_texts
            )

            # Ensure job_vectors is at least 2D
            if job_vectors.ndim == 1:
                job_vectors = job_vectors.reshape(1, -1)

            # 5. Compute Similarity (Vectorized Math is faster)
            # Normalize vectors
            norm_jobs = np.linalg.norm(job_vectors, axis=1)
            norm_profile = np.linalg.norm(profile_vector)

            # Avoid division by zero
            valid_norms_p = (norm_profile > 0) & (norm_jobs > 0)

            # --- Score Profile ---
            scores_p = np.zeros(len(valid_jobs))
            if norm_profile > 0:
                dot_products_p = np.dot(job_vectors, profile_vector)
                similarities_p = np.divide(
                    dot_products_p,
                    norm_profile * norm_jobs,
                    out=np.zeros_like(dot_products_p),
                    where=valid_norms_p,
                )
                scores_p = similarities_p * 100

            # --- Score Query (if exists) ---
            if query_vector is not None:
                norm_query = np.linalg.norm(query_vector)
                valid_norms_q = (norm_query > 0) & (norm_jobs > 0)
                scores_q = np.zeros(len(valid_jobs))

                if norm_query > 0:
                    dot_products_q = np.dot(job_vectors, query_vector)
                    similarities_q = np.divide(
                        dot_products_q,
                        norm_query * norm_jobs,
                        out=np.zeros_like(dot_products_q),
                        where=valid_norms_q,
                    )
                    scores_q = similarities_q * 100

                # WEIGHTED HYBRID SCORE: 70% Query + 30% Profile
                final_scores = (0.7 * scores_q) + (0.3 * scores_p)
                logger.info("⚖️ Applied weights: 0.7 * Query + 0.3 * Profile")
            else:
                # Fallback to pure profile match
                final_scores = scores_p
                logger.info("⚖️ Using 100% Profile match (no query provided)")

            # 6. Assign Scores & Reasoning
            reranked_jobs = []
            for i, job in enumerate(valid_jobs):
                final_score = int(final_scores[i])
                job["relevance_score"] = final_score

                # Dynamic reasoning based on score bucket
                if final_score >= 85:
                    reasoning = "Excellent match (Top 1%)"
                elif final_score >= 70:
                    reasoning = "Très pertinent"
                elif final_score >= 50:
                    reasoning = "Correspondance moyenne"
                else:
                    reasoning = "Pertinence limitée"

                if query and final_score >= 60:
                    reasoning += " • Aligné avec votre recherche"
                elif final_score >= 60:
                    reasoning += " • Aligné avec votre profil"

                job["relevance_reasoning"] = reasoning
                reranked_jobs.append(job)

            # 7. Sort
            reranked_jobs.sort(key=lambda x: x["relevance_score"], reverse=True)

            logger.info(
                f"✅ Jobs reranked via Hybrid Embeddings (Top: {reranked_jobs[0]['relevance_score'] if reranked_jobs else 0})"
            )
            return reranked_jobs

        except Exception as e:
            logger.error(f"❌ Error in RAG Reranking: {str(e)}")
            # Fallback: Return original list order if AI fails
            return jobs


ranking_service = RankingService()
