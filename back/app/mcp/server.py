import json
import unicodedata

from fastmcp import FastMCP

from app.services.francetravail_service import francetravail_service
from app.services.location_service import location_service

# Initialize FastMCP server
mcp = FastMCP("JobSearch")


def sanitize_query(text: str) -> str:
    """Remove accents and sanitize a query string."""
    # Normalize to NFD (decomposed form), filter out diacritical marks
    normalized = unicodedata.normalize("NFD", text)
    without_accents = "".join(c for c in normalized if unicodedata.category(c) != "Mn")
    # Strip whitespace and return
    return without_accents.strip()


@mcp.tool()
async def search_jobs(
    query: str,
    location: str | None = None,
    contract_type: str | None = None,
    is_full_time: bool | None = None,
    sort_by: str | None = None,
    experience: str | None = None,
    experience_exigence: str | None = None,
    grand_domaine: str | None = None,
    published_since: int | None = None,
) -> str:
    """
    Search for jobs in France using the France Travail API with advanced filters.

    Args:
        query: Job title, keywords or domain.
        location: City name or code.
        contract_type: Type of contract (e.g. "CDI", "CDD", "MIS", "DDI", "DIN").
        is_full_time: True for full-time only.
        sort_by: "date" or "relevance".
        experience: Experience level required: "0" (not specified), "1" (<1 year), "2" (1-3 years), "3" (>3 years).
        experience_exigence: Experience requirement: "D" (beginner accepted), "S" (experience desired), "E" (experience required).
        grand_domaine: Domain code (e.g. "M18" for IT/Telecom, "D" for Sales, "H" for Industry, "K" for Services, "J" for Health).
        published_since: Filter jobs published within the last X days.
    """
    try:
        # Resolve location code
        location_code = None
        if location:
            # Always try to resolve the location first (handles names AND zip codes -> INSEE)
            cities = await location_service.search_cities(location)
            if cities:
                location_code = cities[0].get("code")

        jobs = await francetravail_service.search_jobs(
            keywords=sanitize_query(query),
            location=location_code,
            contract_type=contract_type,
            is_full_time=is_full_time,
            sort_by=sort_by,
            experience=experience,
            experience_exigence=experience_exigence,
            grand_domaine=grand_domaine,
            published_since=published_since,
        )

        if not jobs:
            return "[]"

        return json.dumps(jobs[:20], default=str)
    except Exception as e:
        print(f"Error searching for jobs: {str(e)}")  # Log effectively
        return "[]"  # Return empty JSON list to avoid parse error
