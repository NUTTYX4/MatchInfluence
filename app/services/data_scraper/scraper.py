import logging
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.config import settings
from app.services.data_scraper.sanitizer import sanitize_profile_data
from app.services.ai import AIEngine
from app.services.data_service import DataIngestionService

logger = logging.getLogger(__name__)

class IngestionScraperEngine:
    @staticmethod
    async def fetch_youtube_profile(channel_id: str) -> dict:
        """Fetch YouTube profile from Google API v3."""
        if not settings.YOUTUBE_API_KEY:
            raise ValueError("YOUTUBE_API_KEY is missing.")

        url = f"https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id={channel_id}&key={settings.YOUTUBE_API_KEY}"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(url)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("items"):
                raise ValueError(f"No YouTube channel found for ID: {channel_id}")
                
            item = data["items"][0]
            snippet = item["snippet"]
            stats = item["statistics"]
            
            return {
                "username": snippet.get("customUrl", snippet["title"]),
                "full_name": snippet["title"],
                "platform": "youtube",
                "profile_url": f"https://youtube.com/channel/{channel_id}",
                "follower_count": int(stats.get("subscriberCount", 0)),
                "total_views": int(stats.get("viewCount", 0)), # not standard, but useful
                "avg_views": int(stats.get("viewCount", 0)) // max(int(stats.get("videoCount", 1)), 1),
                "post_count": int(stats.get("videoCount", 0)),
                "bio": snippet["description"],
                "recent_posts": "", # Need a separate call to search/playlistItems for recent posts
                "niche_tags": [],
                "source": "youtube_api"
            }

    @staticmethod
    async def fetch_instagram_profile(username: str) -> dict:
        """Fetch Instagram profile from a RapidAPI endpoint."""
        if not settings.RAPIDAPI_KEY:
            raise ValueError("RAPIDAPI_KEY is missing.")

        # Using a generic instagram scraper endpoint as an example
        # The user needs to configure the actual host based on their RapidAPI subscription
        url = "https://instagram-data-api.p.rapidapi.com/api/instagram"
        querystring = {"username": username}

        headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": "instagram-data-api.p.rapidapi.com"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers, params=querystring)
            response.raise_for_status()
            data = response.json()
            
            if "data" not in data:
                raise ValueError(f"No Instagram data found for username: {username}")
                
            info = data["data"]
            
            return {
                "username": info.get("username", username),
                "full_name": info.get("full_name"),
                "platform": "instagram",
                "profile_url": f"https://instagram.com/{info.get('username', username)}",
                "follower_count": info.get("follower_count", 0),
                "following_count": info.get("following_count", 0),
                "post_count": info.get("media_count", 0),
                "bio": info.get("biography", ""),
                "niche_tags": [],
                "source": "rapidapi"
            }

    @staticmethod
    async def coordinate_live_ingestion(db: AsyncSession, target_id: str, platform: str) -> str:
        """
        Coordinates the live ingestion of an influencer profile.
        """
        logger.info(f"Starting ingestion for {platform}: {target_id}")
        
        # 1. Fetch Raw Data
        if platform.lower() == "youtube":
            raw_data = await IngestionScraperEngine.fetch_youtube_profile(target_id)
        elif platform.lower() == "instagram":
            raw_data = await IngestionScraperEngine.fetch_instagram_profile(target_id)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        # 2. Sanitize Data
        sanitized = await sanitize_profile_data(
            raw_bio=raw_data.get("bio", ""),
            raw_tags=raw_data.get("niche_tags", [])
        )
        
        raw_data["bio"] = sanitized.get("clean_bio", raw_data["bio"])
        raw_data["niche_tags"] = sanitized.get("extracted_niche_tags", raw_data["niche_tags"])

        # 3. Get Embedding
        ai_engine = AIEngine()
        semantic_document = f"Bio: {raw_data['bio']} Recent Posts: {raw_data.get('recent_posts', '')}"
        embedding = ai_engine.get_embedding(semantic_document)
        
        if not embedding:
            logger.warning("Could not generate embedding, using a zero vector.")
            embedding = [0.0] * 384 # Fallback for all-MiniLM-L6-v2

        # 4. Save to Database
        influencer = await DataIngestionService.save_influencer(db, raw_data, embedding)
        
        return str(influencer.id)
