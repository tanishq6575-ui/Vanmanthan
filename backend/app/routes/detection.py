import uuid
import shutil
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, File, UploadFile, HTTPException, status, Query, Form
from app.config import settings
from app.schemas import (
    HealthResponse,
    DetectionResultResponse,
    BatchDetectionResponse,
    ClassifyCropResponse,
    BatchAnalyzeResponse,
    BatchAnalyzeSummary,
    SpeciesResultSchema,
    TopPredictionItem,
    DetectionItem,
    ReIDResultSchema,
    ReIDCandidateItem,
    TigerProfileSchema,
    QualityAssessmentSchema,
    MovementEventSchema,
    AlertSchema
)
from app.services.megadetector_service import MegaDetectorService
from app.services.speciesnet_service import SpeciesNetService
from app.services.reid_service import ReIDService
from app.services.gallery_service import GalleryService
from app.services.movement_service import movement_service
from app.services.image_service import ImageService
from app.services.result_service import ResultService
from app.utils.logging_config import logger

router = APIRouter()

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}

def validate_image_extension(filename: str):
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
        )

@router.get("/health", response_model=HealthResponse)
def health_check():
    detector = MegaDetectorService()
    return HealthResponse(
        status="ok",
        model="MegaDetectorV6",
        model_version=settings.MEGADETECTOR_VERSION,
        speciesnet_enabled=settings.SPECIESNET_ENABLED,
        reid_enabled=settings.REID_ENABLED,
        reserve_name=settings.RESERVE_NAME,
        device=detector.device
    )

# ------------------------------------------------------------------
# PHASE 1 ENDPOINTS (Backward Compatibility Preserved)
# ------------------------------------------------------------------

@router.post("/api/detect", response_model=DetectionResultResponse)
async def detect_single(file: UploadFile = File(...)):
    validate_image_extension(file.filename)
    image_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()
    saved_filename = f"{image_id}{ext}"
    saved_path = settings.abs_upload_dir / saved_filename

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        detector = MegaDetectorService()
        predict_res = detector.predict(str(saved_path))
        raw_detections = predict_res["detections"]

        annotated_url, processed_detections = ImageService.process_image_visuals(
            image_path=saved_path,
            image_id=image_id,
            detections=raw_detections
        )

        result_json = ResultService.save_result_json(
            image_id=image_id,
            original_filename=file.filename,
            detections=processed_detections,
            annotated_image=annotated_url
        )

        return DetectionResultResponse(**result_json)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error processing image '{file.filename}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference failure: {str(e)}"
        )

@router.post("/api/detect/batch", response_model=BatchDetectionResponse)
async def detect_batch(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded for batch processing."
        )

    results: List[DetectionResultResponse] = []
    animals_count = 0
    people_count = 0
    vehicles_count = 0
    blank_count = 0

    detector = MegaDetectorService()

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        image_id = str(uuid.uuid4())
        saved_filename = f"{image_id}{ext}"
        saved_path = settings.abs_upload_dir / saved_filename

        try:
            with open(saved_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            predict_res = detector.predict(str(saved_path))
            raw_detections = predict_res["detections"]

            annotated_url, processed_detections = ImageService.process_image_visuals(
                image_path=saved_path,
                image_id=image_id,
                detections=raw_detections
            )

            result_json = ResultService.save_result_json(
                image_id=image_id,
                original_filename=file.filename,
                detections=processed_detections,
                annotated_image=annotated_url
            )

            result_obj = DetectionResultResponse(**result_json)
            results.append(result_obj)

            cats_in_img = set(d.category.lower() for d in result_obj.detections)
            if "animal" in cats_in_img:
                animals_count += 1
            if "person" in cats_in_img:
                people_count += 1
            if "vehicle" in cats_in_img:
                vehicles_count += 1
            if result_obj.classification == "blank":
                blank_count += 1

        except Exception as e:
            logger.error(f"Failed to process '{file.filename}': {str(e)}")
            continue

    return BatchDetectionResponse(
        total_images=len(files),
        processed_images=len(results),
        images_with_animals=animals_count,
        images_with_people=people_count,
        images_with_vehicles=vehicles_count,
        blank_images=blank_count,
        results=results
    )

# ------------------------------------------------------------------
# PHASE 2 & PHASE 3 & PHASE 4 UNIFIED ENDPOINT
# ------------------------------------------------------------------

@router.post("/api/classify", response_model=ClassifyCropResponse)
async def classify_crop(file: UploadFile = File(...)):
    validate_image_extension(file.filename)
    crop_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()
    saved_crop_file = settings.abs_crop_dir / f"standalone_{crop_id}{ext}"

    try:
        with open(saved_crop_file, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        classifier = SpeciesNetService()
        pred_res = classifier.predict_crop(str(saved_crop_file))

        top_preds = [TopPredictionItem(**item) for item in pred_res.get("top_predictions", [])]

        species_obj = SpeciesResultSchema(
            raw_label=pred_res["raw_label"],
            display_label=pred_res["display_label"],
            confidence=pred_res["confidence"],
            status=pred_res["status"],
            human_review_required=pred_res["human_review_required"],
            model="SpeciesNet",
            top_predictions=top_preds
        )

        return ClassifyCropResponse(
            crop_path=f"/crops/standalone_{crop_id}{ext}",
            species=species_obj
        )
    except Exception as e:
        logger.error(f"Failed to classify crop '{file.filename}': {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SpeciesNet classification error: {str(e)}"
        )

@router.post("/api/analyze", response_model=DetectionResultResponse)
async def analyze_single(
    file: UploadFile = File(...),
    camera_id: Optional[str] = Form("CAM-PNC-01")
):
    """
    Complete Scientific Pipeline:
    Camera Trap Photo -> MegaDetector V6 -> Animal Crop -> SpeciesNet -> Tiger? -> MiewID / Open-Set Re-ID -> Verified/Provisional Match -> Phase 4 Movement & Anomaly Alerting
    """
    validate_image_extension(file.filename)
    image_id = str(uuid.uuid4())
    ext = Path(file.filename).suffix.lower()
    saved_filename = f"{image_id}{ext}"
    saved_path = settings.abs_upload_dir / saved_filename

    try:
        with open(saved_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. MegaDetector V6 Object Detection
        detector = MegaDetectorService()
        predict_res = detector.predict(str(saved_path))
        raw_detections = predict_res["detections"]

        # 2. Draw bounding boxes & crop animals
        annotated_url, processed_detections = ImageService.process_image_visuals(
            image_path=saved_path,
            image_id=image_id,
            detections=raw_detections
        )

        species_classifier = SpeciesNetService()
        reid_encoder = ReIDService()
        gallery_db = GalleryService()

        final_detections: List[Dict[str, Any]] = []
        movement_event_result = None
        generated_alerts: List[Dict[str, Any]] = []

        for idx, det in enumerate(processed_detections):
            det_id = f"{image_id}_det_{idx}"
            det_copy = dict(det)
            det_copy["detection_id"] = det_id
            det_copy["megadetector_confidence"] = det.get("confidence")

            crop_url = det.get("crop_path")
            if det.get("category") == "animal" and crop_url:
                abs_crop_file = settings.abs_crop_dir / Path(crop_url).name
                if not abs_crop_file.exists():
                    abs_crop_file = settings.BASE_DIR / crop_url.lstrip("/")

                target_predict_file = str(abs_crop_file) if abs_crop_file.exists() else str(saved_path)

                # Quality Assessment Pre-Check
                quality_res = reid_encoder.assess_image_quality(target_predict_file)

                # Step 3A: Google SpeciesNet Classification
                try:
                    sp_res = species_classifier.predict_crop(target_predict_file)
                    if sp_res.get("display_label") in ["SPECIES_NOT_CONFIRMED", "No Cv Result", "Blank"] and saved_path.exists():
                        fallback_res = species_classifier.predict_crop(str(saved_path))
                        if fallback_res.get("display_label") not in ["SPECIES_NOT_CONFIRMED", "No Cv Result", "Blank"]:
                            sp_res = fallback_res

                    det_copy["species"] = sp_res
                except Exception as err:
                    logger.error(f"SpeciesNet predict failed for crop {crop_url}: {str(err)}")
                    sp_res = {
                        "raw_label": "Unknown",
                        "display_label": "SPECIES_NOT_CONFIRMED",
                        "confidence": 0.0,
                        "status": "HUMAN_REVIEW_REQUIRED",
                        "human_review_required": True,
                        "model": "SpeciesNet",
                        "top_predictions": []
                    }
                    det_copy["species"] = sp_res

                # Step 3B: Open-Set Individual Tiger Re-ID
                is_tiger = sp_res.get("display_label", "").lower() == "tiger" or "tigris" in sp_res.get("raw_label", "").lower()

                if is_tiger and settings.REID_ENABLED:
                    logger.info(f"Tiger detected! Executing Open-Set Re-ID on: {target_predict_file}")
                    try:
                        embedding = reid_encoder.extract_embedding(target_predict_file)
                        reid_match = gallery_db.search(
                            query_embedding=embedding,
                            query_image_path=target_predict_file,
                            crop_path=crop_url,
                            image_id=image_id
                        )
                        reid_match["quality_assessment"] = quality_res
                        det_copy["reidentification"] = reid_match

                        if reid_match.get("human_review_required"):
                            det_copy["species"]["human_review_required"] = True

                        # Step 4: Record Phase 4 Movement & Anomaly Alert
                        assigned_id = reid_match.get("identity_id") or "PENCH-UNVERIFIED-001"
                        is_prov = reid_match.get("is_provisional", False)
                        photo_url = crop_url or annotated_url or f"/uploads/{saved_filename}"
                        m_event, m_alerts = movement_service.record_tiger_sighting(
                            observation_id=image_id,
                            identity_id=assigned_id,
                            camera_id=camera_id or "CAM-PNC-01",
                            image_url=photo_url,
                            is_provisional=is_prov
                        )
                        movement_event_result = m_event
                        generated_alerts.extend(m_alerts)

                    except Exception as reid_err:
                        logger.error(f"Open-Set Re-ID error on {target_predict_file}: {str(reid_err)}", exc_info=True)
                        det_copy["reidentification"] = {
                            "status": "NEW_PROVISIONAL",
                            "identity_id": "PENCH-UNVERIFIED-001",
                            "similarity_score": 0.0,
                            "is_provisional": True,
                            "human_review_required": True,
                            "quality_assessment": quality_res,
                            "message": f"Re-ID provisional assignment: {str(reid_err)}",
                            "tiger_profile": None,
                            "top_candidates": []
                        }
                        photo_url = crop_url or annotated_url or f"/uploads/{saved_filename}"
                        m_event, m_alerts = movement_service.record_tiger_sighting(
                            observation_id=image_id,
                            identity_id="PENCH-UNVERIFIED-001",
                            camera_id=camera_id or "CAM-PNC-01",
                            image_url=photo_url,
                            is_provisional=True
                        )
                        movement_event_result = m_event
                        generated_alerts.extend(m_alerts)
                else:
                    det_copy["reidentification"] = {
                        "status": "NOT_APPLICABLE",
                        "identity_id": None,
                        "similarity_score": 0.0,
                        "is_provisional": False,
                        "human_review_required": False,
                        "quality_assessment": quality_res,
                        "message": "Re-ID not applicable (non-tiger species)",
                        "tiger_profile": None,
                        "top_candidates": []
                    }

            final_detections.append(det_copy)

        # Save result JSON
        result_json = ResultService.save_result_json(
            image_id=image_id,
            original_filename=file.filename,
            detections=final_detections,
            annotated_image=annotated_url
        )

        result_json["camera_id"] = camera_id or "CAM-PNC-01"
        result_json["movement_event"] = movement_event_result
        result_json["generated_alerts"] = generated_alerts
        result_json["reserve_metadata"] = {
            "reserve_name": settings.RESERVE_NAME,
            "state": settings.STATE,
            "country": settings.COUNTRY
        }

        return DetectionResultResponse(**result_json)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during Phase 3/4 analysis of '{file.filename}': {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis pipeline error: {str(e)}"
        )

@router.post("/api/analyze/batch", response_model=BatchAnalyzeResponse)
async def analyze_batch(
    files: List[UploadFile] = File(...),
    camera_id: Optional[str] = Form("CAM-PNC-01")
):
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No files uploaded for batch analysis."
        )

    results: List[DetectionResultResponse] = []
    blank_count = 0
    total_animals = 0
    tigers_count = 0
    leopards_count = 0
    deer_count = 0
    gaur_count = 0
    wild_boar_count = 0
    other_wildlife_count = 0
    reid_matched = 0
    reid_provisional = 0
    reid_ambiguous = 0
    low_confidence_count = 0
    human_review_cases = 0
    total_alerts = 0

    for file in files:
        ext = Path(file.filename).suffix.lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue

        try:
            res_obj = await analyze_single(file, camera_id=camera_id)
            results.append(res_obj)

            if res_obj.classification == "blank":
                blank_count += 1

            total_alerts += len(res_obj.generated_alerts)

            for det in res_obj.detections:
                if det.category == "animal":
                    total_animals += 1
                    sp = det.species
                    if sp:
                        lbl = sp.display_label.lower()
                        if lbl == "tiger":
                            tigers_count += 1
                        elif lbl == "leopard":
                            leopards_count += 1
                        elif lbl == "deer":
                            deer_count += 1
                        elif lbl == "gaur":
                            gaur_count += 1
                        elif lbl == "wild boar":
                            wild_boar_count += 1
                        else:
                            other_wildlife_count += 1

                        if sp.status == "LOW_CONFIDENCE":
                            low_confidence_count += 1
                        if sp.human_review_required:
                            human_review_cases += 1

                    reid = det.reidentification
                    if reid:
                        if reid.status == "MATCHED":
                            reid_matched += 1
                        elif reid.status == "NEW_PROVISIONAL":
                            reid_provisional += 1
                        elif reid.status == "AMBIGUOUS":
                            reid_ambiguous += 1

        except Exception as e:
            logger.error(f"Batch analysis error on '{file.filename}': {str(e)}")
            continue

    summary = BatchAnalyzeSummary(
        total_images=len(files),
        processed_images=len(results),
        blank_images=blank_count,
        total_animals_detected=total_animals,
        tigers_count=tigers_count,
        leopards_count=leopards_count,
        deer_count=deer_count,
        gaur_count=gaur_count,
        wild_boar_count=wild_boar_count,
        other_wildlife_count=other_wildlife_count,
        reid_matched_tigers=reid_matched,
        reid_provisional_tigers=reid_provisional,
        reid_ambiguous_tigers=reid_ambiguous,
        low_confidence_count=low_confidence_count,
        human_review_cases=human_review_cases,
        new_alerts_triggered=total_alerts
    )

    return BatchAnalyzeResponse(
        summary=summary,
        results=results
    )
