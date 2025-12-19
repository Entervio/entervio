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
    first_name: str
    last_name: str
    access_token: str
    refresh_token: str


@router.post(
    "/signup", response_model=SignupResponse, status_code=status.HTTP_201_CREATED
)
async def signup(payload: SignupRequest, db: DbSession):
    """Create a new user account."""
    try:
        # Create user in Supabase Auth
        supabase = settings.supabase_admin
        auth_response = supabase.auth.admin.create_user(
            {
                "email": payload.email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {
                    "display_name": f"{payload.first_name} {payload.last_name}",
                    "phone": payload.phone,
                },
            }
        )

        supabase_user = auth_response.user
        if not supabase_user or not supabase_user.id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase user ID missing in response",
            )

        # Check if user already exists in local DB
        existing = db.query(User).filter(User.email == payload.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )

        # Create local user record
        user = User(
            first_name=payload.first_name,
            last_name=payload.last_name,
            email=payload.email,
            phone=payload.phone,
            supabase_id=supabase_user.id,
            is_verified=True,  # Auto-verify since we set email_confirm=True
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Sign in the user to get tokens
        sign_in_response = supabase.auth.sign_in_with_password(
            {
                "email": payload.email,
                "password": payload.password,
            }
        )

        if not sign_in_response.session:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session",
            )

        return SignupResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            access_token=sign_in_response.session.access_token,
            refresh_token=sign_in_response.session.refresh_token,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {str(e)}",
        ) from e


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
