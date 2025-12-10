import logging
from typing import Annotated

from fastapi import APIRouter, File, HTTPException, Response, UploadFile

from app.core.auth import CurrentUser
from app.core.deps import DbSession
from app.models.resume_models import (
    Education as EducationModel,
)
from app.models.resume_models import (
    Language as LanguageModel,
)
from app.models.resume_models import (
    Project as ProjectModel,
)
from app.models.resume_models import (
    Resume as ResumeModel,
)
from app.models.resume_models import (
    Skill as SkillModel,
)
from app.models.resume_models import (
    WorkExperience as WorkExperienceModel,
)
from app.schemas.resume import (
    CoverLetterRequest,
    ResumeFull,
    ResumeUpdate,
    TailorRequest,
)
from app.services.resume_service import resume_service_instance

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload_resume")
async def upload_resume(
    file: Annotated[UploadFile, File()],
    db: DbSession,
    user: CurrentUser,
):
    """
    Upload a resume (PDF), parse it, and create a candidate profile.
    """
    try:
        return await resume_service_instance.upload_resume(file, db, user)
    except Exception as e:
        logger.error(f"Error uploading resume: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        ) from e


@router.get("/full", response_model=ResumeFull)
async def get_full_resume(user: CurrentUser):
    """Get full structured resume."""
    resume = user.resume
    return ResumeFull(
        website=resume.website if resume else None,
        linkedin=resume.linkedin if resume else None,
        summary=resume.summary if resume else None,
        work_experiences=user.work_experiences,
        educations=user.educations,
        projects=user.projects,
        languages=user.languages,
        skills=user.skills_list,
    )


@router.put("/full", response_model=ResumeFull)
async def update_full_resume(payload: ResumeUpdate, user: CurrentUser, db: DbSession):
    """
    Update full structured resume.
    Warning: This replaces all existing entries for the user with the new list.
    """
    # 1. Clear existing generic relationships
    # Note: We use the relationship attributes to access and clear them,
    # but we need to be careful with session management.
    # A safer way handling "replace all" is deleting by user_id.

    # Delete existing records
    db.query(WorkExperienceModel).filter(
        WorkExperienceModel.user_id == user.id
    ).delete()
    db.query(EducationModel).filter(EducationModel.user_id == user.id).delete()
    db.query(ProjectModel).filter(ProjectModel.user_id == user.id).delete()
    db.query(LanguageModel).filter(LanguageModel.user_id == user.id).delete()
    db.query(SkillModel).filter(SkillModel.user_id == user.id).delete()

    # 2. Update Resume Global Fields
    resume = user.resume
    if not resume:
        resume = ResumeModel(user_id=user.id)
        db.add(resume)

    # Update fields if provided (though payload fields are optional, we likely overwrite)
    # The payload is the source of truth for "Full Update"
    resume.website = payload.website
    resume.linkedin = payload.linkedin
    resume.summary = payload.summary

    # 3. Add new records
    for item in payload.work_experiences:
        db.add(WorkExperienceModel(**item.model_dump(), user_id=user.id))

    for item in payload.educations:
        db.add(EducationModel(**item.model_dump(), user_id=user.id))

    for item in payload.projects:
        db.add(ProjectModel(**item.model_dump(), user_id=user.id))

    for item in payload.languages:
        db.add(LanguageModel(**item.model_dump(), user_id=user.id))

    for item in payload.skills:
        db.add(SkillModel(**item.model_dump(), user_id=user.id))

    db.commit()
    db.refresh(user)
    # Refresh resume relation explicitly to be safe
    db.refresh(resume)

    return ResumeFull(
        website=resume.website,
        linkedin=resume.linkedin,
        summary=resume.summary,
        work_experiences=user.work_experiences,
        educations=user.educations,
        projects=user.projects,
        languages=user.languages,
        skills=user.skills_list,
    )


@router.post("/tailor")
async def tailor_resume(
    payload: TailorRequest,
    db: DbSession,
    user: CurrentUser,
):
    """
    Tailor a resume for a specific job description.
    """
    try:
        # Security check: Ensure user is tailoring for themselves
        if payload.user_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Not authorized to tailor resume for another user",
            )

        pdf_bytes = await resume_service_instance.tailor_resume(
            db=db,
            user_id=user.id,
            job_description=payload.job_description,
            critique=payload.critique,
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.pdf"},
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error tailoring resume: {str(e)}")
        raise HTTPException(
            status_code=500, detail=f"Internal server error: {str(e)}"
        ) from e


@router.post("/cover-letter")
async def get_cover_letter(
    request: CoverLetterRequest,
    db: DbSession,
    user: CurrentUser,
):
    try:
        pdf_bytes = await resume_service_instance.generate_cover_letter(
            db=db,
            user_id=user.id,
            job_description=request.job_description,
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
