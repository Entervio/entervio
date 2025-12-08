from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    job_description: str


class AnalysisResponse(BaseModel):
    match_score: float
    total_keywords: int
    found_keywords: list[str]
    missing_keywords: list[str]
    ats_score: int
    ats_issues: list[str]
    ats_recommendations: list[str]
    strategic_critique: list[str]
