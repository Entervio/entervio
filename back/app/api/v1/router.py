# app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import voice_chat
from app.api.v1.endpoints import resume
from app.api.v1.endpoints import candidates

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    interviews.router,
    tags=["interviews"]
)

api_router.include_router(
    voice_chat.router, 
    prefix="/voice", 
    tags=["voice-chat"]
)

api_router.include_router(
    resume.router, 
    prefix="/resume", 
    tags=["resume"]
)

api_router.include_router(
    candidates.router,
    prefix="/candidates",
    tags=["candidates"]
)