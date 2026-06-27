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
            
            import json
            print("\n🚨 RAW YOUTUBE PAYLOAD:", json.dumps(data, indent=2), "\n")
            
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
        if not settings.RAPIDAPI_KEY or not getattr(settings, "RAPIDAPI_HOST", None):
            raise ValueError("RAPIDAPI_KEY or RAPIDAPI_HOST is missing from settings.")

        headers = {
            "x-rapidapi-key": settings.RAPIDAPI_KEY,
            "x-rapidapi-host": settings.RAPIDAPI_HOST,
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            try:
                # Step 1: Resolve username to internal Instagram User ID
                lookup_url = f"https://{settings.RAPIDAPI_HOST}/v2/user/by/username/"
                lookup_response = await client.get(
                    lookup_url, 
                    headers=headers, 
                    params={"username": username}, 
                    timeout=20.0
                )
                lookup_response.raise_for_status()
                lookup_data = lookup_response.json()
                
                # Extract the raw ID string safely
                user_id = lookup_data.get("data", {}).get("id")
                if not user_id:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=404, detail=f"Instagram user '{username}' not found.")
                    
                # Step 2: Fetch the actual profile metrics using the resolved ID
                details_url = f"https://{settings.RAPIDAPI_HOST}/v2/user/details/"
                response = await client.get(
                    details_url, 
                    headers=headers, 
                    params={"user_id": user_id}, 
                    timeout=20.0
                )
                response.raise_for_status()
                raw_data = response.json()
                
                import json
                print("\n🚨 DEBUG INSTAGRAM RAW PAYLOAD:", json.dumps(raw_data, indent=2), "\n")
                
                # Safely dig into the standard data nesting returned by Glavier
                user_info = raw_data.get("data", {})
                
                return {
                    "username": username,
                    "platform": "instagram",
                    "profile_url": f"https://instagram.com/{username}",
                    "follower_count": user_info.get("follower_count", 0), 
                    "following_count": user_info.get("following_count", 0),
                    "post_count": user_info.get("media_count", 0),
                    "full_name": user_info.get("full_name", username),
                    "bio": user_info.get("biography", ""),
                    "niche_tags": [],
                    "source": "rapidapi"
                }

            except httpx.HTTPStatusError as e:
                logger.error(f"RapidAPI network error: {e.response.status_code} - {e.response.text}")
                from fastapi import HTTPException
                raise HTTPException(status_code=e.response.status_code, detail=f"RapidAPI failed: {e.response.text}")
            except Exception as e:
                logger.error(f"Scraper crashed internally: {str(e)}")
                from fastapi import HTTPException
                raise HTTPException(status_code=500, detail=f"Internal script error: {str(e)}")

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
