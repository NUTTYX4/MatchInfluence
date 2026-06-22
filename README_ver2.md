# MatchInfluence Core API (v2.0.0)

## Overview
MatchInfluence is a production-grade, AI-powered influencer matching engine. It takes natural language campaign briefs (niche, audience, budget) and mathematically ranks the best influencer fits using vector similarity and algorithmic scoring.

## Architecture: The Dual-Engine
This system utilizes a highly decoupled, dual-database architecture:

1. **The Vector Store (ChromaDB):** Handles the semantic search. It stores the mathematical representations of influencer profiles (bio, niche, content).
2. **The Relational Store (PostgreSQL):** The absolute source of truth. Handles structured data (metrics, financial logic, campaign audit trails, and computed scores).

## The AI Brain
* **Model:** Local HuggingFace `all-MiniLM-L6-v2` via `sentence-transformers`.
* **Process:** Converts campaign briefs into 384-dimensional arrays for millisecond semantic retrieval against the ChromaDB space.

## Current State (Phase 1 & 2 Complete)
*  **PostgreSQL Foundation:** Advanced ORM models with UUID primary keys and complex metrics tracking.
*  **Vector Search:** Fully operational semantic matching.
*  **Math Pipeline:** Custom algorithms calculating expected Cost Per Engagement (CPE), Authenticity (ER, CLR, FFR), and Composite Fit.
*  **Stable 200 OK:** The `/match` endpoint successfully orchestrates the dual-database read/writes and returns ranked JSON results.

## Next Up
* LLM Generative Explanations (OpenRouter Integration)
* Live Data Ingestion Pipelines (YouTube/Instagram APIs)
* JWT Security Layer