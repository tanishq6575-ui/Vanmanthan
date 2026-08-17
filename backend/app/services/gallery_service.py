import json
import uuid
import faiss
import hashlib
import numpy as np
from pathlib import Path
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.config import settings
from app.db.database import get_db_connection
from app.utils.logging_config import logger
from app.ml.reid.gallery import OpenSetReIDDecision, compute_image_sha256

class GalleryService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(GalleryService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.index = None
        self.gallery_records = []
        self.metadata = {}
        self.reference_hashes = {}  # sha256 -> identity_id
        self._load_gallery()
        self._initialized = True

    def _load_gallery(self):
        try:
            logger.info("Initializing Pench Tiger Open-Set Gallery Database (FAISS Vector Index)...")
            index_path = settings.abs_reid_model_dir / "gallery.index"
            records_path = settings.abs_reid_model_dir / "gallery_records.json"
            meta_path = settings.abs_pench_gallery_dir / "gallery_metadata.json"

            if not index_path.exists() or not records_path.exists():
                logger.warning("FAISS gallery index not found. Building gallery index now...")
                from scripts.build_gallery import build_gallery
                build_gallery()

            self.index = faiss.read_index(str(index_path))
            with open(records_path, "r", encoding="utf-8") as f:
                self.gallery_records = json.load(f)

            if meta_path.exists():
                with open(meta_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)

            # Compute sha256 hashes for all reference images
            self._compute_reference_hashes()

            # Load any provisional identities from DB
            self._sync_provisional_gallery_from_db()

            logger.info(f"Pench Tiger Gallery loaded: {self.index.ntotal} vectors across {len(self.gallery_records)} records.")
        except Exception as e:
            logger.error(f"Failed to load GalleryService: {str(e)}")
            raise e

    def _compute_reference_hashes(self):
        self.reference_hashes = {}
        for rec in self.gallery_records:
            ref_path = rec.get("reference_image", "")
            if ref_path:
                abs_p = settings.BASE_DIR / ref_path.lstrip("/")
                if abs_p.exists():
                    try:
                        h = compute_image_sha256(str(abs_p))
                        self.reference_hashes[h] = rec["identity_id"]
                    except Exception:
                        pass

    def _sync_provisional_gallery_from_db(self):
        try:
            conn = get_db_connection()
            prov_rows = conn.execute("""
            SELECT gallery_id, identity_id, reference_image, embedding_json, source, is_provisional
            FROM tiger_gallery
            WHERE is_provisional = 1
            """).fetchall()
            conn.close()

            for row in prov_rows:
                if any(r.get("identity_id") == row["identity_id"] for r in self.gallery_records):
                    continue
                emb = json.loads(row["embedding_json"])
                emb_vec = np.array([emb], dtype=np.float32)
                self.index.add(emb_vec)
                self.gallery_records.append({
                    "gallery_index": len(self.gallery_records),
                    "identity_id": row["identity_id"],
                    "name": f"Provisional Tiger ({row['identity_id']})",
                    "sex": "Unconfirmed",
                    "territory": "Unverified Sighting Zone",
                    "first_seen": datetime.utcnow().strftime("%Y-%m-%d"),
                    "last_seen": datetime.utcnow().strftime("%Y-%m-%d"),
                    "total_detections": 1,
                    "reference_image": row["reference_image"],
                    "source": row["source"],
                    "verified": False,
                    "is_provisional": True
                })
        except Exception as e:
            logger.warning(f"Could not sync provisional gallery from DB: {e}")

    def create_provisional_identity(
        self,
        query_embedding: np.ndarray,
        crop_path: str,
        image_id: str
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        count_row = conn.execute("SELECT COUNT(*) FROM tiger_identities WHERE is_provisional = 1").fetchone()
        next_num = (count_row[0] if count_row else 0) + 1
        prov_id = f"PENCH-UNVERIFIED-{next_num:03d}"
        now_str = datetime.utcnow().isoformat()
        date_str = datetime.utcnow().strftime("%Y-%m-%d")

        conn.execute("""
        INSERT INTO tiger_identities (identity_id, name, sex, territory, first_seen, last_seen, total_detections, is_provisional, verified, source, created_at)
        VALUES (?, ?, 'Unconfirmed', 'Pending Spatial Analysis', ?, ?, 1, 1, 0, 'Automated Camera Trap Discovery', ?)
        """, (prov_id, f"Provisional Tiger {prov_id}", date_str, date_str, now_str))

        gallery_id = str(uuid.uuid4())
        emb_list = query_embedding.tolist()
        conn.execute("""
        INSERT INTO tiger_gallery (gallery_id, identity_id, image_id, reference_image, embedding_json, is_provisional, source, verified, created_at)
        VALUES (?, ?, ?, ?, ?, 1, 'Provisional Camera Trap Capture', 0, ?)
        """, (gallery_id, prov_id, image_id, crop_path, json.dumps(emb_list), now_str))

        conn.commit()
        conn.close()

        emb_vec = np.array([query_embedding], dtype=np.float32)
        self.index.add(emb_vec)
        
        prov_profile = {
            "gallery_index": len(self.gallery_records),
            "identity_id": prov_id,
            "name": f"Provisional Tiger ({prov_id})",
            "sex": "Unconfirmed",
            "territory": "Pending Spatial Analysis",
            "first_seen": date_str,
            "last_seen": date_str,
            "total_detections": 1,
            "reference_image": crop_path,
            "source": "Automated Camera Trap Discovery",
            "verified": False,
            "is_provisional": True
        }
        self.gallery_records.append(prov_profile)
        logger.info(f"Created new provisional tiger identity: {prov_id}")
        return prov_profile

    def search(
        self,
        query_embedding: np.ndarray,
        query_image_path: Optional[str] = None,
        crop_path: Optional[str] = None,
        image_id: Optional[str] = None,
        threshold: Optional[float] = None,
        ambiguity_delta: Optional[float] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Open-Set Cosine Similarity Search with 4 States:
        1. VERIFIED_REFERENCE
        2. MATCHED
        3. AMBIGUOUS
        4. NEW_PROVISIONAL
        """
        if self.index is None:
            raise RuntimeError("Gallery index is not initialized.")

        match_threshold = threshold if threshold is not None else settings.REID_MATCH_THRESHOLD
        delta_threshold = ambiguity_delta if ambiguity_delta is not None else settings.REID_AMBIGUITY_DELTA

        query_vec = np.array([query_embedding], dtype=np.float32)
        norm = np.linalg.norm(query_vec)
        if norm > 0:
            query_vec = query_vec / norm

        num_results = min(top_k, self.index.ntotal)
        scores, indices = self.index.search(query_vec, num_results)

        scores = scores[0]
        indices = indices[0]

        identity_best = {}
        for rank_idx, (score, g_idx) in enumerate(zip(scores, indices)):
            if g_idx < 0 or g_idx >= len(self.gallery_records):
                continue
            rec = self.gallery_records[g_idx]
            id_str = rec["identity_id"]
            sim_score = float(score)

            if id_str not in identity_best or sim_score > identity_best[id_str]["similarity_score"]:
                identity_best[id_str] = {
                    "identity_id": id_str,
                    "name": rec.get("name", id_str),
                    "similarity_score": round(sim_score, 4),
                    "is_provisional": rec.get("is_provisional", False),
                    "reference_image": rec.get("reference_image", ""),
                    "profile": rec
                }

        sorted_candidates = sorted(identity_best.values(), key=lambda x: x["similarity_score"], reverse=True)

        top_candidates_summary = [
            {
                "identity_id": c["identity_id"],
                "name": c["name"],
                "similarity_score": c["similarity_score"],
                "is_provisional": c.get("is_provisional", False),
                "reference_image": c["reference_image"]
            }
            for c in sorted_candidates[:5]
        ]

        # Evaluate 4 identity states
        if query_image_path and Path(query_image_path).exists():
            eval_path = query_image_path
        elif crop_path:
            cand_p = settings.abs_crop_dir / Path(crop_path).name
            eval_path = str(cand_p) if cand_p.exists() else str(settings.BASE_DIR / crop_path.lstrip("/"))
        else:
            eval_path = ""
        decision = OpenSetReIDDecision.evaluate(
            query_image_path=eval_path,
            query_embedding=query_embedding,
            ranked_candidates=sorted_candidates,
            known_reference_hashes=self.reference_hashes,
            match_threshold=match_threshold,
            ambiguity_delta=delta_threshold
        )

        decision["top_candidates"] = top_candidates_summary

        if decision["status"] == "NEW_PROVISIONAL":
            prov_profile = self.create_provisional_identity(
                query_embedding=query_embedding,
                crop_path=crop_path or "/crops/placeholder.jpg",
                image_id=image_id or str(uuid.uuid4())
            )
            decision["identity_id"] = prov_profile["identity_id"]
            decision["tiger_profile"] = prov_profile
            decision["message"] = f"NEW PROVISIONAL INDIVIDUAL ({prov_profile['identity_id']}) — Cataloged for ongoing tracking."
        elif decision["status"] in ["MATCHED", "AMBIGUOUS", "VERIFIED_REFERENCE"]:
            matched_id = decision["identity_id"]
            matched_rec = next((r for r in self.gallery_records if r.get("identity_id") == matched_id), None)
            decision["tiger_profile"] = matched_rec

        return decision

gallery_service = GalleryService
