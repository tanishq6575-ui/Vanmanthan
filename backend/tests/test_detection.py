import io
import pytest
import numpy as np
from pathlib import Path
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.config import settings
from app.services.reid_service import ReIDService
from app.services.gallery_service import GalleryService
from app.services.movement_service import movement_service

client = TestClient(app)

def create_dummy_image_bytes(color=(100, 100, 100), size=(300, 300), format="JPEG"):
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf.getvalue()

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["model"] == "MegaDetectorV6"
    assert data["speciesnet_enabled"] is True
    assert data["reid_enabled"] is True
    assert data["reserve_name"] == settings.RESERVE_NAME

def test_invalid_file_extension():
    response = client.post(
        "/api/detect",
        files={"file": ("test.txt", b"not an image", "text/plain")}
    )
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]

def test_phase1_single_image_detection_integration():
    img_bytes = create_dummy_image_bytes()
    response = client.post(
        "/api/detect",
        files={"file": ("test_camera_trap.jpg", img_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "image_id" in data
    assert data["model"] == "MegaDetectorV6"
    assert "classification" in data
    assert "detections" in data

def test_phase2_classify_crop_endpoint():
    crop_bytes = create_dummy_image_bytes(color=(120, 80, 40))
    response = client.post(
        "/api/classify",
        files={"file": ("test_crop.jpg", crop_bytes, "image/jpeg")}
    )
    assert response.status_code == 200
    data = response.json()
    assert "crop_path" in data
    assert "species" in data
    sp = data["species"]
    assert "raw_label" in sp
    assert "display_label" in sp
    assert sp["model"] == "SpeciesNet"

def test_phase3_quality_and_embedding():
    sample_file = settings.BASE_DIR / "data/sample_images/tiger_test.jpg"
    if not sample_file.exists():
        sample_file = settings.BASE_DIR / "data/sample_images/sample_animal.jpg"
    
    reid = ReIDService()
    quality = reid.assess_image_quality(str(sample_file))
    assert "quality" in quality
    assert quality["quality"] in ["GOOD", "FAIR", "POOR"]
    assert "is_reliable" in quality

    emb = reid.extract_embedding(str(sample_file))
    assert isinstance(emb, np.ndarray)
    assert emb.shape == (512,)
    assert np.isclose(np.linalg.norm(emb), 1.0, atol=1e-3)

def test_phase3_openset_reid_and_provisional():
    gallery = GalleryService()
    dummy_vec = np.random.randn(512).astype(np.float32)
    dummy_vec = dummy_vec / np.linalg.norm(dummy_vec)
    
    # Query with novel synthetic vector (below threshold 0.70)
    res = gallery.search(dummy_vec, threshold=0.70)
    assert res["status"] in ["NEW_PROVISIONAL", "MATCHED", "AMBIGUOUS"]
    if res["status"] == "NEW_PROVISIONAL":
        assert "PENCH-UNVERIFIED" in res["identity_id"]
        assert res["is_provisional"] is True

def test_phase4_movement_and_alerts():
    event, alerts = movement_service.record_tiger_sighting(
        observation_id="test-obs-01",
        identity_id="PENCH-UNVERIFIED-001",
        camera_id="CAM-PNC-05",  # Risk zone
        is_provisional=True
    )
    assert event["identity_id"] == "PENCH-UNVERIFIED-001"
    assert len(alerts) >= 1
    # Check that NEW_INDIVIDUAL alert or VILLAGE_PROXIMITY alert was generated
    alert_types = [a["alert_type"] for a in alerts]
    assert "NEW_INDIVIDUAL" in alert_types or "VILLAGE_PROXIMITY" in alert_types
