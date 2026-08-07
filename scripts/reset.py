import asyncio
from bcrypt import hashpw, gensalt
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text

# Your local PostgreSQL connection string
DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:5432/matchinfluence"

EMAIL_TO_UPDATE = "nithinvinuthan123@gmail.com"
NEW_PASSWORD = "Nithin@2222"  # <-- Change this to whatever password you want

async def reset_password():
    # 1. Generate the secure bcrypt hash
    password_bytes = NEW_PASSWORD.encode('utf-8')
    hashed_password = hashpw(password_bytes, gensalt()).decode('utf-8')
    
    # 2. Connect to your database
    engine = create_async_engine(DATABASE_URL, echo=True)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    
    async with async_session() as session:
        async with session.begin():
            # 3. Update the user row
            query = text(
                "UPDATE users SET hashed_password = :hash WHERE email = :email"
            )
            result = await session.execute(query, {"hash": hashed_password, "email": EMAIL_TO_UPDATE})
            print(f"\n Rows updated: {result.rowcount}")
            
    await engine.dispose()
    print(f"\n Successfully updated password for {EMAIL_TO_UPDATE}!")

if __name__ == "__main__":
    asyncio.run(reset_password())