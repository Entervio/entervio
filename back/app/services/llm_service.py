"""LLM Service using Anthropic Claude - Using Pydantic Settings"""
from anthropic import Anthropic
from typing import List, Dict
import logging

from app.core.config import settings

# Setup logging
logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self):
        """Initialize with Anthropic Claude using settings from config."""
        logger.info("🔄 Initializing LLMService...")
        
        # Get API key from settings
        api_key = settings.ANTHROPIC_API_KEY
        
        if not api_key:
            error_msg = (
                "❌ ANTHROPIC_API_KEY not found! "
                "Please add it to your .env file: ANTHROPIC_API_KEY=sk-ant-..."
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        logger.info(f"✓ Found ANTHROPIC_API_KEY: {api_key[:10]}...{api_key[-5:]}")
        
        try:
            self.client = Anthropic(api_key=api_key)
            self.model = "claude-3-5-sonnet-20241022"
            logger.info("✅ Anthropic client initialized successfully!")
        except Exception as e:
            logger.error(f"❌ Failed to initialize Anthropic client: {str(e)}")
            raise
    
    async def chat(
        self, 
        message: str, 
        conversation_history: List[Dict[str, str]] = None
    ) -> str:
        """
        Send message to Claude and get response.
        
        Args:
            message: User's message
            conversation_history: List of previous messages in format:
                                 [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
            
        Returns:
            Claude's response text
        """
        logger.info(f"💬 Sending message to Claude: '{message[:100]}...'")
        
        if conversation_history is None:
            conversation_history = []
        
        # Add the new message to history
        messages = conversation_history + [{"role": "user", "content": message}]
        
        try:
            response = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=messages
            )
            
            response_text = response.content[0].text
            logger.info(f"✅ Got response from Claude ({len(response_text)} chars)")
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