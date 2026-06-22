import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.influencer import Influencer
from app.database import chroma_collection

class DataIngestionService:
    @staticmethod
    async def save_influencer(db: AsyncSession, influencer_data: dict, embedding: list[float]) -> Influencer:
        """
        Atomically saves structural data to PostgreSQL and semantic vectors to ChromaDB.
        """
        # 1. Check if the influencer already exists to avoid duplicate entries
        query = select(Influencer).where(Influencer.username == influencer_data["username"])
        result = await db.execute(query)
        existing_influencer = result.scalar_one_or_none()
        
        if existing_influencer:
            return existing_influencer

        # 2. Generate a single unified UUID shared across both databases
        shared_uuid = str(uuid.uuid4())
        
        # 3. Formulate the PostgreSQL structured record
        db_influencer = Influencer(
            id=shared_uuid,
            username=influencer_data["username"],
            full_name=influencer_data.get("full_name"),
            platform=influencer_data["platform"],
            profile_url=influencer_data.get("profile_url"),
            follower_count=influencer_data.get("follower_count", 0),
            following_count=influencer_data.get("following_count", 0),
            total_likes=influencer_data.get("total_likes", 0),
            total_comments=influencer_data.get("total_comments", 0),
            avg_views=influencer_data.get("avg_views"),
            post_count=influencer_data.get("post_count", 0),
            price_per_post=influencer_data.get("price_per_post"),
            bio=influencer_data.get("bio"),
            recent_posts=influencer_data.get("recent_posts"),
            niche_tags=influencer_data.get("niche_tags", []),
            source=influencer_data["source"]
        )
        
        # Calculate initial baseline engagement rate
        if db_influencer.follower_count > 0:
            total_engagements = db_influencer.total_likes + db_influencer.total_comments
            db_influencer.engagement_rate = float(total_engagements / db_influencer.follower_count)

        # 4. Write to PostgreSQL
        db.add(db_influencer)
        await db.commit()
        await db.refresh(db_influencer)
        
        # 5. Compile semantic metadata block for ChromaDB search display
        semantic_document = f"Bio: {db_influencer.bio or ''} Recent Posts: {db_influencer.recent_posts or ''}"
        
        # 6. Write to ChromaDB using the exact same ID string
        chroma_collection.add(
            ids=[shared_uuid],
            embeddings=[embedding],
            documents=[semantic_document],
            metadatas=[{
                "username": db_influencer.username,
                "platform": db_influencer.platform,
                "niche_tags": ",".join(db_influencer.niche_tags) if db_influencer.niche_tags else ""
            }]
        )
        
        return db_influencer