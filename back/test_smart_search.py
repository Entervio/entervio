import asyncio
import sys
import os
from unittest.mock import MagicMock

# Add current directory to path so we can import app
sys.path.append(os.getcwd())

from app.models.user import User
from app.services.smart_job_service import smart_job_service
from app.services.francetravail_service import francetravail_service

# Mock France Travail Service
async def mock_search_jobs(keywords, location=None):
    print(f"    [Mock] Searching for '{keywords}'...")
    # Return some dummy jobs
    return [
        {
            "id": f"job_{keywords}_1",
            "intitule": f"Senior {keywords} Developer",
            "description": f"We are looking for an expert in {keywords}. Great pay.",
            "entreprise": {"nom": "Tech Corp"}
        },
        {
            "id": f"job_{keywords}_2",
            "intitule": f"Junior {keywords} Dev",
            "description": f"Entry level {keywords} position.",
            "entreprise": {"nom": "Startup Inc"}
        }
    ]

francetravail_service.search_jobs = mock_search_jobs

async def main():
    print("--- Starting Smart Search Verification ---")
    
    # Create a dummy user
    user = User(
        id=1,
        name="Test User",
        email="test@example.com",
        parsed_data={
            "search_keywords": [
                {"keywords": "Python", "type": "skill"},
                {"keywords": "React", "type": "skill"}
            ],
            "skills": {
                "technical": ["Python", "React", "FastAPI"],
                "soft": ["Communication"]
            },
            "work_experience": [
                {
                    "company": "Old Corp",
                    "role": "Python Developer",
                    "responsibilities": ["Built backend APIs"]
                }
            ],
            "summary": "Experienced Full Stack Developer specializing in Python and React."
        }
    )
    
    print(f"User: {user.name}")
    print(f"Keywords in profile: Python, React")
    
    # Run smart search
    results = await smart_job_service.smart_search(user)
    
    print("\n--- Results ---")
    for job in results:
        print(f"[{job.get('relevance_score')}] {job.get('intitule')} - {job.get('relevance_reasoning')}")

if __name__ == "__main__":
    asyncio.run(main())
