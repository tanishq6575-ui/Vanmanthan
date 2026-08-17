# Wildlife AI - Frontend (React + Vite + Tailwind CSS)

Dashboard UI for Pench Tiger Reserve Automated Camera Trap Triage System.

## Features
- Drag-and-drop & file picker multi-image batch uploader.
- Real-time per-image progress tracking during inference execution.
- Detection cards with status tags (`BLANK` vs `NON-BLANK`), detection counts, highest confidence scores.
- Interactive modal viewer displaying real MegaDetector bounding boxes, category confidence, and cropped animal snapshots ready for Phase 2.

## How to Run

```bash
# Navigate to frontend folder
cd frontend

# Install node dependencies
npm install

# Start Vite development server
npm run dev
```

The web application runs locally at `http://localhost:3000` and proxies `/api`, `/uploads`, `/results`, and `/crops` requests to the FastAPI backend at `http://localhost:8000`.
