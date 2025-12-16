import httpx
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.core.auth import CurrentUser
from app.core.config import settings
from app.core.deps import DbSession
from app.models.user import User
from app.schemas.user import UserDetailed, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


class SignupRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    email: EmailStr
    password: str = Field(..., min_length=6)
    phone: str | None = None


class SignupResponse(BaseModel):
    id: int
    email: EmailStr
    id: int
    email: EmailStr
    first_name: str
    last_name: str


@router.post(
    "/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED
)
async def signup(payload: SignupRequest, db: DbSession):
    """Create a new user account."""
    # Create user in Supabase Auth using the service role key
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase configuration is not set",
        )

    supabase_auth_url = f"{settings.SUPABASE_URL}/auth/v1/admin/users"

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(
                supabase_auth_url,
                headers={
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Content-Type": "application/json",
                },
                json={
                    "email": payload.email,
                    "password": payload.password,
                    "email_confirm": True,
                    "user_metadata": {
                        "first_name": payload.first_name,
                        "last_name": payload.last_name,
                        "phone": payload.phone,
                    },
                },
            )
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to communicate with Supabase: {e}",
            ) from e

    if resp.status_code not in (200, 201):
        try:
            error_body = resp.json()
        except Exception:
            error_body = {"message": resp.text}

        status_code = status.HTTP_400_BAD_REQUEST
        raise HTTPException(status_code=status_code, detail=error_body)

    supabase_user = resp.json()
    supabase_user_id = supabase_user.get("id")

    if not supabase_user_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase user ID missing in response",
        )

    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists",
        )

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        email=payload.email,
        phone=payload.phone,
        supabase_id=supabase_user_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return SignupResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
    )


@router.get("/me", response_model=UserDetailed)
async def get_me(user: CurrentUser):
    """Get current user profile."""
    return user


@router.put("/me", response_model=UserDetailed)
async def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession):
    """Update current user profile."""
    if payload.first_name is not None:
        user.first_name = payload.first_name
    if payload.last_name is not None:
        user.last_name = payload.last_name
    if payload.phone is not None:
        user.phone = payload.phone

    db.commit()
    db.refresh(user)
    return user
