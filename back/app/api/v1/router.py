# app/api/v1/router.py
from fastapi import APIRouter, Depends
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import voice_chat
from app.api.v1.endpoints import candidates
from app.api.v1.endpoints import auth
from app.core.auth import get_current_user

api_router = APIRouter()

protected_router = APIRouter(dependencies=[Depends(get_current_user)])

protected_router.include_router(
    interviews.router,
    prefix="/interviews",
    tags=["interviews"],
)

protected_router.include_router(
    voice_chat.router,
    prefix="/voice",
    tags=["voice-chat"],
)

protected_router.include_router(
    candidates.router,
    prefix="/candidates",
    tags=["candidates"],
)

api_router.include_router(auth.router)
api_router.include_router(protected_router)