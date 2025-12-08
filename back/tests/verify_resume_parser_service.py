import sys
from unittest.mock import MagicMock, AsyncMock

# Mock broken/missing dependencies to allow import
sys.modules["fastmcp"] = MagicMock()
sys.modules["app.mcp.server"] = MagicMock()
# llm_service imports mcp.server, so we might need to mock it or let the above handling work.
# If llm_service fails to import due to other reasons, we might need to mock it too 
# but ResumeParserService uses it, so we should be careful. 
# Ideally, ResumeParserService imports it at top level.
# Let's rely on mocking fastmcp for now.

import asyncio
import pytest
from app.services.resume_service import ResumeParserService
from app.models.resume_models import WorkExperience, Education
from app.models.user import User

@pytest.mark.asyncio
async def test_process_and_save_resume_defaults():
    # Setup
    service = ResumeParserService()
    
    # Mock dependencies
    service.extract_text_from_stream = MagicMock(return_value="Valid PDF text")
    service.extract_data_with_llm = AsyncMock(return_value={
        "contact_info": {"name": "Test User", "email": "test@test.com", "phone": "123"},
        "work_experience": [{}], # Empty dict to trigger defaults
        "education": [{}],
        "projects": [{}],
        "languages": [{}],
        "skills": {"technical": ["Python"], "soft": ["Communication"]}
    })
    
    mock_db = MagicMock()
    mock_user = MagicMock(spec=User)
    mock_user.id = 1
    mock_user.name = "Old Name"
    mock_user.skills_list = []
    
    mock_file = AsyncMock()
    mock_file.filename = "resume.pdf"
    mock_file.read = AsyncMock(return_value=b"fake pdf content")

    # Execution path
    # We test `upload_resume` which we know exists now
    # Note: upload_resume is an INSTANCE method but user code defined it inside class.
    # We need to make sure we are calling it correctly. 
    # Since we patched the class method in source code, we can call it on instance.
    
    result = await service.upload_resume(mock_file, mock_db, mock_user)
    
    # Verification
    assert result["message"] == "Resume uploaded and parsed successfully"
    
    # Verify defaults were used
    # Check what was added to DB
    # We expect WorkExperience with company="Unknown Company"
    
    added_objects = [call[0][0] for call in mock_db.add.call_args_list]
    
    work_exps = [obj for obj in added_objects if isinstance(obj, WorkExperience)]
    assert len(work_exps) == 1
    assert work_exps[0].company == "Unknown Company"
    assert work_exps[0].role == "Unknown Role"
    
    educations = [obj for obj in added_objects if isinstance(obj, Education)]
    assert len(educations) == 1
    assert educations[0].institution == "Unknown Institution"
    
    print("Test Passed: Defaults applied correctly.")

if __name__ == "__main__":
    # Minimal runner
    loop = asyncio.get_event_loop()
    loop.run_until_complete(test_process_and_save_resume_defaults())
