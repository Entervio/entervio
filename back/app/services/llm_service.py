"""LLM Service using Google Gemini for Interview Scenarios"""
import google.generativeai as genai
from typing import List, Dict
import logging
from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

# Interview system prompt
INTERVIEW_SYSTEM_PROMPT = """Tu es un recruteur professionnel français expérimenté qui mène un entretien d'embauche.

Ton rôle est de :
- Créer une atmosphère chaleureuse et professionnelle
- Poser des questions pertinentes sur les compétences, l'expérience et les motivations du candidat
- Écouter attentivement et poser des questions de suivi basées sur les réponses
- Évaluer la personnalité, les compétences techniques et l'adéquation culturelle
- Adapter tes questions en fonction du profil et des réponses du candidat

Style de communication :
- Professionnel mais chaleureux
- Questions ouvertes pour encourager le dialogue
- Montrer de l'intérêt genuine pour les réponses
- Donner des transitions naturelles entre les sujets
- Utiliser un français naturel et conversationnel

Structure de l'entretien :
1. Accueil et mise en confiance
2. Présentation du candidat (parcours, expérience)
3. Compétences techniques et expériences spécifiques
4. Motivations et aspirations professionnelles
5. Questions du candidat

Reste naturel et adaptatif. Ne suis pas rigidement une structure - laisse la conversation évoluer naturellement."""

INITIAL_GREETING = """Bonjour et bienvenue ! Je suis ravi de vous rencontrer aujourd'hui. 

Je serai votre interlocuteur pour cet entretien. Mon objectif est de mieux vous connaître, de comprendre votre parcours, vos compétences et vos motivations. 

N'hésitez pas à être vous-même et à vous mettre à l'aise. Il n'y a pas de mauvaises réponses - je suis simplement ici pour avoir une conversation authentique avec vous.

Pour commencer, pourriez-vous vous présenter ? Parlez-moi un peu de vous, de votre parcours et de ce qui vous amène ici aujourd'hui."""


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
            self.model = genai.GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=INTERVIEW_SYSTEM_PROMPT
            )
            logger.info("✅ Gemini client initialized successfully with interview prompt!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini client: {str(e)}")
            raise
    
    async def start_interview(self) -> str:
        """
        Get the initial interview greeting.
        
        Returns:
            Initial greeting message
        """
        logger.info("👋 Starting new interview session")
        return INITIAL_GREETING
    
    async def chat(
        self, 
        message: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Send message to Gemini and get interviewer response.
        
        Args:
            message: Candidate's message
            conversation_history: List of previous messages in format:
                                 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
            
        Returns:
            Interviewer's response text
        """
        logger.info(f"💬 Processing candidate response: '{message[:100]}...'")
        
        try:
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
            chat = self.model.start_chat(history=history)
            
            # Send message and get response
            response = chat.send_message(message)
            response_text = response.text
            
            logger.info(f"✅ Got interviewer response ({len(response_text)} chars)")
            return response_text
            
        except Exception as e:
            logger.error(f"❌ Chat error: {str(e)}")
            raise
    
    async def end_interview(
        self, 
        conversation_history: List[Dict[str, str]]
    ) -> str:
        """
        Generate a summary and closing message for the interview.
        
        Args:
            conversation_history: Full conversation history
            
        Returns:
            Closing message with brief summary
        """
        logger.info("📝 Generating interview summary...")
        
        try:
            # Convert conversation history
            history = []
            for msg in conversation_history:
                role = "model" if msg["role"] == "assistant" else msg["role"]
                history.append({
                    "role": role,
                    "parts": [msg["content"]]
                })
            
            chat = self.model.start_chat(history=history)
            
            closing_prompt = """L'entretien touche à sa fin. Fais un bref résumé positif de l'échange, 
            remercie le candidat pour son temps et indique que l'équipe reviendra vers lui prochainement. 
            Garde un ton professionnel et encourageant. Maximum 3-4 phrases."""
            
            response = chat.send_message(closing_prompt)
            summary = response.text
            
            logger.info("✅ Interview summary generated")
            return summary
            
        except Exception as e:
            logger.error(f"❌ Error generating summary: {str(e)}")
            # Fallback message
            return """Merci beaucoup pour cet échange enrichissant. J'ai apprécié notre conversation 
            et apprendre davantage sur votre parcours. L'équipe reviendra vers vous très prochainement. 
            Je vous souhaite une excellente journée !"""


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