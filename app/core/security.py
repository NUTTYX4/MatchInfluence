import os
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Request, HTTPException, status
import bcrypt
import jwt

# --- Configuration ---
# In production, this should be set in your .env file
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-super-secret-dev-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# --- Cryptography (Password Hashing) ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plain-text password against the stored bcrypt hash."""
    return bcrypt.checkpw(
        plain_password[:72].encode('utf-8'),
        hashed_password.encode('utf-8')
    )

def get_password_hash(password: str) -> str:
    """Hashes a plain-text password using bcrypt."""
    return bcrypt.hashpw(
        password[:72].encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

# --- JWT Generation ---
def create_access_token(data: dict) -> str:
    """Creates a JWT token with a 7-day expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    
    # Generate the signed JWT string
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# --- Security Dependency ---
async def get_current_user(request: Request) -> str:
    """
    FastAPI Dependency to extract the current user ID from the HTTP-only cookie.
    Raises 401 Unauthorized if the token is missing, expired, or invalid.
    """
    token = request.cookies.get("access_token")
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Missing access_token cookie.",
        )
    
    # If the token is stored as "Bearer <token>", strip the prefix
    if token.startswith("Bearer "):
        token = token[len("Bearer "):]

    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: Optional[str] = payload.get("sub")
        
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload. Missing user identifier.",
            )
            
        return str(user_id)
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )
