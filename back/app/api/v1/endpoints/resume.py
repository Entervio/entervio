from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from app.db import get_db
from app.schemas.resume import TailorRequest
from app.services.resume_service import resume_service_instance

router = APIRouter()


@router.post("/tailor")
async def tailor_resume(request: TailorRequest, db: Session = Depends(get_db)):
    try:
        pdf_bytes = await resume_service_instance.tailor_resume(
            db, request.user_id, request.job_description
        )
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_resume.pdf"},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
