from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.services.resume_service import resume_service_instance
from app.core.auth import get_current_db_user
from app.models.resume_models import WorkExperience, Education, Project, Language, Skill

import io
import logging
router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/upload_resume")
async def upload_resume(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_db_user),
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
        file_stream = io.BytesIO(file_content)
        
        raw_text = resume_service_instance.extract_text_from_stream(file_stream)
        if not raw_text:
             raise HTTPException(status_code=400, detail="Could not extract text from PDF")
             
        parsed_data = await resume_service_instance.extract_data_with_llm(raw_text)
        
        if "error" in parsed_data:
             raise HTTPException(status_code=500, detail=parsed_data["error"])

        # Populate Work Experience
        for exp in parsed_data.get("work_experience", []):
            db.add(WorkExperience(
                user_id=user.id,
                company=exp.get("company"),
                role=exp.get("role"),
                location=exp.get("location"),
                start_date=exp.get("start_date"),
                end_date=exp.get("end_date"),
                description=exp.get("description", "")
            ))
            
        # Populate Education
        for edu in parsed_data.get("education", []):
            db.add(Education(
                user_id=user.id,
                institution=edu.get("institution"),
                degree=edu.get("degree"),
                field_of_study=edu.get("field_of_study"),
                start_date=edu.get("start_date"),
                end_date=edu.get("end_date"),
                graduation_date=edu.get("graduation_date")
            ))
            
        # Populate Projects
        for proj in parsed_data.get("projects", []):
            db.add(Project(
                user_id=user.id,
                name=proj.get("name"),
                role=proj.get("role"),
                start_date=proj.get("start_date"),
                end_date=proj.get("end_date"),
                tech_stack=proj.get("tech_stack"),
                details=proj.get("details", "")
            ))
            
        # Populate Languages
        for lang in parsed_data.get("languages", []):
            db.add(Language(
                user_id=user.id,
                name=lang.get("name", "Unknown"),
                proficiency=lang.get("proficiency")
            ))
            
        # Populate Skills
        skills = parsed_data.get("skills", {})
        for s in skills.get("technical", []):
            db.add(Skill(user_id=user.id, name=s, category="technical"))
        for s in skills.get("soft", []):
            db.add(Skill(user_id=user.id, name=s, category="soft"))

        user.raw_resume_text = raw_text
        # Update user contact info if extracted
        contact = parsed_data.get("contact_info", {})
        if contact.get("phone"): user.phone = contact.get("phone")
        if contact.get("email"): user.email = contact.get("email") # Careful overwriting email? Maybe only if missing.
        if contact.get("name"): user.name = contact.get("name")

        db.add(user)
        db.commit()
        db.refresh(user)
        
        return {
            "message": "Resume uploaded and parsed successfully",
            "candidate_id": user.id,
            "name": user.name,
            "skills_count": len(user.skills_list)
        }
        
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
