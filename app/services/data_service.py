import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.influencer import Influencer, InfluencerMetricLog
from app.database import chroma_collection
from app.config import settings

def _utcnow() -> datetime:
    return datetime.now(timezone.utc)

class DataIngestionService:
    @staticmethod
    async def save_influencer(db: AsyncSession, influencer_data: dict, embedding: list[float]) -> Influencer:
        """
        Atomically saves structural data to PostgreSQL and semantic vectors to ChromaDB, with Audit Logging.
        """
        # 1. Check if the influencer already exists
        query = select(Influencer).where(Influencer.username == influencer_data["username"])
        result = await db.execute(query)
        existing_influencer = result.scalar_one_or_none()
        
        now = _utcnow()
        refresh_threshold = now - timedelta(days=settings.DATA_REFRESH_INTERVAL_DAYS)
        
        # Determine engagement rate
        follower_count = influencer_data.get("follower_count", 0)
        total_likes = influencer_data.get("total_likes", 0)
        total_comments = influencer_data.get("total_comments", 0)
        engagement_rate = float((total_likes + total_comments) / follower_count) if follower_count > 0 else 0.0

        if existing_influencer:
            # Upsert logic: Update if scraped_at is missing or older than interval
            scraped_at = existing_influencer.scraped_at
            if not scraped_at or scraped_at.replace(tzinfo=timezone.utc) < refresh_threshold:
                # Overwrite metrics in Postgres
                existing_influencer.follower_count = follower_count
                existing_influencer.following_count = influencer_data.get("following_count", 0)
                existing_influencer.total_likes = total_likes
                existing_influencer.total_comments = total_comments
                existing_influencer.avg_views = influencer_data.get("avg_views")
                existing_influencer.post_count = influencer_data.get("post_count", 0)
                existing_influencer.price_per_post = influencer_data.get("price_per_post")
                existing_influencer.bio = influencer_data.get("bio")
                existing_influencer.recent_posts = influencer_data.get("recent_posts")
                existing_influencer.niche_tags = influencer_data.get("niche_tags", [])
                existing_influencer.engagement_rate = engagement_rate
                existing_influencer.scraped_at = now
                
                # Insert a new row into InfluencerMetricLog
                audit_log = InfluencerMetricLog(
                    influencer_id=existing_influencer.id,
                    recorded_at=now,
                    follower_count=follower_count,
                    avg_views=existing_influencer.avg_views,
                    est_cpe=existing_influencer.estimated_cpe
                )
                db.add(audit_log)
                await db.commit()
                await db.refresh(existing_influencer)

                # Run chroma_collection.update()
                semantic_document = f"Bio: {existing_influencer.bio or ''} Recent Posts: {existing_influencer.recent_posts or ''}"
                chroma_collection.update(
                    ids=[str(existing_influencer.id)],
                    embeddings=[embedding],
                    documents=[semantic_document],
                    metadatas=[{
                        "username": existing_influencer.username,
                        "platform": existing_influencer.platform,
                        "niche_tags": ",".join(existing_influencer.niche_tags) if existing_influencer.niche_tags else ""
                    }]
                )
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
            follower_count=follower_count,
            following_count=influencer_data.get("following_count", 0),
            total_likes=total_likes,
            total_comments=total_comments,
            avg_views=influencer_data.get("avg_views"),
            post_count=influencer_data.get("post_count", 0),
            price_per_post=influencer_data.get("price_per_post"),
            bio=influencer_data.get("bio"),
            recent_posts=influencer_data.get("recent_posts"),
            niche_tags=influencer_data.get("niche_tags", []),
            engagement_rate=engagement_rate,
            source=influencer_data["source"],
            scraped_at=now
        )
        
        db.add(db_influencer)
        
        # 4. Insert the first row into InfluencerMetricLog
        audit_log = InfluencerMetricLog(
            influencer_id=shared_uuid,
            recorded_at=now,
            follower_count=follower_count,
            avg_views=db_influencer.avg_views,
            est_cpe=db_influencer.estimated_cpe
        )
        db.add(audit_log)
        
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
