"""LLM Service using Groq for Interview Scenarios"""

import json
import logging
from typing import Any, Literal

from groq import Groq
from pydantic import BaseModel, field_validator

from app.core.config import settings
from app.core.prompt_manager import prompt_manager
from app.mcp.server import search_jobs
from app.models.interview import InterviewerStyle


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


def get_system_prompt(
    interviewer_type: InterviewerStyle,
    candidate_context: str = "",
    job_description: str = "",
) -> str:
    """Get the complete system prompt for the given interviewer type."""

    # 1. Base instructions
    base_instructions = prompt_manager.get("interview.base_instructions")

    # 2. Personality
    personality_prompt = prompt_manager.get(
        f"interview.personalities.{interviewer_type}"
    )

    prompt = f"{base_instructions}\n\n{personality_prompt}"

    if job_description:
        prompt += "\n\n" + prompt_manager.format_prompt(
            "interview.job_context", job_description=job_description
        )

    if candidate_context:
        prompt += "\n\n" + prompt_manager.format_prompt(
            "interview.candidate_context", candidate_context=candidate_context
        )

    return prompt


class LLMService:
    def __init__(self):
        """Initialize with Groq using settings from config."""
        logger.info("Initializing LLMService...")

        # Get API keys
        groq_api_key = settings.GROQ_API_KEY

        # Initialize Groq
        self.groq_client = None
        if groq_api_key:
            try:
                self.groq_client = Groq(api_key=groq_api_key)
                logger.info("Groq client initialized successfully!")
            except Exception as e:
                logger.error(f"Failed to initialize Groq client: {str(e)}")
        else:
            logger.warning("GROQ_API_KEY not configured. LLM features will not work.")

    def get_initial_greeting(
        self,
        candidate_name: str,
        interviewer_type: InterviewerStyle,
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
            f"Generating greeting for {candidate_name} with {interviewer_type} interviewer"
        )

        return prompt_manager.format_prompt(
            f"interview.greetings.{interviewer_type.value}",
            candidate_name=candidate_name,
        )

    async def chat(
        self,
        message: str,
        conversation_history: list[dict[str, str]],
        interviewer_type: InterviewerStyle,
        candidate_context: str = "",
        job_description: str = "",
    ) -> str:
        """
        Send message to Groq and get interviewer response.
        """
        logger.info(
            f"Processing candidate response with {interviewer_type} interviewer"
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
                f"Got {interviewer_type} interviewer response ({len(response_text)} chars)"
            )
            return response_text

        except Exception as e:
            logger.error(f"Chat error: {str(e)}")
            raise

    async def grade_response(
        self, question: str, answer: str, interviewer_type: InterviewerStyle
    ) -> dict[str, any]:
        """
        Grade a candidate's response to an interview question.
        """
        logger.info(f"Grading response with {interviewer_type} interviewer...")

        if not self.groq_client:
            return {"grade": 5, "feedback": "Service non disponible"}

        try:
            system_prompt = get_system_prompt(interviewer_type)

            grading_prompt = prompt_manager.format_prompt(
                "interview.grading", question=question, answer=answer
            )

            grading_system = system_prompt + prompt_manager.get(
                "interview.grading_system_suffix"
            )

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": grading_system,
                    },
                    {"role": "user", "content": grading_prompt},
                ],
                response_format={"type": "json_object"},
            )

            result = json.loads(completion.choices[0].message.content)
            logger.info(f"Response graded: {result.get('grade')}/10")
            return result

        except Exception as e:
            logger.error(f"Grading error: {str(e)}")
            return {"grade": 5, "feedback": "Erreur lors de l'évaluation."}

    async def end_interview(
        self,
        conversation_history: list[dict[str, str]],
        interviewer_type: InterviewerStyle,
    ) -> dict[str, Any]:
        """
        Generate structured feedback using Groq.
        """
        logger.info(
            f"Generating structured interview feedback with {interviewer_type} interviewer..."
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

            prompt = prompt_manager.format_prompt(
                "interview.feedback", interviewer_type=interviewer_type
            )

            messages.append({"role": "user", "content": prompt})

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=messages,
                response_format={"type": "json_object"},
            )

            feedback_data = json.loads(completion.choices[0].message.content)
            logger.info("Structured interview feedback generated")
            return feedback_data

        except Exception as e:
            logger.error(f"Error generating feedback: {str(e)}")
            return {
                "score": 5,
                "strengths": ["Participation"],
                "weaknesses": ["Erreur generation"],
                "tips": [],
                "overall_comment": "Erreur technique.",
            }

    async def generate_example_response(
        self,
        question: str,
        candidate_context: str = "",
        job_description: str = "",
    ) -> str:
        """
        Generate an example response for an interview question.

        Args:
            question: The interview question
            candidate_context: Context from resume
            job_description: Job description context

        Returns:
            Example response text
        """
        logger.info(f"Generating example response for question: {question[:50]}...")

        if not self.groq_client:
            raise ValueError("Groq client not initialized")

        try:
            prompt = prompt_manager.format_prompt(
                "interview.example_response",
                question=question,
                candidate_context=candidate_context or "Aucun contexte disponible",
                job_description=job_description or "Non spécifié",
            )

            completion = self.groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "Tu es un expert en entretien d'embauche qui génère des réponses exemple professionnelles.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=512,
            )

            example_response = completion.choices[0].message.content.strip()
            logger.info(f"Generated example response ({len(example_response)} chars)")
            return example_response

        except Exception as e:
            logger.error(f"Error generating example response: {str(e)}")
            raise

    async def search_with_tools(
        self, user_query: str, user_context: str, tools: list[Any]
    ) -> list[dict]:
        """
        Perform a search using Groq tool calling (OpenAI compatible).
        """
        logger.info(f"Starting search with tools (Groq) for query: '{user_query}'")

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

            system_content = prompt_manager.format_prompt(
                "search.tool_orchestration", user_context=user_context
            )

            messages = [
                {
                    "role": "system",
                    "content": system_content,
                },
                {"role": "user", "content": user_query},
            ]

            logger.info(f"Groq decided to call {messages}")

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
                logger.info(f"Groq decided to call {len(tool_calls)} tools")

                # Execute tool calls
                for tool_call in tool_calls:
                    function_name = tool_call.function.name
                    if function_name == "search_jobs":
                        try:
                            raw_args = json.loads(tool_call.function.arguments)
                            validated_args = SearchJobsArgs.model_validate(raw_args)
                            logger.info(
                                f"Calling search_jobs with validated args: {validated_args.model_dump(exclude_none=True)}"
                            )
                        except json.JSONDecodeError as e:
                            logger.error(
                                f"Failed to parse tool call arguments as JSON: {e}"
                            )
                            continue
                        except Exception as e:
                            logger.error(
                                f"Pydantic validation failed for search_jobs args: {e}"
                            )
                            continue
                        try:
                            raw_args = json.loads(tool_call.function.arguments)
                            validated_args = SearchJobsArgs.model_validate(raw_args)
                            logger.info(
                                f"Calling search_jobs with validated args: {validated_args.model_dump(exclude_none=True)}"
                            )
                        except json.JSONDecodeError as e:
                            logger.error(
                                f"Failed to parse tool call arguments as JSON: {e}"
                            )
                            continue
                        except Exception as e:
                            logger.error(
                                f"Pydantic validation failed for search_jobs args: {e}"
                            )
                            continue

                        # Call the imported function with validated args
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
                                f"Failed to parse jobs JSON from tool: {e}. Content: {jobs_json[:200]}..."
                            )
            unique_jobs = list(
                {job["id"]: job for job in all_found_jobs if job.get("id")}.values()
            )
            unique_jobs = list(
                {job["id"]: job for job in all_found_jobs if job.get("id")}.values()
            )

            logger.info(f"Extracted {len(unique_jobs)} unique jobs from tool execution")
            return unique_jobs
            logger.info(f"Extracted {len(unique_jobs)} unique jobs from tool execution")
            return unique_jobs

        except Exception as e:
            logger.error(f"Error in search_with_tools (Groq): {str(e)}")
            return []


# Singleton instance - initialized on first import
_llm_service_instance = None


def get_llm_service() -> LLMService:
    """Get or create the LLM service singleton."""
    global _llm_service_instance
    if _llm_service_instance is None:
        logger.info("Creating llm_service singleton...")
        _llm_service_instance = LLMService()
        logger.info("llm_service singleton created!")
    return _llm_service_instance


# For convenience
llm_service = get_llm_service()
