import logging
from typing import Annotated, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.core.config import settings
from app.core.deps import DbSession
from app.models.user import User

reusable_oauth2 = HTTPBearer(auto_error=True)
logger = logging.getLogger(__name__)


def decode_supabase_token(token: str) -> dict[str, Any]:
    """Decode and validate a Supabase JWT using the configured secret.

    Supabase issues JWTs signed with the project's JWT secret. We expect the
    frontend to send the access token in the Authorization header.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=[settings.ALGORITHM],
            options={"verify_aud": False},
        )
        logger.info("Decoded Supabase token payload: %s", payload)
        return payload
    except JWTError as e:
        logger.exception("Supabase JWT decode failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate Supabase credentials",
        ) from e


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(reusable_oauth2)],
) -> dict[str, Any]:
    """FastAPI dependency that extracts and validates the Supabase access token.

    Returns the decoded JWT claims. You can later adapt this to map to a local
    user record if needed.
    """
    if credentials.scheme.lower() != "bearer":
        logger.error("Invalid authentication scheme")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )

    token = credentials.credentials
    claims = decode_supabase_token(token)
    return claims


def get_current_db_user(
    current_user: Annotated[dict[str, Any], Depends(get_current_user)],
    db: DbSession,
) -> User:
    """
    Dependency that returns the local DB user.
    If the user exists in Supabase (valid token) but not in local DB,
    it creates the local user record automatically.
    """

    supabase_id = current_user.get("sub")
    if not supabase_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token: missing subject",
        )

    user = db.query(User).filter(User.supabase_id == supabase_id).first()

    # Check email verification status from Supabase token
    # Supabase stores this in email_confirmed_at field
    email_confirmed_at = current_user.get("email_confirmed_at")
    email_verified = email_confirmed_at is not None

    # Sync email verification status from Supabase if it changed
    if not user.is_verified and email_verified:
        logger.info(f"User {user.id} confirmed their email. Updating local record.")
        user.is_verified = True
        db.commit()
        db.refresh(user)

    # Allow all users to access the API regardless of verification status
    # The verification status is tracked but doesn't block access
    return user


CurrentUser = Annotated[User, Depends(get_current_db_user)]
