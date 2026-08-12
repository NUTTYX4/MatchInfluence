import uuid
import logging
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# Import models and infrastructure
from app.models.influencer import Influencer
from app.models.campaign import Campaign, MatchResult
from app.database import chroma_collection

# Import logic services
from app.services.scoring import ScoringEngine
from app.services.ai import AIEngine
from app.services.llm import generate_explanation

logger = logging.getLogger(__name__)

class MatchingOrchestrator:
    
    @staticmethod
    async def find_best_matches(db: AsyncSession, request, current_user_id: str):
        try:
            # 1. FETCH EXACT CAMPAIGN
            query = select(Campaign).where(Campaign.id == request.campaign_id).where(Campaign.owner_id == current_user_id)
            result = await db.execute(query)
            db_campaign = result.scalar_one_or_none()

            if not db_campaign:
                raise ValueError(f"Campaign {request.campaign_id} not found or does not belong to the user.")

            brief_text = db_campaign.brief_text 

            # 3. AI VECTOR EMBEDDING
            query_vector = await AIEngine.get_embedding(brief_text)
            
            # 4. Vector Search via ChromaDB
            chroma_results = chroma_collection.query(
                query_embeddings=[query_vector],
                n_results=request.num_results
            )
            
            if not chroma_results['ids'] or not chroma_results['ids'][0]:
                return []

            matched_ids = chroma_results['ids'][0]
            semantic_distances = chroma_results['distances'][0]
            
            # FIX: Convert ChromaDB string IDs back to UUIDs for PostgreSQL
            matched_uuids = [uuid.UUID(id_str) for id_str in matched_ids]
            
            # 5. HYDRATE: Fetch exact rows from PostgreSQL using the UUIDs
            query = select(Influencer).where(Influencer.id.in_(matched_uuids))
            db_results = await db.execute(query)
            
            # We map by ID to easily find them below
            influencers_dict = {str(inf.id): inf for inf in db_results.scalars().all()}
            
            candidate_prep = []
            llm_tasks = []
            
            # 6. SCORE PREPARATION (No blocking awaits here)
            for i, match_id in enumerate(matched_ids):
                inf = influencers_dict.get(match_id)
                if not inf:
                    continue
                    
                distance = semantic_distances[i]
                semantic_score = max(0.0, 1.0 - (distance / 2.0))
                
                metrics = ScoringEngine.calculate_metrics(
                    inf.follower_count, inf.following_count, inf.total_likes, inf.total_comments
                )
                
                auth_score = ScoringEngine.calculate_authenticity(
                    metrics['er'], metrics['clr'], metrics['ffr'], inf.platform
                )
                fit_score = ScoringEngine.calculate_composite_fit(semantic_score, auth_score)
                
                expected_engagements = max(inf.follower_count * (metrics['er'] / 100), 1)
                cpe = (inf.price_per_post / expected_engagements) if inf.price_per_post else 0.0
                
                # Store the math results
                candidate_prep.append({
                    "inf_id": str(inf.id),
                    "inf": inf,
                    "metrics": metrics,
                    "scores": {
                        "semantic_match": round(semantic_score, 3),
                        "authenticity": auth_score,
                        "composite_fit": fit_score
                    },
                    "cpe": cpe
                })

                # Queue the async task (Do NOT await it here)
                llm_tasks.append(
                    generate_explanation(
                        campaign_context=brief_text,
                        influencer_data={
                            "username": inf.username,
                            "platform": inf.platform,
                            "bio": inf.bio,
                            "niche_tags": inf.niche_tags
                        },
                        fit_score=fit_score
                    )
                )
            
            # FIX: Fire OpenRouter API calls sequentially to avoid HTTP 429 Rate Limits from free tiers
            explanations = []
            for task in llm_tasks:
                try:
                    result = await task
                    explanations.append(result)
                    await asyncio.sleep(1) # 1-second delay between calls to respect rate limits
                except Exception as e:
                    logger.error(f"LLM task failed during sequential execution: {e}")
                    explanations.append(f"AI explanation temporarily unavailable. Error: {str(e)}")

            final_candidates = []
            
            # 7. ASSEMBLE & RANK
            for idx, candidate in enumerate(candidate_prep):
                final_candidates.append({
                    "influencer_id": candidate["inf_id"],
                    "username": candidate["inf"].username,
                    "platform": candidate["inf"].platform,
                    "follower_count": candidate["inf"].follower_count,
                    "engagement_rate": round(candidate["metrics"]["er"], 2),
                    "composite_score": int(candidate["scores"]["composite_fit"] * 100),
                    "semantic_score": int(candidate["scores"]["semantic_match"] * 100),
                    "authenticity_score": int(candidate["scores"]["authenticity"] * 100),
                    "cpe": round(candidate["cpe"], 4),
                    "explanation": explanations[idx]
                })

            final_candidates.sort(key=lambda x: x["composite_score"], reverse=True)
            
            # 8. PERSIST
            for rank_index, candidate in enumerate(final_candidates):
                candidate["rank"] = rank_index + 1
                
                db_match = MatchResult(
                    campaign_id=db_campaign.id,
                    influencer_id=uuid.UUID(candidate["influencer_id"]),
                    semantic_score=candidate["semantic_score"],
                    authenticity_score=candidate["authenticity_score"],
                    composite_score=candidate["composite_score"],
                    cpe=candidate["cpe"],
                    explanation=candidate["explanation"],
                    rank=candidate["rank"]
                )
                db.add(db_match)
                
                # Remove UUID before sending to frontend
                del candidate["influencer_id"]

            # 9. COMMIT
            await db.commit()
            
            return final_candidates
            
        except Exception as e:
            logger.error(f"Matching pipeline error: {str(e)}")
            await db.rollback()
            raise e