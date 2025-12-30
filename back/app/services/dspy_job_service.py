import logging

import dspy

from app.core.config import settings
from app.models.france_travail_params import FranceTravailParams

logger = logging.getLogger(__name__)


# --- Define DSPy Signature ---
class JobSearchSignature(dspy.Signature):
    """
    Translate a user's natural language job search query into a PLAN of multiple search variations.
    CRITICAL: Split complex queries into separate, focused variations.
      - BAD: {'keywords': 'Java, Python, React'}
      - GOOD: [{'keywords': 'Java'}, {'keywords': 'Python'}, {'keywords': 'React'}]
    Generate 2-3 focused variations to maximize recall.
    """

    user_query: str = dspy.InputField(desc="The user's raw search request.")
    user_profile: str = dspy.InputField(
        desc="Summary of the user's skills and experience."
    )

    variations: list[FranceTravailParams] = dspy.OutputField(
        desc="List of 2-3 focused search variations."
    )


# --- 3. Service Class ---
class DSPyJobService:
    def __init__(self):
        # Configure DSPy with Groq via OpenAI compatibility
        # using dspy.LM (new syntax in 2.5+)
        self.lm = dspy.LM(
            model="openai/llama-3.3-70b-versatile",
            api_key=settings.GROQ_API_KEY,
            api_base="https://api.groq.com/openai/v1",
            temperature=0,
        )

        dspy.configure(lm=self.lm)

        # Create the Predictor (ChainOfThought for reasoning)
        self.predictor = dspy.ChainOfThought(JobSearchSignature)

    def predict_params(self, query: str, profile: str) -> list[FranceTravailParams]:
        """
        Run the DSPy module to get a list of search variations.
        """
        logger.info(f"🧠 [DSPy] Analyzing query: '{query}'")

        try:
            # DSPy call
            result = self.predictor(user_query=query, user_profile=profile)

            # The result.variations should be the list of objects
            variations = result.variations

            logger.info(f"✅ [DSPy] Generated {len(variations)} variations.")
            logger.info(f"✅ [DSPy] Reasoning: {getattr(result, 'rationale', 'N/A')}")

            return variations

        except Exception as e:
            logger.error(f"❌ [DSPy] Error: {e}")
            # Fallback safe params
            return [
                FranceTravailParams(
                    keywords=query,
                    location_raw=None,
                    location_type="unknown",
                    experience_level=None,
                    experience_exigence=None,
                    contract_type=None,
                    is_full_time=None,
                )
            ]


dspy_job_service = DSPyJobService()
