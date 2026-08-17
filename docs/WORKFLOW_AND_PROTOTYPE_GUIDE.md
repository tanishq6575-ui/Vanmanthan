# Wildlife AI Platform — Workflow & Prototype Technical Guide

This document provides an in-depth technical walkthrough of the **Automated Camera Trap Triage and Individual Tiger Movement Intelligence System** for Pench Tiger Reserve.

---

## 1. Prototype Working Workflow

### Step 1: Automated Ingestion & Triage (Phase 1)
1. Camera-trap SD cards or remote cellular traps ingest raw field imagery.
2. **MegaDetector V6 (`MDV6-yolov10-e`)** scans the image:
   - Identifies objects: **Animal**, **Person**, **Vehicle**, or **Blank**.
   - Filters out blank images (saving $\approx 70\%$ human inspection time).
   - Generates high-resolution animal crops.
   - Computes Laplacian variance blur score (`GOOD`, `FAIR`, `POOR`).

### Step 2: Fine-Grained Wildlife Classification (Phase 2)
1. Animal crop is routed to **Google SpeciesNet (`v4.0.3a`)**.
2. Predicts across 10 core wildlife species:
   - Tiger, Leopard, Gaur, Spotted Deer, Sambar, Wild Boar, Nilgai, Elephant, Sloth Bear, Golden Jackal.
3. If confidence $< 0.60$, automatically flags `human_review_required = True`.
4. If species is identified as **Tiger**, the crop automatically enters Phase 3.

### Step 3: Open-Set Individual Re-Identification (Phase 3)
1. Crop is normalized ($256 \times 256$) and passed to **`TigerReIDNet`** feature extractor.
2. Produces a unit-normalized 512-dimensional embedding vector $\mathbf{v} \in \mathbb{R}^{512}, \|\mathbf{v}\|_2 = 1$.
3. Evaluates against the **Open-Set Decision Matrix**:
   * **Exact Hash Check**: Computes SHA-256 hash. If matching reference image $\rightarrow$ `VERIFIED_REFERENCE`.
   * **Cosine Similarity Search**: Computes $S_i = \mathbf{v} \cdot \mathbf{u}_i$ across all gallery embeddings.
   * **State Classification**:
     * $S_{\max} \ge 0.70$ and $(S_{(1)} - S_{(2)}) \ge 0.03 \rightarrow$ **`MATCHED`** (`PENCH-T-xxx`).
     * $(S_{(1)} - S_{(2)}) < 0.03 \rightarrow$ **`AMBIGUOUS`** (Queued for Biologist Review).
     * $S_{\max} < 0.70 \rightarrow$ **`NEW_PROVISIONAL`** (Auto-creates `PENCH-UNVERIFIED-xxx`).

### Step 4: Spatial GIS Trajectory & Early Warning Engine (Phase 4)
1. Records a spatial sighting event with timestamp, camera station ID, coordinates, and crop photo URL.
2. Updates the individual tiger's **chronological trajectory line** on the Leaflet Satellite map.
3. Places directional chevrons (`▶`) along the path from older to latest detections.
4. Moves the animated **`🔴 LAST SEEN`** pin to the newest camera station.
5. Evaluates automated **Early Warning Anomaly Rules**:
   * **`NEW_INDIVIDUAL`**: First sighting of an uncatalogued tiger.
   * **`VILLAGE_PROXIMITY`**: Tiger detected at high-risk fringe stations (e.g. Sillari Border, Khursapar Buffer).
   * **`NEW_STATION`**: Territory expansion to a previously unvisited camera station.

### Step 5: Review & Biologist Conversion Workflow
1. Biologists access the **Provisional Review Page**.
2. Inspect side-by-side stripe pattern crops and historical sightings for `PENCH-UNVERIFIED-xxx`.
3. Promote provisional tigers to official national park registry:
   * `PENCH-UNVERIFIED-001` $\rightarrow$ `PENCH-T-024` with assigned name, sex, territory, and immutable audit logging.

---

## 2. API Endpoints Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System and model health status |
| `POST` | `/api/analyze` | Unified End-to-End Pipeline (Phase 1 $\rightarrow$ Phase 4) |
| `POST` | `/api/detect` | Phase 1 MegaDetector V6 Single Image Detection |
| `POST` | `/api/detect/batch` | Phase 1 MegaDetector V6 Batch Detection |
| `POST` | `/api/classify` | Phase 2 Google SpeciesNet Classification |
| `GET` | `/api/tigers` | List all verified & provisional tigers |
| `GET` | `/api/tigers/{id}` | Tiger individual profile metadata |
| `GET` | `/api/tigers/{id}/trajectory` | Chronological camera observations & GeoJSON LineString |
| `GET` | `/api/movement/cameras` | Fixed camera sensor stations & status |
| `GET` | `/api/movement/alerts` | Real-time early warning anomaly alerts |
| `POST` | `/api/movement/convert` | Biologist promotion of provisional identity |
| `GET` | `/api/admin/audit-logs` | Immutable scientific provenance logs |

---

## 3. Data Integrity & Provenance Guarantees

* **No Random Coordinates**: All coordinates are tied to real GPS sensors (`CAM-PNC-01` to `CAM-PNC-07`) in Pench Tiger Reserve.
* **No Random Trajectories**: Lines strictly connect actual camera detections in ascending timestamp order.
* **No Fake Intermediate Points**: Cameras stay geographically fixed; no artificial intermediate walking points are interpolated.
* **ATRW Dataset Isolation**: ATRW is strictly used for offline benchmark evaluations and never confused with Pench field identities.
