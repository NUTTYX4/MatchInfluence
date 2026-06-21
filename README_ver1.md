# MatchInfluence: Core Backend Architecture (v1.0)

This repository houses the initial RAG (Retrieval-Augmented Generation) backend engine for the MatchInfluence project. The system utilizes FastAPI for asynchronous API routing and ChromaDB for local vector-based semantic retrieval.

## 🚀 Architectural Overview
The engine leverages the `all-MiniLM-L6-v2` embedding model to perform high-dimensional vector similarity searches, allowing the system to rank influencers based on semantic relevance (intent/context) rather than basic keyword matching.

> **Architecture Diagram:** [Image placeholder: Vector database RAG workflow]

## 🛠️ Environment Configuration & Governance
To ensure environment parity across all development machines, the following configurations were implemented to resolve common Windows-based infrastructure hurdles:

### 1. Dependency Resolution & Pre-compiled Binaries
We explicitly utilize Python 3.11.9. Relying on versions >3.11 currently introduces build-time volatility due to the lack of pre-compiled wheels for data science dependencies (specifically `pydantic-core` and `chroma-hnswlib`), which necessitates local C++/Rust compilation—a significant source of deployment friction.

### 2. Resolution of App Execution Alias Conflicts ("Alias Hijacking")
A common environmental failure mode occurs when Windows' App Installer intercepts the `python` command, attempting to redirect execution to the Microsoft Store package manifest rather than the local installation.
* **Governance Fix:** We have bypassed this by disabling the conflicting App Execution Aliases within the Windows OS settings (`Manage app execution aliases`). This ensures that the terminal environment maintains absolute path resolution to the project-specific virtual environment.

### 3. Path Length Limitation Mitigation
Default Windows `MAX_PATH` limitations (260 characters) are incompatible with the deeply nested directory structures inherent in modern Python virtual environments. We have proactively disabled this limit at the machine level to prevent IO-related failures during recursive dependency resolution.

## 📝 Change Log (v1.0)
* Established FastAPI scaffold with asynchronous endpoints.
* Integrated ChromaDB with persistent local storage.
* Engineered a local seeding pipeline for synthetic dataset ingestion.
* Validated semantic matching logic via cosine similarity metrics.