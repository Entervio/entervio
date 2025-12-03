from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from app.db.database import get_db

import logging

from app.core.config import settings


reusable_oauth2 = HTTPBearer(auto_error=True)
logger = logging.getLogger(__name__)


def decode_supabase_token(token: str) -> Dict[str, Any]:
    """Decode and validate a Supabase JWT using the configured secret.

    Supabase issues JWTs signed with the project's JWT secret. We expect the
    frontend to send the access token in the Authorization header.
    """
    try:
        # Supabase access tokens are signed with the project's JWT secret.
        # We verify the signature and basic structure here. By default,
        # python-jose validates the `aud` claim when present, so we
        # explicitly disable audience validation to avoid mismatches.
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
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(reusable_oauth2),
) -> Dict[str, Any]:
    """FastAPI dependency that extracts and validates the Supabase access token.

    Returns the decoded JWT claims. You can later adapt this to map to a local
    user record if needed.
    """
    if credentials.scheme.lower() != "bearer":
        logger.error("shit breaks here my guy")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication scheme",
        )
    

    token = credentials.credentials
    claims = decode_supabase_token(token)
    return claims



def get_current_db_user(
    current_user: Dict[str, Any] = Depends(get_current_user),
    db: Any = Depends(get_db),
) -> Any:
    """
    Dependency that returns the local DB user.
    If the user exists in Supabase (valid token) but not in local DB,
    it creates the local user record automatically.
    """
    # Avoid circular imports
    from app.models.user import User

    supabase_id = current_user.get("sub")
    if not supabase_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Supabase token: missing subject",
        )

    user = db.query(User).filter(User.supabase_id == supabase_id).first()
    
    if not user:
        # Lazy creation
        logger.info(f"User {supabase_id} not found in local DB. Creating...")
        
        # Extract metadata if available, otherwise use defaults
        user_metadata = current_user.get("user_metadata", {})
        email = current_user.get("email")
        
        if not email:
             # Should not happen with valid JWTs usually
             raise HTTPException(status_code=400, detail="Email missing in token")

        new_user = User(
            supabase_id=supabase_id,
            email=email,
            name=user_metadata.get("name", email.split("@")[0]), # Fallback name
            phone=user_metadata.get("phone"),
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user

    return user
