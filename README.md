# 🐅 AI Wildlife Intelligence Platform
### Automated Camera-Trap Triage & Individual Tiger Movement Intelligence System
**Deployment Context:** Pench Tiger Reserve, Maharashtra & Madhya Pradesh, India  
**Target Solution:** Viksit Bharat Hackathon 2025 | VNIT Nagpur — Wildlife AI Track

---

## 🌟 Executive Summary

This platform is a 4-Phase AI and GIS intelligence system designed for automated camera-trap image processing, species classification, open-set individual tiger re-identification (Re-ID), and real-time spatial corridor tracking with automated early warning alerts.

```text
                                  AI INFERENCE PIPELINE
                                  
  [ Camera-Trap Image ]
            │
            ▼
┌───────────────────────┐
│   Phase 1: Triage     │  MegaDetector V6 (YOLOv10x, 29.4M params)
│   (MDV6 Detector)     │  → Bounding Box Localization (Animal / Person / Vehicle / Blank)
└───────────┬───────────┘
            │ Animal Crop
            ▼
┌───────────────────────┐
│ Phase 2: SpeciesNet   │  Google SpeciesNet (Kaggle v4.0.3a PyTorch)
│ (Fine-Grained Class.) │  → 10-Class Wildlife Taxonomy (Tiger, Leopard, Gaur, etc.)
└───────────┬───────────┘
            │ Tiger Verified Crop
            ▼
┌───────────────────────┐
│  Phase 3: Open-Set    │  TigerReIDNet (MobileNetV3 + 512-D L2-norm Projection)
│  Individual Re-ID     │  → 4-State Open-Set Re-ID (Verified, Matched, Ambiguous, Provisional)
└───────────┬───────────┘
            │ Spatial Sighting Event
            ▼
┌───────────────────────┐
│ Phase 4: Spatial GIS  │  Leaflet Satellite + Spatial PostGIS + Telemetry Engine
│ & Early Warning Alerts│  → Chronological Trajectory Lines, Replay & Risk Geofencing
└───────────────────────┘
```

---

## 🚀 Key Modules & Architecture

### 1. Phase 1: MegaDetector V6 Camera-Trap Triage
* **Model**: YOLOv10-based MegaDetector V6 (`MDV6-yolov10-e`, 29.4M parameters).
* **Function**: Filters thousands of raw field images into **Animal**, **Person**, **Vehicle**, or **Blank**.
* **Output**: Normalized bounding boxes `[ymin, xmin, ymax, xmax]` and cropped regions with blur quality scoring.

### 2. Phase 2: Google SpeciesNet Fine-Grained Wildlife Classification
* **Model**: Google SpeciesNet (`pyTorch/v4.0.3a`).
* **Taxonomy**: Tiger (*Panthera tigris*), Leopard (*Panthera pardus*), Gaur (*Bos gaurus*), Spotted Deer (*Axis axis*), Sambar (*Rusa unicolor*), Wild Boar (*Sus scrofa*), Nilgai, Indian Elephant, Sloth Bear, Golden Jackal.
* **Confidence Gating**: Low-confidence or ambiguous detections automatically flag for Human Biologist Review.

### 3. Phase 3: Open-Set Individual Tiger Re-Identification (Re-ID)
* **Model**: 512-D L2-normalized feature representation model (`TigerReIDNet` / `MiewID`).
* **Strict Open-Set 4-State Decision Matrix**:
  1. **`VERIFIED_REFERENCE`**: Cryptographic SHA-256 hash match against stored reference archive.
  2. **`MATCHED`**: Cosine similarity $\ge 0.70$ and confidence margin $\Delta \ge 0.03$.
  3. **`AMBIGUOUS`**: Top-1 vs Top-2 similarity delta $< 0.03$ (flags `human_review_required`).
  4. **`NEW_PROVISIONAL`**: Similarity $< 0.70 \rightarrow$ creates `PENCH-UNVERIFIED-xxx`, indexes embedding into FAISS/pgvector, and tracks recurring uncatalogued sightings.
* **Data Provenance Rule**: ATRW dataset is strictly isolated for training/benchmarking; never confused with Pench field identities.

### 4. Phase 4: Camera Movement Intelligence & Real-Time GIS Map
* **Interactive Map Framework**: Leaflet with high-resolution **Esri Satellite**, **Dark Tactical Grid**, and **Terrain** tiles.
* **Multi-Park Support**: Presets for **Pench Tiger Reserve**, **Gorewada International Wildlife Park**, and **Tadoba Andhari Tiger Reserve**.
* **GIS Geofencing**: Real-time polygons for **Core Sanctuary Zone** (Green), **Buffer Zone** (Amber), and **High-Risk Village Fringe** (Red).
* **Actual Camera-to-Camera Trajectory**:
  * GeoJSON LineString connecting camera detections in exact timestamp order.
  * Directional arrows (`▶`) showing movement direction from older to latest sightings.
  * Animated pulsing **`🔴 LAST SEEN`** pin at the latest camera station.
* **Synchronized Camera-Trap Timeline**: Clickable chronological timeline synchronized with map zoom and image inspector.
* **Live Replay Simulation**: Progressively animates camera-to-camera movement step-by-step.
* **Buffer Station Capture Simulation**: Direct image ingest at any camera trap station with instant map preview.
* **Early Warning Anomaly Alerts**:
  * `NEW_INDIVIDUAL` (First-time uncatalogued tiger discovery).
  * `VILLAGE_PROXIMITY` (Tiger detected at high-risk fringe border).
  * `NEW_STATION` (Territory expansion to a new camera range).

---

## 💻 Quick Start & Running Locally

### Prerequisites
* Python 3.10+
* Node.js 18+ and npm

### 1. Start FastAPI Backend (Port 8000)
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
* **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
* **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

### 2. Start Vite React Frontend (Port 3000)
```powershell
cd frontend
npm install
npm run dev
```
* **Web UI Portal**: [http://localhost:3000](http://localhost:3000)

### 3. Run Automated Pytest Test Suite
```powershell
cd backend
pytest -v
```
* **Status**: 7/7 tests passed (100% pass rate).

---

## 📊 How to Present / Demo to Hackathon Judges

| Demonstration Step | What to Show in the UI | Key Points to Explain |
| :--- | :--- | :--- |
| **1. Upload Image (Phase 1)** | Go to **01 Detection (MDV6)**, upload camera-trap photo. | Explain MegaDetector V6 bounding box detection, animal cropping, and blank photo filtration. |
| **2. Species Classification (Phase 2)** | Go to **02 SpeciesNet**. | Explain fine-grained species taxonomy and human review gating. |
| **3. Open-Set Tiger Re-ID (Phase 3)** | Go to **03 Open-Set Re-ID**. | Explain the 4-state open-set classifier and how `PENCH-UNVERIFIED-xxx` tracks new tigers. |
| **4. Spatial Trajectory & Map (Phase 4)** | Go to **04 Movement & Alerts**, select `PENCH-T-023`. | Point out the GeoJSON trajectory line, directional arrows, `🔴 LAST SEEN` marker, and timeline. |
| **5. Live Replay Simulation** | Click **"Live Replay Trajectory"**. | Show progressive step-by-step segment drawing and animated pin transitions. |
| **6. Buffer Station Ingest Simulation** | Select `CAM-PNC-06` (Sillari Buffer) and click **"Upload & Simulate Capture"**. | Show real-time capture simulation, map pin pulse, and instant photo preview. |
| **7. Provisional Identity Promotion** | Go to **Provisional Review & Convert**. | Show biologist promotion workflow (`PENCH-UNVERIFIED-xxx` $\rightarrow$ `PENCH-T-xxx`) with immutable audit logging. |

---

## 🔒 Security & Data Provenance

1. **Role-Based Access Control (RBAC)**:
   * `ADMIN`: Full configuration, identity promotion, and audit log access.
   * `FOREST_OFFICER`: Emergency alert response, fringe patrol dispatch.
   * `RESEARCHER`: Gallery additions, biometric re-ID review.
   * `VIEWER`: Public view with GPS coordinates rounded for anti-poaching security.
2. **Provenance & Integrity**:
   * Cryptographic SHA-256 verification for all reference images.
   * Complete audit trail with timestamps, user IDs, and action logs.

---

## 📁 Repository Structure

```text
wildlife-ai/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI Entrypoint & Static Mounts
│   │   ├── config.py                # Environment & Model Hyperparameters
│   │   ├── auth.py                  # OAuth / RBAC Security
│   │   ├── db/database.py           # SQLite / PostGIS Schema & Seeder
│   │   ├── ml/                      # Inference Engines (MDV6, SpeciesNet, Re-ID)
│   │   │   └── reid/                # Open-Set Re-ID Package
│   │   ├── routes/                  # API Endpoints (Detection, Tigers, Movement, Admin)
│   │   └── services/                # Business Logic (Gallery, Movement, Storage, Audit)
│   ├── tests/test_detection.py      # Pytest Integration Suite
│   └── requirements.txt             # Python Dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx                  # Main Application Router & State
│   │   ├── components/
│   │   │   ├── WildlifeLiveMap.jsx  # Leaflet Satellite & Trajectory Map
│   │   │   └── Navbar.jsx           # Command Center Navigation
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx    # Overview Command Center
│   │   │   ├── Phase1Page.jsx       # MegaDetector V6 Triage
│   │   │   ├── Phase2Page.jsx       # Google SpeciesNet Classification
│   │   │   ├── Phase3Page.jsx       # Open-Set Individual Re-ID
│   │   │   ├── Phase4Page.jsx       # Trajectory GIS & Early Warning Alerts
│   │   │   ├── ReviewPage.jsx       # Provisional Identity Review
│   │   │   └── LoginPage.jsx        # Google OAuth Authentication
│   │   └── index.css                # Tailwind / Theme Design System
│   └── package.json                 # Frontend Dependencies
├── reports/                         # ATRW Inspection & Provenance Reports
├── scripts/                         # Seeding, Benchmarks & Demo Scripts
├── docs/                            # Comprehensive Prototype & Workflow Docs
└── README.md                        # Documentation
```
