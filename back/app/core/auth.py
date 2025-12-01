from typing import Any, Dict

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
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
