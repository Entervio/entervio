"""LLM Service using Google Gemini for Interview Scenarios"""
import google.generativeai as genai
from typing import List, Dict, Literal, Any
import numpy as np
import logging
from app.core.config import settings
import json

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

IMPORTANT: Sois exigeant mais garde des feedbacks COURTS. Ne sois pas méchant, juste direct et exigeant."""
}

def get_system_prompt(interviewer_type: InterviewerType, candidate_context: str = "", job_description: str = "") -> str:
    """Get the complete system prompt for the given interviewer type."""
    base_prompt = f"{BASE_INTERVIEW_INSTRUCTIONS}\n\n{INTERVIEWER_PROMPTS[interviewer_type]}"
    
    if job_description:
        base_prompt += f"\n\nDESCRIPTION DU POSTE:\n{job_description}\n\nINSTRUCTION: Tu dois mener cet entretien spécifiquement pour ce poste. Tes questions doivent évaluer l'adéquation du candidat avec cette description."

    if candidate_context:
        base_prompt += f"\n\nCONTEXTE DU CANDIDAT (CV):\n{candidate_context}\n\nINSTRUCTION: Utilise ce contexte pour poser des questions personnalisées sur l'expérience et les compétences du candidat."
    return base_prompt


class LLMService:
    def __init__(self):
        """Initialize with Google Gemini using settings from config."""
        logger.info("🔄 Initializing LLMService...")
        
        # Get API key from settings
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            logger.warning(
                "⚠️  GEMINI_API_KEY not configured. "
                "LLM features will not work. Add GEMINI_API_KEY to .env"
            )
            self.api_key = None
            self.client_ready = False
            return
        
        logger.info(f"✓ Found GEMINI_API_KEY: {api_key[:10]}...{api_key[-5:]}")
        
        try:
            genai.configure(api_key=api_key)
            self.api_key = api_key
            self.client_ready = True
            # Note: Model will be created per-session with appropriate system prompt
            logger.info("✅ Gemini client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini client: {str(e)}")
            self.client_ready = False
            self.api_key = None
    
    def _create_model(self, interviewer_type: InterviewerType, candidate_context: str = "", job_description: str = ""):
        """Create a Gemini model with the appropriate system prompt."""
        if not self.client_ready:
            raise ValueError("Gemini client not initialized. Please set GEMINI_API_KEY in .env")
        system_prompt = get_system_prompt(interviewer_type, candidate_context, job_description)
        return genai.GenerativeModel(
            'gemini-2.0-flash-lite-preview-02-05',
            system_instruction=system_prompt
        )

    def _create_grading_model(self, interviewer_type: InterviewerType):
        """Create a gemini model to grade the user responses"""
        system_prompt = get_system_prompt(interviewer_type)
        return genai.GenerativeModel(
            'gemini-2.0-flash-lite-preview-02-05',
            system_instruction=system_prompt,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
    
    def get_initial_greeting(
        self, 
        candidate_name: str, 
        interviewer_type: InterviewerType,
        candidate_context: str = "",
        job_description: str = ""
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
        logger.info(f"👋 Generating greeting for {candidate_name} with {interviewer_type} interviewer")
        
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

Présentez-vous. Et soyez synthétique."""
        }
        
        return greetings[interviewer_type]
    
    async def chat(
        self, 
        message: str, 
        conversation_history: List[Dict[str, str]],
        interviewer_type: InterviewerType,
        candidate_context: str = "",
        job_description: str = ""
    ) -> str:
        """
        Send message to Gemini and get interviewer response.
        
        Args:
            message: Candidate's message
            conversation_history: List of previous messages
            interviewer_type: Type of interviewer
            candidate_context: Context from resume
            job_description: Job description context
            
        Returns:
            Interviewer's response text
        """
        logger.info(f"💬 Processing candidate response with {interviewer_type} interviewer")
        
        try:
            # Create model with appropriate personality and context
            model = self._create_model(interviewer_type, candidate_context, job_description)
            
            # Convert conversation history to Gemini format
            history = []
            if conversation_history:
                for msg in conversation_history:
                    role = "model" if msg["role"] == "assistant" else msg["role"]
                    history.append({
                        "role": role,
                        "parts": [msg["content"]]
                    })
            
            # Start chat with history
            chat = model.start_chat(history=history)
            
            # Send message and get response
            response = chat.send_message(message)
            response_text = response.text
            
            logger.info(f"✅ Got {interviewer_type} interviewer response ({len(response_text)} chars)")
            return response_text
            
        except Exception as e:
            logger.error(f"❌ Chat error: {str(e)}")
            raise
    
    async def grade_response(
    self,
    question: str,
    answer: str,
    interviewer_type: InterviewerType
    ) -> Dict[str, any]:
        """
        Grade a candidate's response to an interview question.
        
        Args:
            question: The interview question asked
            answer: The candidate's answer
            interviewer_type: Type of interviewer (affects grading strictness)
            
        Returns:
            Dict with 'grade' (1-10) and 'feedback' (str)
        """
        logger.info(f"📊 Grading response with {interviewer_type} interviewer...")
        
        try:
            # Create grading model with JSON output
            model = self._create_grading_model(interviewer_type)
            
            # Grading prompt with strict JSON schema
            grading_prompt = f"""Tu dois évaluer la réponse d'un candidat à une question d'entretien.

                                QUESTION POSÉE:
                                {question}

                                RÉPONSE DU CANDIDAT:
                                {answer}

                                CONSIGNES D'ÉVALUATION:
                                - Note de 1 à 10 (1 = très mauvais, 10 = excellent)
                                - Feedback concis en français (2-3 phrases maximum)
                                - Évalue: pertinence, clarté, exemples concrets, structure

                                Réponds UNIQUEMENT avec ce format JSON exact:
                                {{
                                "grade": 8,
                                "feedback": "Réponse claire avec un bon exemple. Manque de chiffres précis."
                                }}"""

            # Generate response
            response = model.generate_content(grading_prompt)
            
            # Parse JSON response
            result = json.loads(response.text)
            
            logger.info(f"✅ Response graded: {result['grade']}/10")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"❌ Failed to parse JSON response: {str(e)}")
            logger.error(f"Raw response: {response.text}")
            # Fallback response
            return {
                "grade": 5,
                "feedback": "Erreur lors de l'évaluation de la réponse."
            }
        except Exception as e:
            logger.error(f"❌ Grading error: {str(e)}")
            raise

    async def end_interview(
        self, 
        conversation_history: List[Dict[str, str]],
        interviewer_type: InterviewerType
    ) -> str:
        """
        Generate feedback and analysis for the interview.
        
        Args:
            conversation_history: Full conversation history
            interviewer_type: Type of interviewer
            
        Returns:
            Structured feedback and analysis of the interview performance
        """
        logger.info(f"📝 Generating interview feedback with {interviewer_type} interviewer...")
        
        try:
            model = self._create_model(interviewer_type)
            
            history = []
            for msg in conversation_history:
                role = "model" if msg["role"] == "assistant" else msg["role"]
                history.append({
                    "role": role,
                    "parts": [msg["content"]]
                })
            
            chat = model.start_chat(history=history)
            
            feedback_prompts = {
                "nice": """IMPORTANT: L'entretien est maintenant TERMINÉ. Tu ne poses PLUS de questions.
                
                Ta tâche est de rédiger un FEEDBACK DÉTAILLÉ analysant la performance globale du candidat.
                
                Analyse:
                - Les points forts démontrés durant l'entretien
                - La qualité et la pertinence des réponses données
                - Les exemples concrets fournis
                - Les axes d'amélioration possibles
                
                Adopte un ton encourageant et constructif. Rédige 4-5 phrases en paragraphes.
                Ne pose AUCUNE question. Ne dis pas au revoir. Fournis uniquement l'analyse.""",
                
                "neutral": """IMPORTANT: L'entretien est maintenant TERMINÉ. Tu ne poses PLUS de questions.
                
                Ta tâche est de rédiger un FEEDBACK OBJECTIF analysant la performance du candidat.
                
                Analyse:
                - La structure et la clarté des réponses
                - La pertinence des exemples et expériences mentionnés
                - Les compétences démontrées
                - Les domaines nécessitant un développement
                
                Reste factuel et professionnel. Rédige 4-5 phrases en paragraphes.
                Ne pose AUCUNE question. Ne dis pas au revoir. Fournis uniquement l'analyse.""",
                
                "mean": """IMPORTANT: L'entretien est maintenant TERMINÉ. Tu ne poses PLUS de questions.
                
                Ta tâche est de rédiger un FEEDBACK CRITIQUE analysant la performance du candidat.
                
                Analyse:
                - Les faiblesses identifiées dans les réponses
                - Les manques de préparation ou d'expérience concrète
                - Les réponses vagues ou insuffisantes
                - Les points à améliorer de manière prioritaire
                
                Sois direct et exigeant dans ton évaluation. Rédige 4-5 phrases en paragraphes.
                Ne pose AUCUNE question. Ne dis pas au revoir. Fournis uniquement l'analyse."""
            }
            
            response = chat.send_message(feedback_prompts[interviewer_type])
            feedback = response.text
            
            logger.info("✅ Interview feedback generated")
            return feedback
            
        except Exception as e:
            logger.error(f"❌ Error generating feedback: {str(e)}")
            raise

    async def compute_similarity_ranking(
        self,
        candidate_profile: str,
        jobs: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Rerank jobs using Embeddings and Cosine Similarity (RAG approach).
        """
        logger.info(f"⚖️ Reranking {len(jobs)} jobs using Embeddings...")
        
        if not jobs:
            return []

        try:
            # 1. Embed Candidate Profile
            # We use the text-embedding-004 model for better performance
            profile_embedding_resp = genai.embed_content(
                model="models/text-embedding-004",
                content=candidate_profile,
                task_type="retrieval_query"
            )
            profile_vector = np.array(profile_embedding_resp['embedding'])

            # 2. Embed Jobs (Batching if necessary, but genai handles lists)
            # Construct texts to embed: "Title: ... Description: ..."
            job_texts = []
            for job in jobs:
                title = job.get("intitule", "")
                desc = job.get("description", "")[:1000] # Truncate for safety
                text = f"Title: {title}\nDescription: {desc}"
                job_texts.append(text)

            # Embed all jobs in one go (or batches of 100 if list is huge)
            # API limit check might be needed for production, but fine for <100 jobs
            jobs_embedding_resp = genai.embed_content(
                model="models/text-embedding-004",
                content=job_texts,
                task_type="retrieval_document"
            )
            
            job_vectors = np.array(jobs_embedding_resp['embedding'])

            # 3. Compute Cosine Similarity
            # Cosine Sim = (A . B) / (||A|| * ||B||)
            # Since embeddings are usually normalized, dot product might suffice, 
            # but let's be mathematically correct.
            
            norm_profile = np.linalg.norm(profile_vector)
            
            reranked_jobs = []
            for i, job in enumerate(jobs):
                job_vector = job_vectors[i]
                norm_job = np.linalg.norm(job_vector)
                
                if norm_profile == 0 or norm_job == 0:
                    similarity = 0.0
                else:
                    similarity = np.dot(profile_vector, job_vector) / (norm_profile * norm_job)
                
                # Normalize score to 0-100 for frontend consistency
                score = int(similarity * 100)
                
                job["relevance_score"] = score
                job["relevance_reasoning"] = "Matched via Vector Similarity"
                reranked_jobs.append(job)

            # 4. Sort
            reranked_jobs.sort(key=lambda x: x["relevance_score"], reverse=True)
            
            logger.info("✅ Jobs reranked via Embeddings")
            return reranked_jobs

        except Exception as e:
            logger.error(f"❌ Error in embedding reranking: {str(e)}")
            # Fallback: return original list with 0 score
            for job in jobs:
                job["relevance_score"] = 0
                job["relevance_reasoning"] = "Error in ranking"
            return jobs


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