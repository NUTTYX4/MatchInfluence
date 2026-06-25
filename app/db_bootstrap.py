import asyncio

import asyncpg
from sqlalchemy.engine import make_url


async def ensure_database_exists(database_url: str) -> None:
    if not database_url:
        raise ValueError("DATABASE_URL is not set")

    url = make_url(database_url)
    backend = url.get_backend_name()

    if backend != "postgresql":
        return

    database_name = url.database
    if not database_name:
        return

    maintenance_url = url.set(database="postgres")
    maintenance_connect_kwargs = {
        "host": maintenance_url.host or "localhost",
        "port": maintenance_url.port or 5432,
        "user": maintenance_url.username,
        "password": maintenance_url.password,
        "database": maintenance_url.database,
    }

    connection = await asyncpg.connect(**maintenance_connect_kwargs)
    try:
        exists = await connection.fetchval(
            "SELECT 1 FROM pg_database WHERE datname = $1",
            database_name,
        )
        if not exists:
            await connection.execute(f'CREATE DATABASE "{database_name}"')
    finally:
        await connection.close()


def ensure_database_exists_sync(database_url: str) -> None:
    asyncio.run(ensure_database_exists(database_url))
