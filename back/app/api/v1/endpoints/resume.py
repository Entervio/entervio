"""Resume REST API Endpoints"""

from fastapi import APIRouter, HTTPException, Response

from app.core.auth import CurrentUser
from app.core.deps import DbSession
from app.schemas.resume import CoverLetterRequest, TailorRequest
from app.services.resume_service import resume_service_instance

router = APIRouter()


@router.post("/tailor")
async def tailor_resume(
    request: TailorRequest,
    db: DbSession,
    user: CurrentUser,
):
    try:
        pdf_bytes = await resume_service_instance.tailor_resume(
            db, user.id, request.job_description
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


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
        raise HTTPException(status_code=500, detail=str(e)) from e
