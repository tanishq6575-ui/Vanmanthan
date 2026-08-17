from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str
    model: str = "MegaDetectorV6"
    model_version: str
    speciesnet_enabled: bool = True
    reid_enabled: bool = True
    reserve_name: str = "Pench Tiger Reserve"
    device: str = "auto"

class TopPredictionItem(BaseModel):
    raw_label: str
    display_label: str
    confidence: float

class SpeciesResultSchema(BaseModel):
    raw_label: str
    display_label: str
    confidence: float
    status: str
    human_review_required: bool
    model: str = "SpeciesNet"
    top_predictions: List[TopPredictionItem] = []

class QualityAssessmentSchema(BaseModel):
    quality: str = "GOOD"  # GOOD, FAIR, POOR, RE-ID_UNRELIABLE
    blur_score: float = 0.0
    resolution: List[int] = [0, 0]
    aspect_ratio: float = 1.0
    is_reliable: bool = True
    note: Optional[str] = None

class TigerProfileSchema(BaseModel):
    identity_id: str
    name: str
    sex: str
    territory: str
    first_seen: str
    last_seen: str
    total_detections: int
    is_provisional: bool = False
    reference_image: Optional[str] = None
    source: Optional[str] = None
    verified: bool = True

class ReIDCandidateItem(BaseModel):
    identity_id: str
    name: str
    similarity_score: float
    is_provisional: bool = False
    reference_image: Optional[str] = None

class ReIDResultSchema(BaseModel):
    status: str = Field(..., description="'MATCHED', 'AMBIGUOUS', 'NEW_PROVISIONAL', or 'NOT_APPLICABLE'")
    identity_id: Optional[str] = None
    similarity_score: float = 0.0
    is_provisional: bool = False
    human_review_required: bool = False
    quality_assessment: Optional[QualityAssessmentSchema] = None
    message: Optional[str] = None
    tiger_profile: Optional[TigerProfileSchema] = None
    top_candidates: List[ReIDCandidateItem] = []

class DetectionItem(BaseModel):
    detection_id: Optional[str] = None
    category: str
    confidence: float
    megadetector_confidence: Optional[float] = None
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2]")
    crop_path: Optional[str] = None
    species: Optional[SpeciesResultSchema] = None
    reidentification: Optional[ReIDResultSchema] = None

class CameraTelemetrySchema(BaseModel):
    camera_id: str
    station_name: str
    range_zone: str
    latitude: float
    longitude: float
    location_type: str = "DEMO"
    status: str = "online"
    last_active: str
    total_captures: int = 0
    is_risk_zone: bool = False

class MovementEventSchema(BaseModel):
    event_id: str
    observation_id: str
    identity_id: str
    camera_id: str
    timestamp: str
    latitude: float
    longitude: float
    range_zone: str
    is_provisional: bool = False

class AlertSchema(BaseModel):
    alert_id: str
    alert_type: str
    severity: str
    title: str
    description: str
    identity_id: Optional[str] = None
    camera_id: Optional[str] = None
    observation_id: Optional[str] = None
    status: str = "OPEN"
    created_at: str

class DetectionResultResponse(BaseModel):
    image_id: str
    original_filename: str
    original_image: Optional[str] = None
    timestamp: str
    camera_id: str = "CAM-PNC-01"
    model: str = "MegaDetectorV6"
    model_version: str
    threshold: float
    status: str
    classification: str
    detections: List[DetectionItem]
    annotated_image: str
    movement_event: Optional[MovementEventSchema] = None
    generated_alerts: List[AlertSchema] = []
    reserve_metadata: Optional[Dict[str, str]] = None

class BatchDetectionResponse(BaseModel):
    total_images: int
    processed_images: int
    images_with_animals: int
    images_with_people: int
    images_with_vehicles: int
    blank_images: int
    results: List[DetectionResultResponse]

class ClassifyCropResponse(BaseModel):
    crop_path: str
    species: SpeciesResultSchema

class BatchAnalyzeSummary(BaseModel):
    total_images: int
    processed_images: int
    blank_images: int
    total_animals_detected: int
    tigers_count: int
    leopards_count: int
    deer_count: int
    gaur_count: int
    wild_boar_count: int
    other_wildlife_count: int
    reid_matched_tigers: int = 0
    reid_provisional_tigers: int = 0
    reid_ambiguous_tigers: int = 0
    low_confidence_count: int
    human_review_cases: int
    new_alerts_triggered: int = 0

class BatchAnalyzeResponse(BaseModel):
    summary: BatchAnalyzeSummary
    results: List[DetectionResultResponse]

class ProvisionalConversionRequest(BaseModel):
    provisional_id: str
    verified_id: str
    assigned_name: str
    sex: str
    territory: str
    reason: str
