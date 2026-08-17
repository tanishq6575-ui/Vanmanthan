import hashlib
import json
import uuid
from pathlib import Path
from typing import Dict, Any, List, Optional
import numpy as np

def compute_image_sha256(image_path: str) -> str:
    if not image_path or not Path(image_path).exists():
        return ""
    h = hashlib.sha256()
    with open(image_path, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()

class OpenSetReIDDecision:
    @staticmethod
    def evaluate(
        query_image_path: Optional[str],
        query_embedding: np.ndarray,
        ranked_candidates: List[Dict[str, Any]],
        known_reference_hashes: Dict[str, str], # sha256 -> identity_id
        match_threshold: float = 0.70,
        ambiguity_delta: float = 0.03
    ) -> Dict[str, Any]:
        """
        Evaluates query against the 4 explicit identity states:
        1. VERIFIED_REFERENCE: Exact hash match against stored reference image
        2. MATCHED: Similarity >= match_threshold and delta >= ambiguity_delta
        3. AMBIGUOUS: Top 2 candidates have similarity delta < ambiguity_delta
        4. NEW_PROVISIONAL: Similarity < match_threshold
        """
        # 1. Exact Reference Verification (Cryptographic Image Match)
        if query_image_path and Path(query_image_path).exists():
            query_hash = compute_image_sha256(query_image_path)
            if query_hash and query_hash in known_reference_hashes:
                matched_id = known_reference_hashes[query_hash]
                return {
                    "status": "VERIFIED_REFERENCE",
                    "identity_id": matched_id,
                    "similarity_score": 1.0,
                    "is_provisional": False,
                    "human_review_required": False,
                    "message": f"VERIFIED REFERENCE IMAGE — Exact cryptographic hash match to {matched_id} gallery reference."
                }

        if not ranked_candidates or ranked_candidates[0]["similarity_score"] < match_threshold:
            # 4. NEW_PROVISIONAL
            return {
                "status": "NEW_PROVISIONAL",
                "identity_id": None, # Caller will assign next PENCH-UNVERIFIED-xxx
                "similarity_score": ranked_candidates[0]["similarity_score"] if ranked_candidates else 0.0,
                "is_provisional": True,
                "human_review_required": True,
                "message": f"NEW PROVISIONAL INDIVIDUAL — Best similarity below {match_threshold * 100:.1f}% threshold."
            }

        top_cand = ranked_candidates[0]
        top_score = top_cand["similarity_score"]
        top_id = top_cand["identity_id"]
        is_prov = top_cand.get("is_provisional", False)

        # 3. AMBIGUOUS
        if len(ranked_candidates) > 1 and (top_score - ranked_candidates[1]["similarity_score"]) < ambiguity_delta:
            diff = top_score - ranked_candidates[1]["similarity_score"]
            return {
                "status": "AMBIGUOUS",
                "identity_id": top_id,
                "similarity_score": top_score,
                "is_provisional": is_prov,
                "human_review_required": True,
                "message": f"AMBIGUOUS MATCH — Top candidates ({top_id}: {top_score * 100:.1f}% vs {ranked_candidates[1]['identity_id']}: {ranked_candidates[1]['similarity_score'] * 100:.1f}%, delta: {diff:.3f}) require human review."
            }

        # 2. MATCHED
        return {
            "status": "MATCHED",
            "identity_id": top_id,
            "similarity_score": top_score,
            "is_provisional": is_prov,
            "human_review_required": is_prov,
            "message": f"MATCHED — Confirmed identity {top_id} with {top_score * 100:.1f}% similarity."
        }
