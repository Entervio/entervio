from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.candidate import Candidate
from app.services.resume_service import resume_service_instance
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a resume (PDF), parse it, and create a candidate profile.
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported")
    
    try:
        # Read file content
        file_content = await file.read()
        
        # Parse resume using existing service
        # Note: extract_text_from_stream expects a file-like object
        import io
        file_stream = io.BytesIO(file_content)
        
        raw_text = resume_service_instance.extract_text_from_stream(file_stream)
        if not raw_text:
             raise HTTPException(status_code=400, detail="Could not extract text from PDF")
             
        parsed_data = resume_service_instance.extract_data_with_llm(raw_text)
        
        if "error" in parsed_data:
             raise HTTPException(status_code=500, detail=parsed_data["error"])
        
        # Create candidate
        contact_info = parsed_data.get("contact_info", {})
        
        candidate = Candidate(
            name=contact_info.get("name"),
            email=contact_info.get("email"),
            phone=contact_info.get("phone"),
            skills=parsed_data.get("skills"),
            experience=parsed_data.get("work_experience"),
            raw_resume_text=raw_text,
            parsed_data=parsed_data
        )
        
        db.add(candidate)
        db.commit()
        db.refresh(candidate)
        
        return {
            "message": "Resume uploaded and parsed successfully",
            "candidate_id": candidate.id,
            "name": candidate.name,
            "skills": candidate.skills
        }
        
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
