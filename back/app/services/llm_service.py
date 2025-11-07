"""LLM Service using Google Gemini"""
import google.generativeai as genai
from typing import List, Dict
import logging
from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)

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
            self.model = genai.GenerativeModel('gemini-2.0-flash-lite')
            logger.info("✅ Gemini client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Gemini client: {str(e)}")
            raise
    
    async def chat(
        self, 
        message: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Send message to Gemini and get response.
        
        Args:
            message: User's message
            conversation_history: List of previous messages in format:
                                 [{"role": "user", "content": "..."}, {"role": "model", "content": "..."}]
            
        Returns:
            Gemini's response text
        """
        logger.info(f"💬 Sending message to Gemini: '{message[:100]}...'")
        
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
            
            logger.info(f"✅ Got response from Gemini ({len(response_text)} chars)")
            return response_text
            
        except Exception as e:
            logger.error(f"❌ Chat error: {str(e)}")
            raise

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