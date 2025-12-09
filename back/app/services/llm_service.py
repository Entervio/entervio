"""LLM Service using Groq for Interview Scenarios"""

import asyncio
import json
import logging
from typing import Any, Literal

import google.generativeai as genai
import numpy as np
from groq import Groq

from app.core.config import settings
from app.mcp.server import search_jobs

# Setup logging
logger = logging.getLogger(__name__)

InterviewerType = Literal["nice", "neutral", "mean"]

# Base interview instructions (common to all types)
BASE_INTERVIEW_INSTRUCTIONS = """Tu es un recruteur professionnel français qui mène un entretien d'embauche.

RÈGLES CRITIQUES - FEEDBACK CONCIS:
- Donne des feedbacks TRÈS COURTS (1-2 phrases maximum)
- NE PAS écrire de longs paragraphes de félicitations
- NE PAS dire "c'est excellent", "vous êtes génial", "parfait" à répétition
- Feedback format: "Bien." ou "Intéressant." puis PASSE À LA QUESTION SUIVANTE
- Exemple: "D'accord, je comprends. Parlons maintenant de..."

STRUCTURE DE L'ENTRETIEN:
- L'entretien doit durer environ 5 questions au total
- Compte mentalement les questions posées
- Après la 5ème question, conclus naturellement l'entretien
- Questions: 1) Présentation, 2) Expérience clé, 3) Compétences techniques, 4) Motivations, 5) Question de situation/défi

STYLE DE QUESTIONS:
- Questions directes et professionnelles
- Pas de questions trop longues
- Écoute les réponses et adapte-toi
- Pose des questions de suivi si nécessaire mais reste dans la limite de 5 questions totales"""

# Interviewer personality prompts
INTERVIEWER_PROMPTS = {
    "nice": """PERSONNALITÉ: Recruteur Bienveillant et Encourageant

Tu es chaleureux, positif et encourageant. Tu mets le candidat à l'aise.

COMPORTEMENT:
- Ton accueillant et amical
- Souris dans ta voix (utilise un langage positif)
- Encourage le candidat: "C'est très bien", "J'aime votre approche"
- Feedbacks positifs mais COURTS: "Super." puis question suivante
- Crée une atmosphère détendue et confortable
- Reformule positivement: "Intéressant, et si on parlait de..."

EXEMPLE DE STYLE:
❌ MAUVAIS: "Wow, c'est absolument fantastique ! Votre expérience est vraiment impressionnante et montre une grande maturité professionnelle. Je suis vraiment ravi d'entendre cela !"
✅ BON: "Très bien, j'apprécie votre franchise. Maintenant, parlez-moi d'un projet technique..."

IMPORTANT: Reste bienveillant mais CONCIS dans tes feedbacks.""",
    "neutral": """PERSONNALITÉ: Recruteur Professionnel et Objectif

Tu es neutre, factuel et professionnel. Tu évalues objectivement sans être ni trop chaleureux ni froid.

COMPORTEMENT:
- Ton professionnel et mesuré
- Feedbacks factuels et COURTS: "D'accord." puis question suivante
- Pas d'émotions excessives (ni trop positif ni négatif)
- Questions directes et claires
- Écoute attentive mais sans commentaires élaborés
- Transitions neutres: "Je vois. Passons à...", "Compris. Maintenant..."

EXEMPLE DE STYLE:
❌ MAUVAIS: "Merci pour cette réponse détaillée. C'est effectivement une approche intéressante qui démontre votre capacité d'analyse."
✅ BON: "D'accord. Parlez-moi d'une situation difficile que vous avez gérée."

IMPORTANT: Reste neutre et CONCIS dans tes feedbacks.""",
    "mean": """PERSONNALITÉ: Recruteur Exigeant et Direct

Tu es exigeant, critique et direct. Tu testes la résistance au stress du candidat.

COMPORTEMENT:
- Ton sec et direct, parfois légèrement sarcastique
- Feedbacks critiques mais COURTS: "Hmm." ou "On verra." puis question suivante
- Questions qui challengent le candidat
- Relève les faiblesses: "C'est tout ?", "Plutôt banal."
- Crée une légère pression (reste professionnel, pas insultant)
- Scepticisme dans les transitions: "Bien, et concrètement...", "Passons à autre chose."

EXEMPLE DE STYLE:
❌ MAUVAIS: "Votre réponse manque vraiment de substance et je dois dire que je m'attendais à beaucoup mieux de la part d'un candidat avec votre profil."
✅ BON: "Hmm, c'est vague. Donnez-moi un exemple concret avec des résultats chiffrés."

IMPORTANT: Sois exigeant mais garde des feedbacks COURTS. Ne sois pas méchant, juste direct et exigeant.""",
}


def get_system_prompt(
    interviewer_type: InterviewerType,
    candidate_context: str = "",
    job_description: str = "",
) -> str:
    """Get the complete system prompt for the given interviewer type."""
    base_prompt = (
        f"{BASE_INTERVIEW_INSTRUCTIONS}\n\n{INTERVIEWER_PROMPTS[interviewer_type]}"
    )

    if job_description:
        base_prompt += f"\n\nDESCRIPTION DU POSTE:\n{job_description}\n\nINSTRUCTION: Tu dois mener cet entretien spécifiquement pour ce poste. Tes questions doivent évaluer l'adéquation du candidat avec cette description."

    if candidate_context:
        base_prompt += f"\n\nCONTEXTE DU CANDIDAT (CV):\n{candidate_context}\n\nINSTRUCTION: Utilise ce contexte pour poser des questions personnalisées sur l'expérience et les compétences du candidat."
    return base_prompt


class LLMService:
    def __init__(self):
        """Initialize with Groq using settings from config."""
        logger.info("🔄 Initializing LLMService...")

        # Get API keys
        groq_api_key = settings.GROQ_API_KEY

        # Initialize Groq
        self.groq_client = None
        if groq_api_key:
            try:
                self.groq_client = Groq(api_key=groq_api_key)
                logger.info("✅ Groq client initialized successfully!")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Groq client: {str(e)}")
        else:
            logger.warning("⚠️ GROQ_API_KEY not configured. LLM features will not work.")

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
            logger.warning("⚠️ GEMINI_API_KEY not configured. Embeddings will not work.")
            self.has_gemini = False

    def get_initial_greeting(
        self,
        candidate_name: str,
        interviewer_type: InterviewerType,
        candidate_context: str = "",
        job_description: str = "",
    ) -> str:
        """
        Generate personalized initial greeting based on interviewer type.

        Args:
            candidate_name: The candidate's name
            interviewer_type: Type of interviewer (nice, neutral, mean)
            candidate_context: Context from resume
            job_description: Job description context

        Returns:
            Personalized greeting message
        """
        logger.info(
            f"👋 Generating greeting for {candidate_name} with {interviewer_type} interviewer"
        )

        greetings = {
            "nice": f"""Bonjour {candidate_name} ! Je suis absolument ravi de vous rencontrer aujourd'hui.

Je serai votre interlocuteur pour cet entretien et je veux que vous vous sentiez parfaitement à l'aise. Mon objectif est de découvrir qui vous êtes vraiment, vos talents et vos aspirations.

N'hésitez surtout pas à être vous-même - il n'y a pas de mauvaises réponses ici ! Je suis simplement curieux d'en apprendre plus sur vous.

Pour commencer, pourriez-vous vous présenter en quelques mots ? Parlez-moi de votre parcours.""",
            "neutral": f"""Bonjour {candidate_name}.

Je serai votre interlocuteur aujourd'hui. L'objectif de cet entretien est d'évaluer votre profil, vos compétences et votre adéquation avec le poste.

Nous allons passer en revue votre expérience et vos motivations. Soyez précis dans vos réponses.

Commençons. Présentez-vous brièvement.""",
            "mean": f"""Bonjour {candidate_name}.

Je n'ai pas beaucoup de temps, alors allons droit au but. J'ai vu beaucoup de candidats cette semaine et franchement, peu m'ont impressionné.

J'attends des réponses concrètes, avec des exemples précis et des résultats mesurables. Pas de langue de bois.

Présentez-vous. Et soyez synthétique.""",
        }

        return greetings[interviewer_type]

    async def chat(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        interviewer_type: InterviewerType,
        candidate_context: str = "",
        job_description: str = "",
    ) -> str:
        """
        Send message to Groq and get interviewer response.
        """
        logger.info(
            f"💬 Processing candidate response with {interviewer_type} interviewer"
        )

        if not self.groq_client:
            raise ValueError("Groq client not initialized")

        try:
            # 1. Build System Prompt
            system_prompt = get_system_prompt(
                interviewer_type, candidate_context, job_description
            )

            # 2. Build Messages
            messages = [{"role": "system", "content": system_prompt}]

            # Add history
            for msg in conversation_history:
                # Groq/OpenAI format is 'assistant' for model
                role = "assistant" if msg["role"] == "assistant" else msg["role"]
                # Map 'model' back to 'assistant' if it came from Gemini history
                if role == "model":
                    role = "assistant"
                messages.append({"role": role, "content": msg["content"]})

            # Add current message (if not already in history? usually caller appends it, but let's check)
            # The signature says 'message' is passed separately.
            messages.append({"role": "user", "content": message})

            # 3. Call API
            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                temperature=0.7,
                max_tokens=1024,
            )

            response_text = completion.choices[0].message.content

            logger.info(
                f"✅ Got {interviewer_type} interviewer response ({len(response_text)} chars)"
            )
            return response_text

        except Exception as e:
            logger.error(f"❌ Chat error: {str(e)}")
            raise

    async def grade_response(
        self, question: str, answer: str, interviewer_type: InterviewerType
    ) -> dict[str, any]:
        """
        Grade a candidate's response to an interview question.
        """
        logger.info(f"📊 Grading response with {interviewer_type} interviewer...")

        if not self.groq_client:
            return {"grade": 5, "feedback": "Service non disponible"}

        try:
            system_prompt = get_system_prompt(interviewer_type)

            grading_prompt = f"""Tu dois évaluer la réponse d'un candidat.

            QUESTION: {question}
            RÉPONSE: {answer}

            Consignes:
            - Note de 1 à 10.
            - Feedback court (2-3 phrases).

            Format JSON de réponse:
            {{
                "grade": 8,
                "feedback": "Explication..."
            }}
            """

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                        + "\n\nTu es un evaluateur qui répond en JSON.",
                    },
                    {"role": "user", "content": grading_prompt},
                ],
                response_format={"type": "json_object"},
            )

            result = json.loads(completion.choices[0].message.content)
            logger.info(f"✅ Response graded: {result.get('grade')}/10")
            return result

        except Exception as e:
            logger.error(f"❌ Grading error: {str(e)}")
            return {"grade": 5, "feedback": "Erreur lors de l'évaluation."}

    async def end_interview(
        self,
        conversation_history: list[dict[str, str]],
        interviewer_type: InterviewerType,
    ) -> dict[str, Any]:
        """
        Generate structured feedback using Groq.
        """
        logger.info(
            f"📝 Generating structured interview feedback with {interviewer_type} interviewer..."
        )

        if not self.groq_client:
            raise ValueError("Groq client not initialized")

        try:
            # Build valid history for context
            messages = []
            for msg in conversation_history:
                role = "assistant" if msg["role"] == "assistant" else msg["role"]
                # fix gemini usage
                if role == "model":
                    role = "assistant"
                messages.append({"role": role, "content": msg["content"]})

            prompt = f"""ANALYSIS REQUEST:
            The interview is finished. Based on the conversation history above, provide a structured evaluation.

            Personality: {interviewer_type}

            Output JSON:
            {{
                "score": 0-10,
                "strengths": ["string"],
                "weaknesses": ["string"],
                "tips": ["string"],
                "overall_comment": "string"
            }}
            """

            messages.append({"role": "user", "content": prompt})

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"},
            )

            feedback_data = json.loads(completion.choices[0].message.content)
            logger.info("✅ Structured interview feedback generated")
            return feedback_data

        except Exception as e:
            logger.error(f"❌ Error generating feedback: {str(e)}")
            return {
                "score": 5,
                "strengths": ["Participation"],
                "weaknesses": ["Erreur generation"],
                "tips": [],
                "overall_comment": "Erreur technique.",
            }

    async def compute_similarity_ranking(
        self, candidate_profile: str, jobs: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        """
        Rerank jobs using Google Embeddings (text-embedding-004) with Batching + Async safety.
        """
        logger.info(f"⚖️ Reranking {len(jobs)} jobs using Google Embeddings...")

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

            # 3. Define the synchronous embedding worker
            # We wrap this entire block to run it in a thread
            def _get_embeddings_sync():
                # A. Embed Profile (Query)
                profile_resp = genai.embed_content(
                    model="models/text-embedding-004",
                    content=profile_text,
                    task_type="retrieval_query",
                )
                p_vec = np.array(profile_resp["embedding"])

                # B. Embed Jobs (Batch)
                jobs_resp = genai.embed_content(
                    model="models/text-embedding-004",
                    content=job_texts,
                    task_type="retrieval_document",
                )

                # The response structure for batch input usually contains a list of embeddings
                j_vecs = np.array(jobs_resp["embedding"])
                return p_vec, j_vecs

            # 4. Run blocking network calls in a thread pool
            profile_vector, job_vectors = await asyncio.to_thread(_get_embeddings_sync)

            # Ensure job_vectors is at least 2D
            if job_vectors.ndim == 1:
                job_vectors = job_vectors.reshape(1, -1)

            # 5. Compute Similarity (Vectorized Math is faster)
            # Normalize vectors
            norm_profile = np.linalg.norm(profile_vector)
            norm_jobs = np.linalg.norm(job_vectors, axis=1)

            # Avoid division by zero
            # Create a mask for valid norms
            valid_norms = (norm_profile > 0) & (norm_jobs > 0)

            # Dot product of Profile (1, D) and Jobs (N, D) -> (N,)
            # We can use pure numpy broadcasting here for speed
            scores = np.zeros(len(valid_jobs))

            if norm_profile > 0:
                dot_products = np.dot(job_vectors, profile_vector)
                # Cosine Sim = Dot / (NormA * NormB)
                # Handle safe division
                similarities = np.divide(
                    dot_products,
                    norm_profile * norm_jobs,
                    out=np.zeros_like(dot_products),
                    where=valid_norms,
                )
                scores = similarities * 100

            # 6. Assign Scores & Reasoning
            reranked_jobs = []
            for i, job in enumerate(valid_jobs):
                final_score = int(scores[i])
                job["relevance_score"] = final_score

                # Dynamic reasoning based on score bucket
                if final_score >= 85:
                    reasoning = "Excellent match stratégique (IA)"
                elif final_score >= 70:
                    reasoning = "Forte correspondance avec votre profil (IA)"
                elif final_score >= 50:
                    reasoning = "Correspondance potentielle (IA)"
                else:
                    reasoning = "Pertinence limitée"

                job["relevance_reasoning"] = reasoning
                reranked_jobs.append(job)

            # 7. Sort
            reranked_jobs.sort(key=lambda x: x["relevance_score"], reverse=True)

            logger.info(
                f"✅ Jobs reranked via Google Embeddings (Top: {reranked_jobs[0]['relevance_score'] if reranked_jobs else 0})"
            )
            return reranked_jobs

        except Exception as e:
            logger.error(f"❌ Error in RAG Reranking: {str(e)}")
            # Fallback: Return original list order if AI fails
            return jobs

    async def search_with_tools(
        self, user_query: str, user_context: str, tools: list[Any]
    ) -> list[dict]:
        """
        Perform a search using Groq tool calling (OpenAI compatible).
        """
        logger.info(f"🛠️ Starting search with tools (Groq) for query: '{user_query}'")

        try:
            if not self.groq_client:
                raise ValueError("Groq client not initialized")

            # OpenAI/Groq Tool Definition
            tools_schema = [
                {
                    "type": "function",
                    "function": {
                        "name": "search_jobs",
                        "description": "Search for jobs in France using France Travail API with advanced filters.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "query": {
                                    "type": "string",
                                    "description": "Job title, keywords, or domain (e.g. 'Développeur Python')",
                                },
                                "location": {
                                    "type": "string",
                                    "description": "City name or zip code (e.g. 'Paris', '69002'). Omit this parameter if no location is specified.",
                                },
                                "contract_type": {
                                    "type": "string",
                                    "enum": ["CDI", "CDD", "MIS", "ALE", "DDI", "DIN"],
                                    "description": "Type of contract. Omit if not specified.",
                                },
                                "is_full_time": {
                                    "type": "boolean",
                                    "description": "Set to true if user specifically asks for full-time work. Omit otherwise.",
                                },
                                "sort_by": {
                                    "type": "string",
                                    "enum": ["date", "relevance"],
                                    "description": "Sort order. Omit if not specified.",
                                },
                            },
                            "required": ["query"],
                        },
                    },
                }
            ]

            messages = [
                {
                    "role": "system",
                    "content": f"You are a Job Search Agent. \nContext: {user_context}\n\nTask: Search for relevant jobs using the 'search_jobs' tool.\n\nSTRATEGY: To ensure results, you MUST call the 'search_jobs' tool many TIMES in parallel with different keyword variations:\n1. Exact fit (e.g. 'Développeur Python')\n2. Broader term (e.g. 'Développeur Back-end')\n3. Alternative/English term (e.g. 'Python API')\n\nCRITICAL: DO NOT INVENT A LOCATION. If the user doesn't specify one, OMIT the location parameter entirely.\n\nYou can also infer contract type (CDI/CDD) or full-time preference if explicitly stated.",
                },
                {"role": "user", "content": user_query},
            ]

            response = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                tools=tools_schema,
                tool_choice="auto",
                max_tokens=4096,
                temperature=0,
            )

            response_message = response.choices[0].message
            tool_calls = response_message.tool_calls

            all_found_jobs = []

            if tool_calls:
                logger.info(f"🤖 Groq decided to call {len(tool_calls)} tools")

                # Execute tool calls
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    if function_name == "search_jobs":
                        function_args = json.loads(tool_call.function.arguments)
                        logger.info(f"📞 Calling search_jobs with: {function_args}")

                        query = function_args.get("query")
                        location = function_args.get("location")
                        contract_type = function_args.get("contract_type")
                        is_full_time = function_args.get("is_full_time")
                        sort_by = function_args.get("sort_by")

                        # Call the imported function
                        # search_jobs returns a JSON string
                        jobs_json = await search_jobs.fn(
                            query=query,
                            location=location,
                            contract_type=contract_type,
                            is_full_time=is_full_time,
                            sort_by=sort_by,
                        )

                        try:
                            jobs = json.loads(jobs_json)
                            if isinstance(jobs, list):
                                all_found_jobs.extend(jobs)
                        except Exception as e:
                            logger.error(
                                f"❌ Failed to parse jobs JSON from tool: {e}. Content: {jobs_json[:200]}..."
                            )
            unique_jobs = list({job["id"]: job for job in all_found_jobs if job.get("id")}.values())

            logger.info(f"✅ Extracted {len(unique_jobs)} unique jobs from tool execution")
            return unique_jobs

        except Exception as e:
            logger.error(f"❌ Error in search_with_tools (Groq): {str(e)}")
            return []


# Singleton instance - initialized on first import
_llm_service_instance = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _llm_service_instance
    if _llm_service_instance is None:
        logger.info("🚀 Creating llm_service singleton...")
        _llm_service_instance = LLMService()
        logger.info("✅ llm_service singleton created!")
    return _llm_service_instance


# For convenience
llm_service = get_llm_service()
