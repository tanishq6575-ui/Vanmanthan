# Wildlife AI - Backend (Microsoft MegaDetector V6)

Automated Camera Trap Triage backend for Pench Tiger Reserve powered by Microsoft MegaDetector V6 and Pytorch-Wildlife.

## What MegaDetector V6 Does
- Detects objects in camera trap images.
- Classifies objects into 3 broad categories: `animal`, `person`, `vehicle`.
- Provides bounding box coordinates `[x1, y1, x2, y2]` and confidence scores.
- Enables filtering/triage of empty (blank) camera trap images.

## What MegaDetector V6 Does NOT Do
- It does **NOT** identify specific animal species (e.g. Tiger vs Leopard vs Deer).
- It does **NOT** perform individual animal re-identification.
- Species identification and tiger ID intelligence will be integrated in Phase 2 & Phase 3.

## Environment & Requirements
- **Python**: 3.10+
- **Framework**: FastAPI + PyTorch + Pytorch-Wildlife
- **Device Support**: CUDA (NVIDIA GPU), MPS (Apple Silicon), or CPU (Automatic fallback).

## Official Microsoft Resources
- [Microsoft MegaDetector Repository](https://github.com/microsoft/MegaDetector)
- [Microsoft Pytorch-Wildlife Repository](https://github.com/microsoft/Pytorch-Wildlife)

## Model Weights
Model weights for `MDV6-yolov10-e` (or configured V6 variant) are downloaded automatically on first run by `PytorchWildlife.models.detection.MegaDetectorV6()`.

## Installation & Running

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start backend server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

## Configuration
Set environment variables in `.env` at project root:
- `MEGADETECTOR_VERSION=MDV6-yolov10-e`
- `MEGADETECTOR_THRESHOLD=0.20`
- `DEVICE=auto`
