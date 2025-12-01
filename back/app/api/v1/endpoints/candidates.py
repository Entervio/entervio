from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.services.resume_service import resume_service_instance
from app.core.auth import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user),
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
        
        supabase_id = current_user.get("sub")
        if not supabase_id:
            raise HTTPException(status_code=401, detail="Invalid Supabase token: missing subject")

        user = db.query(User).filter(User.supabase_id == supabase_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found for Supabase ID")

        user.skills = parsed_data.get("skills")
        user.experience = parsed_data.get("work_experience")
        user.raw_resume_text = raw_text
        user.parsed_data = parsed_data

        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Resume uploaded and parsed successfully",
            "candidate_id": user.id,
            "name": user.name,
            "skills": user.skills
        }
        
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
