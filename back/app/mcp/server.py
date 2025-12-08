import json

from fastmcp import FastMCP

from app.services.francetravail_service import francetravail_service
from app.services.location_service import location_service

# Initialize FastMCP server
mcp = FastMCP("JobSearch")


@mcp.tool()
async def search_jobs(
    query: str,
    location: str | None = None,
    contract_type: str | None = None,
    is_full_time: bool | None = None,
    sort_by: str | None = None,
) -> str:
    """
    Search for jobs in France using the France Travail API with advanced filters.

    Args:
        query: Job title, keywords or domain.
        location: City name or code.
        contract_type: Type of contract (e.g. "CDI", "CDD", "MIS", "DDI", "DIN").
        is_full_time: True for full-time only.
        sort_by: "date" or "relevance".
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
            keywords=query,
            location=location_code,
            contract_type=contract_type,
            is_full_time=is_full_time,
            sort_by=sort_by,
        )

        if not jobs:
            return "[]"

        return json.dumps(jobs[:20], default=str)
    except Exception as e:
        print(f"Error searching for jobs: {str(e)}")  # Log effectively
        return "[]"  # Return empty JSON list to avoid parse error
