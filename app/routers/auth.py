import logging
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.database import get_db
from app.models.user import User
from app.core.security import get_password_hash, verify_password, create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["Authentication"])

class UserAuth(BaseModel):
    email: str
    password: str
    recaptcha_token: str

async def verify_recaptcha(token: str) -> bool:
    """Mock reCAPTCHA verification."""
    # In a real app, you would make an HTTP request to Google's reCAPTCHA API
    if token == "dev_bypass":
        return True
    return False

@router.post("/register")
async def register(user_data: UserAuth, db: AsyncSession = Depends(get_db)):
    if not await verify_recaptcha(user_data.recaptcha_token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reCAPTCHA token")
    
    result = await db.execute(select(User).where(User.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    
    if existing_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
        
    hashed_password = get_password_hash(user_data.password)
    new_user = User(email=user_data.email, hashed_password=hashed_password)
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    return {"status": "success", "message": "User registered successfully", "user_id": str(new_user.id)}

@router.post("/login")
async def login(response: Response, auth_data: UserAuth, db: AsyncSession = Depends(get_db)):
    if not await verify_recaptcha(auth_data.recaptcha_token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reCAPTCHA token")

    result = await db.execute(select(User).where(User.email == auth_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(auth_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
        
    token_data = {"sub": str(user.id)}
    access_token = create_access_token(data=token_data)
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60  # 7 days
    )
    
    return {"status": "success", "message": "Logged in successfully"}

@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,
        samesite="lax"
    )
    return {"status": "success", "message": "Logged out successfully"}
