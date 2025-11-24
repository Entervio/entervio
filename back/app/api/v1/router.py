# app/api/v1/router.py
from fastapi import APIRouter
from app.api.v1.endpoints import interviews
from app.api.v1.endpoints import voice_chat

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(
    interviews.router,
    prefix="/interviews",
    tags=["interviews"]
)

api_router.include_router(
    voice_chat.router, 
    prefix="/voice", 
    tags=["voice-chat"]
)