import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
import httpx
from app.config import settings
from app.services.data_scraper.sanitizer import sanitize_profile_data
from app.services.ai import AIEngine
from app.services.data_service import DataIngestionService

logger = logging.getLogger(__name__)

def _safe_str(text: str) -> str:
    """Strips emoji and non-ASCII characters so logging never crashes on Windows charmap codec."""
    if not text:
        return text
    # Remove emoji and other non-BMP characters
    return re.sub(r'[\U00010000-\U0010ffff]', '', text, flags=re.UNICODE).encode('ascii', 'ignore').decode('ascii')

class IngestionScraperEngine:
    @staticmethod
    async def fetch_youtube_profile(target_id: str) -> dict:
        """Fetch YouTube profile from Google API v3."""
        if not settings.YOUTUBE_API_KEY:
            raise ValueError("YOUTUBE_API_KEY is missing.")

        async with httpx.AsyncClient() as client:
            channel_id = target_id
            # If target_id doesn't look like a standard channel ID, search for it
            if not (target_id.startswith("UC") and len(target_id) == 24):
                logger.info(f"Searching YouTube for channel matching: {target_id}")
                search_url = "https://www.googleapis.com/youtube/v3/search"
                search_params = {
                    "part": "snippet",
                    "type": "channel",
                    "q": target_id,
                    "maxResults": "1",
                    "key": settings.YOUTUBE_API_KEY
                }
                response = await client.get(search_url, params=search_params)
                response.raise_for_status()
                search_data = response.json()
                if not search_data.get("items"):
                    raise ValueError(f"No YouTube channel found for query: {target_id}")
                channel_id = search_data["items"][0]["id"]["channelId"]
                logger.info(f"Resolved query '{target_id}' to Channel ID: {channel_id}")

            url = "https://www.googleapis.com/youtube/v3/channels"
            params = {
                "part": "snippet,statistics",
                "id": channel_id,
                "key": settings.YOUTUBE_API_KEY
            }
            response = await client.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("items"):
                raise ValueError(f"No YouTube channel found for ID: {channel_id}")
                
            item = data["items"][0]
            snippet = item["snippet"]
            stats = item["statistics"]
            logger.debug("YouTube channel data fetched: %s", snippet.get("title", ""))
            
            return {
                "username": snippet.get("customUrl", snippet["title"]),
                "full_name": _safe_str(snippet["title"]),
                "platform": "youtube",
                "profile_url": f"https://youtube.com/channel/{channel_id}",
                "follower_count": int(stats.get("subscriberCount", 0)),
                "total_views": int(stats.get("viewCount", 0)),
                "avg_views": int(stats.get("viewCount", 0)) // max(int(stats.get("videoCount", 1)), 1),
                "post_count": int(stats.get("videoCount", 0)),
                "bio": _safe_str(snippet["description"]),
                "recent_posts": "",
                "niche_tags": [],
                "source": "youtube_api"
            }

    @staticmethod
    async def fetch_instagram_profile(username: str) -> dict:
        """Fetch Instagram profile from Apify."""
        apify_token = getattr(settings, "APIFY_TOKEN", None)
        apify_url = getattr(settings, "APIFY_INSTAGRAM_URL", "https://api.apify.com/v2/acts/apify~instagram-profile-scraper/run-sync-get-dataset-items")
        if not apify_token:
            raise ValueError("APIFY_TOKEN is missing from settings.")

        url = f"{apify_url}?token={apify_token}"
        # Clean username to prevent invalid URLs
        clean_username = username.replace("@", "").replace(" ", "").strip()
        
        payload = {
            "usernames": [clean_username]
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(url, json=payload, timeout=60.0)
                response.raise_for_status()
                data = response.json()
                
                logger.debug("Instagram profile data fetched for user: %s", clean_username)
                
                if not data or len(data) == 0:
                    from fastapi import HTTPException
                    raise HTTPException(status_code=404, detail=f"Instagram user '{username}' not found on Apify.")
                    
                user_info = data[0]
                
                # NEW: Calculate total likes and comments from the latest posts
                total_likes = 0
                total_comments = 0
                latest_posts = user_info.get("latestPosts", [])
                for post in latest_posts:
                    total_likes += post.get("likesCount", 0)
                    total_comments += post.get("commentsCount", 0)
                
                return {
                    "username": user_info.get("username", username),
                    "platform": "instagram",
                    "profile_url": user_info.get("url", f"https://instagram.com/{username}"),
                    "follower_count": user_info.get("followersCount", 0), 
                    "following_count": user_info.get("followsCount", 0),
                    "post_count": user_info.get("postsCount", 0),
                    "total_likes": total_likes,
                    "total_comments": total_comments,
                    "full_name": _safe_str(user_info.get("fullName", username)),
                    "bio": _safe_str(user_info.get("biography", "")),
                    "niche_tags": [],
                    "source": "apify_premium"
                }

            except httpx.HTTPStatusError as e:
                logger.error(f"Apify network error: {e.response.status_code} - {e.response.text}")
                from fastapi import HTTPException
                raise HTTPException(status_code=e.response.status_code, detail=f"Apify failed: {e.response.text}")
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
        embedding = await ai_engine.get_embedding(semantic_document)
        
        if not embedding:
            logger.warning("Could not generate embedding, using a zero vector.")
            embedding = [0.0] * 384 # Fallback for all-MiniLM-L6-v2

        # 4. Save to Database
        influencer = await DataIngestionService.save_influencer(db, raw_data, embedding)
        
        return str(influencer.id)
