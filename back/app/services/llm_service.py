"""LLM Service using Google Gemini for Interview Scenarios"""
import google.generativeai as genai
from typing import List, Dict, Literal
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

def get_system_prompt(interviewer_type: InterviewerType) -> str:
    """Get the complete system prompt for the given interviewer type."""
    return f"{BASE_INTERVIEW_INSTRUCTIONS}\n\n{INTERVIEWER_PROMPTS[interviewer_type]}"


class LLMService:
    def __init__(self):
        """Initialize with Google Gemini using settings from config."""
        logger.info("🔄 Initializing LLMService...")
        
        # Get API key from settings
        api_key = settings.GEMINI_API_KEY
        
        if not api_key:
            error_msg = (
                "❌ GEMINI_API_KEY not found! "
                "Please add it to your .env file: GEMINI_API_KEY=..."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"✓ Found GEMINI_API_KEY: {api_key[:10]}...{api_key[-5:]}")
        
        try:
            genai.configure(api_key=api_key)
            # Note: Model will be created per-session with appropriate system prompt
            logger.info("✅ Gemini client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini client: {str(e)}")
            raise
    
    def _create_model(self, interviewer_type: InterviewerType):
        """Create a Gemini model with the appropriate system prompt."""
        system_prompt = get_system_prompt(interviewer_type)
        return genai.GenerativeModel(
            'gemini-2.5-flash-lite',
            system_instruction=system_prompt
        )

    def _create_grading_model(self, interviewer_type: InterviewerType):
        """Create a gemini model to grade the user responses"""
        system_prompt = get_system_prompt(interviewer_type)
        return genai.GenerativeModel(
            'gemini-2.5-flash-lite',
            system_instruction=system_prompt,
            generation_config={
                "response_mime_type": "application/json"
            }
        )
    
    def get_initial_greeting(
        self, 
        candidate_name: str, 
        interviewer_type: InterviewerType
    ) -> str:
        """
        Generate personalized initial greeting based on interviewer type.
        
        Args:
            candidate_name: The candidate's name
            interviewer_type: Type of interviewer (nice, neutral, mean)
            
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
        interviewer_type: InterviewerType
    ) -> str:
        """
        Send message to Gemini and get interviewer response.
        
        Args:
            message: Candidate's message
            conversation_history: List of previous messages
            interviewer_type: Type of interviewer
            
        Returns:
            Interviewer's response text
        """
        logger.info(f"💬 Processing candidate response with {interviewer_type} interviewer")
        
        try:
            # Create model with appropriate personality
            model = self._create_model(interviewer_type)
            
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
        Generate a summary and closing message for the interview.
        
        Args:
            conversation_history: Full conversation history
            interviewer_type: Type of interviewer
            
        Returns:
            Closing message with brief summary
        """
        logger.info(f"📝 Generating interview summary with {interviewer_type} interviewer...")
        
        try:
            # Create model with appropriate personality
            model = self._create_model(interviewer_type)
            
            # Convert conversation history
            history = []
            for msg in conversation_history:
                role = "model" if msg["role"] == "assistant" else msg["role"]
                history.append({
                    "role": role,
                    "parts": [msg["content"]]
                })
            
            chat = model.start_chat(history=history)
            
            # Personality-specific closing prompts
            closing_prompts = {
                "nice": """L'entretien touche à sa fin. Fais un bref résumé très positif (2-3 phrases), 
                remercie chaleureusement le candidat et souhaite-lui bonne chance pour la suite.""",
                
                "neutral": """L'entretien est terminé. Fais un résumé factuel en 2-3 phrases, 
                remercie le candidat professionnellement et indique que l'équipe reviendra vers lui.""",
                
                "mean": """L'entretien est fini. Fais un résumé critique mais constructif en 2-3 phrases, 
                mentionne ce qui pourrait être amélioré, remercie brièvement."""
            }
            
            response = chat.send_message(closing_prompts[interviewer_type])
            summary = response.text
            
            logger.info("✅ Interview summary generated")
            return summary
            
        except Exception as e:
            logger.error(f"❌ Error generating summary: {str(e)}")
            # Fallback messages by type
            fallbacks = {
                "nice": """Merci infiniment pour cet échange ! J'ai vraiment apprécié votre sincérité 
                et votre enthousiasme. L'équipe reviendra très vite vers vous. Excellente journée !""",
                
                "neutral": """Merci pour cet entretien. L'équipe reviendra vers vous prochainement. 
                Bonne journée.""",
                
                "mean": """Bien. On a fait le tour. L'équipe vous contactera si votre profil nous intéresse. 
                Au revoir."""
            }
            return fallbacks[interviewer_type]


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