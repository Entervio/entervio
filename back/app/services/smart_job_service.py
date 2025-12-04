import asyncio
import logging
from typing import List, Dict, Optional, Any
from app.models.user import User
from app.services.francetravail_service import francetravail_service
from app.services.llm_service import llm_service
from app.services.resume_service import resume_service_instance

logger = logging.getLogger(__name__)

class SmartJobService:
    def __init__(self):
        pass

    async def smart_search(self, user: User, location: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Performs a smart job search for the user.
        
        1. Extracts keywords from user's parsed resume.
        2. Searches France Travail API for each keyword in parallel.
        3. Aggregates and deduplicates results.
        4. Reranks results using LLM based on user profile.
        """
        logger.info(f"🧠 Starting smart search for user {user.id}")

        # 1. Get keywords
        keywords = self._get_search_keywords(user)
        if not keywords:
            logger.warning("⚠️ No keywords found for user. Returning empty list.")
            return []
        
        logger.info(f"🔍 Searching for keywords: {keywords}")

        # 2. Parallel Search
        tasks = []
        for keyword in keywords:
            tasks.append(francetravail_service.search_jobs(keyword, location))
        
        results_list = await asyncio.gather(*tasks, return_exceptions=True)
        
        # 3. Aggregate and Deduplicate
        all_jobs = []
        seen_ids = set()
        
        for result in results_list:
            if isinstance(result, Exception):
                logger.error(f"❌ Error in search task: {result}")
                continue
            
            if result:
                for job in result:
                    job_id = job.get("id")
                    if job_id and job_id not in seen_ids:
                        seen_ids.add(job_id)
                        all_jobs.append(job)
        
        logger.info(f"∑ Found {len(all_jobs)} unique jobs before reranking")
        
        if not all_jobs:
            return []

        # 4. Rerank with LLM
        # Construct a profile summary for the LLM
        profile_summary = resume_service_instance.get_core_context(user.parsed_data or {})
        
        # Limit to top 20 for reranking to save tokens/time if list is huge
        # (Or maybe 50? Let's stick to 30 for now to be safe)
        jobs_to_rank = all_jobs[:30]
        
        reranked_jobs = await llm_service.compute_similarity_ranking(profile_summary, jobs_to_rank)
        
        return reranked_jobs

    def _get_search_keywords(self, user: User) -> List[str]:
        """Extracts top keywords from user's parsed data."""
        if not user.parsed_data:
            return []
            
        search_keywords_data = user.parsed_data.get("search_keywords", [])
        
        # If we have explicit search keywords from the parser
        if search_keywords_data:
            # Extract just the keyword strings, maybe prioritize 'role' or 'skill'
            # Let's just take the top 3 distinct keywords
            keywords = [item.get("keywords") for item in search_keywords_data if item.get("keywords")]
            return list(set(keywords))[:3]
            
        # Fallback: Use top technical skills
        skills = user.parsed_data.get("skills", {}).get("technical", [])
        if skills:
            return skills[:3]
            
        # Fallback: Use last job title
        experience = user.parsed_data.get("work_experience", [])
        if experience:
            last_role = experience[0].get("role")
            if last_role:
                return [last_role]
                
        return []

smart_job_service = SmartJobService()
