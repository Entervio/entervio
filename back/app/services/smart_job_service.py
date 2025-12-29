import logging
from typing import Any

from app.models.user import User
from app.services.dspy_job_service import dspy_job_service
from app.services.francetravail_service import francetravail_service
from app.services.location_service import location_service
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

    async def _resolve_location(self, raw: str, type_hint: str) -> dict[str, str]:
        """
        Resolves a raw location string to an API parameter dict.
        Returns e.g. {'region': '76'} or {'departement': '33'} or {'location': '69123'}.
        """
        # 1. Try Region
        if type_hint == "region" or type_hint == "unknown":
            regions = await location_service.search_regions(raw)
            if regions:
                logger.info(
                    f"📍 Resolved '{raw}' to Region: {regions[0]['nom']} ({regions[0]['code']})"
                )
                return {"region": regions[0]["code"]}

        # 2. Try Department
        if type_hint == "departement" or type_hint == "unknown":
            depts = await location_service.search_departments(raw)
            if depts:
                logger.info(
                    f"📍 Resolved '{raw}' to Department: {depts[0]['nom']} ({depts[0]['code']})"
                )
                return {"departement": depts[0]["code"]}

        # 3. Try City (Commune)
        if type_hint == "commune" or type_hint == "unknown":
            cities = await location_service.search_cities(raw)
            if cities:
                logger.info(
                    f"📍 Resolved '{raw}' to City: {cities[0]['nom']} ({cities[0]['code']})"
                )
                return {"location": cities[0]["code"]}

        logger.warning(f"⚠️ Could not resolve location '{raw}' (Hint: {type_hint})")
        return {}

    async def smart_search(
        self, user: User, query: str | None = None
    ) -> list[dict[str, Any]]:
        """
        Performs a smart job search using DSPy for reasoning + Deterministic Resolution.
        """
        logger.info(f" Starting smart search for user {user.id}")

        # 1. Build context
        profile_summary = self._build_profile_summary(user)
        user_query = query or "Find jobs matching my profile"

        # 2. DSPy Reasoning (Extract Intent)
        # Note: DSPy is synchronous usually, but we can run it in a thread if needed.
        # For now, running directly is fine if latency < 2s.
        try:
            params = dspy_job_service.predict_params(user_query, profile_summary)
        except Exception as e:
            logger.error(f"❌ DSPy failed: {e}")
            return []

        # 3. Resolve Location (Deterministic)
        ft_location_params = {}
        if params.location_raw:
            ft_location_params = await self._resolve_location(
                params.location_raw, params.location_type
            )

        # 4. Execute Search (API)
        try:
            found_jobs = await francetravail_service.search_jobs(
                keywords=params.keywords,
                experience=params.experience_level,
                experience_exigence=params.experience_exigence,
                contract_type=params.contract_type,
                is_full_time=params.is_full_time,
                **ft_location_params,
            )

            logger.info(f"✅ Found {len(found_jobs)} jobs via DSPy flow.")

            if not found_jobs:
                logger.warning("⚠️ No jobs found.")
                return []

            # 5. Rerank
            reranked_jobs = await ranking_service.compute_similarity_ranking(
                profile_summary, found_jobs, query=query
            )

            # 6. Mark applied jobs
            applied_job_ids = {app.job_id for app in user.applications}
            for job in reranked_jobs:
                job["is_applied"] = job.get("id") in applied_job_ids

            return reranked_jobs

        except Exception as e:
            logger.error(f"❌ Error in API execution: {e}")
            return []


# Singleton instance
_smart_job_instance = None


def get_smart_job_service() -> SmartJobService:
    global _smart_job_instance
    if _smart_job_instance is None:
        logger.info("🚀 Creating job_service singleton...")
        _smart_job_instance = SmartJobService()
        logger.info("✅ resume_service singleton created!")
    return _smart_job_instance


smart_job_service = get_smart_job_service()
