from typing import Literal

from pydantic import BaseModel, Field


class FranceTravailParams(BaseModel):
    """
    Exact parameters required for the France Travail Job Search API.
    """

    keywords: str = Field(
        ...,
        description="Main keywords extracted from the query (e.g., 'Python', 'Sales').",
    )

    # Location
    location_raw: str | None = Field(
        None, description="The location name if mentioned (e.g. 'Sud', 'Lyon')."
    )
    location_type: Literal["region", "departement", "commune", "unknown"] = Field(
        "unknown", description="Type of the location."
    )

    # Filters - Strict Constraints
    experience_level: Literal["1", "2", "3"] | None = Field(
        None,
        description="Must be '1' for <1 year/Junior, '2' for 1-3 years, '3' for >3 years/Senior.",
    )
    experience_exigence: Literal["D", "S", "E"] | None = Field(
        None,
        description="'D' (Beginner Accepted) if query implies Junior. 'E' (Required) if Senior.",
    )
    contract_type: str | None = Field(
        default=None, description="Code: CDI, CDD, MIS, ALE."
    )
    is_full_time: bool | None = Field(
        default=None, description="True if full-time requested."
    )
