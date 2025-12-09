"""LLM Service using Groq for Interview Scenarios"""

import asyncio
import json
import logging
from typing import Any, Literal

import google.generativeai as genai
import numpy as np
from groq import Groq
from pydantic import BaseModel, field_validator

from app.core.config import settings
from app.mcp.server import search_jobs


class SearchJobsArgs(BaseModel):
    """Pydantic model for validating LLM search_jobs tool call arguments."""

    query: str
    location: str | None = None
    contract_type: Literal["CDI", "CDD", "MIS", "ALE", "DDI", "DIN"] | None = None
    is_full_time: bool | None = None
    sort_by: Literal["date", "relevance"] | None = None
    experience: Literal["0", "1", "2", "3"] | None = None
    experience_exigence: Literal["D", "S", "E"] | None = None
    grand_domaine: (
        Literal[
            "A",
            "B",
            "C",
            "C15",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "L14",
            "M",
            "M13",
            "M14",
            "M15",
            "M16",
            "M17",
            "M18",
            "N",
        ]
        | None
    ) = None
    published_since: int | None = None

    @field_validator("query")
    @classmethod
    def query_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("query must not be empty")
        return v.strip()


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
                                "experience": {
                                    "type": "string",
                                    "enum": ["0", "1", "2", "3"],
                                    "description": "Experience level: '0' (not specified), '1' (<1 year/junior), '2' (1-3 years/mid), '3' (>3 years/senior). Infer from user context or explicit request.",
                                },
                                "experience_exigence": {
                                    "type": "string",
                                    "enum": ["D", "S", "E"],
                                    "description": "Experience requirement: 'D' (beginner/débutant accepted), 'S' (experience desired/souhaitée), 'E' (experience required/exigée). Use 'D' for juniors, 'E' for seniors.",
                                },
                                "grand_domaine": {
                                    "type": "string",
                                    "enum": [
                                        "A",
                                        "B",
                                        "C",
                                        "C15",
                                        "D",
                                        "E",
                                        "F",
                                        "G",
                                        "H",
                                        "I",
                                        "J",
                                        "K",
                                        "L",
                                        "L14",
                                        "M",
                                        "M13",
                                        "M14",
                                        "M15",
                                        "M16",
                                        "M17",
                                        "M18",
                                        "N",
                                    ],
                                    "description": "Domain code to filter by sector. Key codes: M18=IT/Tech, D=Sales, H=Industry, J=Health, K=Services, F=Construction, N=Transport, M14=Consulting. Use to narrow results.",
                                },
                                "published_since": {
                                    "type": "integer",
                                    "description": "Filter jobs published within the last X days. Use this when the user asks for 'recent' jobs or jobs from the last few days.",
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
                    "content": f"""
                    You are a High-Performance Job Search Orchestrator. Your mission is to generate the optimal set of tool calls (up to 3) to maximize the retrieval of highly relevant job postings for the user.

                    USER CONTEXT (Resume Data): {user_context}

                    --- STRATEGY STEP 1: INTELLIGENT INFERENCE ---

                    1.  **INFER CORE JOB TITLE:** Analyze the 'User Background'. Deduce the user's primary, most marketable professional role (e.g., "Software Engineer", "Full-Stack Developer", "Data Scientist"). This is the **[INFERRED_TITLE]**.
                    2.  **INFER CORE SKILL:** Identify the user's most valuable technical skill (e.g., "Python", "React", "FastAPI"). This is the **[INFERRED_SKILL]**.
                    3.  **DETERMINE EXPERIENCE FILTER:** Map the user's total experience or explicit request:
                        * If explicit request is "junior," or total experience < 2 years, set experience='1' and experience_exigence='D'. (This is the **[EXP_FILTER]**).
                        * Otherwise, OMIT experience filters.

                    --- STRATEGY STEP 2: MANDATORY 3-CALL ORCHESTRATION ---

                    Generate exactly **3 parallel tool calls**. This is non-negotiable for maximum coverage.

                    * **CALL 1: HIGH PRECISION (Title + Filter)**
                        * **Goal:** Capture jobs that are perfectly tagged.
                        * **query:** Use the **[INFERRED_TITLE]** (or the user's explicit title).
                        * **Filters:** Apply the **[EXP_FILTER]** determined in Step 1.
                        * **CRITICAL CONSTRAINT:** **MUST NOT** include any experience keywords (e.g., "junior", "senior") in the 'query'.

                    * **CALL 2: KEYWORD EXPANSION (Skill + Filter)**
                        * **Goal:** Catch jobs that prioritize specific skills over the general title.
                        * **query:** Use the **[INFERRED_SKILL]** (or a synonym like 'Typescript' if the skill is a framework like 'React').
                        * **Filters:** Apply the **[EXP_FILTER]** determined in Step 1.

                    * **CALL 3: BROAD FALLBACK (Recruitment Terms)**
                        * **Goal:** Catch postings that use non-standard terminology or are poorly tagged, relying on the user's explicit term.
                        * **query:** Use the user's **exact typed query** (e.g., "junior", "remote", "stage"). If the user's query is only a filter term, **COMBINE IT** with the **[INFERRED_TITLE]**.
                            * *Example:* User says "junior" -> query="Full-Stack Developer junior"
                        * **Filters:** OMIT *all* structured filters (experience, domain) for this call to maximize recall.

                    --- FINAL GUIDELINES ---

                    * **LOCATION/CONTRACT:** Omit location or contract_type unless **EXPLICITLY** requested by the user.
                    * **VAGUE QUERY HANDLING:** If the user's typed query is vague (e.g., "cherche job"), use the **[INFERRED_TITLE]** for all three calls.
                    * **OUTPUT:** Generate the JSON structure for 3 distinct calls to 'search_jobs'.
                    """,
                },
                {"role": "user", "content": user_query},
            ]

            logger.info(f"🤖 Groq decided to call {messages}")

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
                        try:
                            raw_args = json.loads(tool_call.function.arguments)
                            validated_args = SearchJobsArgs.model_validate(raw_args)
                            logger.info(
                                f"📞 Calling search_jobs with validated args: {validated_args.model_dump(exclude_none=True)}"
                            )
                        except json.JSONDecodeError as e:
                            logger.error(
                                f"❌ Failed to parse tool call arguments as JSON: {e}"
                            )
                            continue
                        except Exception as e:
                            logger.error(
                                f"❌ Pydantic validation failed for search_jobs args: {e}"
                            )
                            continue

                        # Call the imported function with validated args
                        # search_jobs returns a JSON string
                        jobs_json = await search_jobs.fn(
                            query=validated_args.query,
                            location=validated_args.location,
                            contract_type=validated_args.contract_type,
                            is_full_time=validated_args.is_full_time,
                            sort_by=validated_args.sort_by,
                            experience=validated_args.experience,
                            experience_exigence=validated_args.experience_exigence,
                            grand_domaine=validated_args.grand_domaine,
                            published_since=validated_args.published_since,
                        )

                        try:
                            jobs = json.loads(jobs_json)
                            if isinstance(jobs, list):
                                all_found_jobs.extend(jobs)
                        except Exception as e:
                            logger.error(
                                f"❌ Failed to parse jobs JSON from tool: {e}. Content: {jobs_json[:200]}..."
                            )
            unique_jobs = list(
                {job["id"]: job for job in all_found_jobs if job.get("id")}.values()
            )

            logger.info(
                f"✅ Extracted {len(unique_jobs)} unique jobs from tool execution"
            )
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
