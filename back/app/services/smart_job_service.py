import logging
from typing import Any

from app.mcp.server import search_jobs
from app.models.user import User
from app.services.llm_service import llm_service
from app.services.ranking_service import ranking_service

logger = logging.getLogger(__name__)


class SmartJobService:
    def __init__(self):
        pass

    def _build_profile_summary(self, user: User) -> str:
        """Builds a profile summary from relational user data."""
        parts = []

        # Skills
        tech_skills = [s.name for s in user.skills_list if s.category == "technical"]
        if tech_skills:
            parts.append(f"Technical Skills: {', '.join(tech_skills[:10])}")

        # Experience
        if user.work_experiences:
            exp_summary = []
            for w in user.work_experiences[:3]:
                exp_summary.append(f"{w.role} at {w.company}")
            parts.append(f"Experience: {'; '.join(exp_summary)}")

        # Projects
        if user.projects:
            proj_summary = [p.name for p in user.projects[:3]]
            parts.append(f"Projects: {', '.join(proj_summary)}")

        return "\n".join(parts) if parts else "No profile data available."

    async def smart_search(
        self, user: User, query: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Performs a smart job search for the user.

        1. Extracts keywords from user's relational resume data OR from manual query.
        2. Searches France Travail API for each keyword in parallel.
        3. Aggregates and deduplicates results.
        4. Reranks results using LLM based on user profile.
        """
        logger.info(f"🧠 Starting smart search for user {user.id}")

        # 1. Build context
        profile_summary = self._build_profile_summary(user)

        # 3. Use LLM with Tools
        tools = [search_jobs.fn]

        found_jobs = await llm_service.search_with_tools(
            query or "Find jobs matching my profile", profile_summary, tools
        )

        if not found_jobs:
            logger.warning("⚠️ No jobs found via MCP search.")
            return []

        # 5. Rerank
        reranked_jobs = await ranking_service.compute_similarity_ranking(
            profile_summary, found_jobs, query=query
        )

        return reranked_jobs

    def _get_search_keywords(self, user: User) -> list[str]:
        """Extracts top keywords from user's relational data."""
        keywords = []

        # Use top technical skills
        tech_skills = [s.name for s in user.skills_list if s.category == "technical"]
        if tech_skills:
            keywords.extend(tech_skills[:3])

        # Fallback: Use last job title
        if not keywords and user.work_experiences:
            last_role = user.work_experiences[0].role
            if last_role:
                keywords.append(last_role)

        return keywords


smart_job_service = SmartJobService()
