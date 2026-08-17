import numpy as np
from typing import List, Dict, Any, Tuple

def compute_cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    """
    Computes cosine similarity between two unit-normalized embedding vectors.
    """
    norm_a = np.linalg.norm(vec_a)
    norm_b = np.linalg.norm(vec_b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(vec_a, vec_b) / (norm_a * norm_b))

def rank_candidates(query_emb: np.ndarray, gallery_records: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Ranks gallery identities by cosine similarity score to the query embedding.
    """
    ranked = []
    for rec in gallery_records:
        rec_emb = np.array(rec.get("embedding", []), dtype=np.float32)
        score = compute_cosine_similarity(query_emb, rec_emb)
        ranked.append({
            "identity_id": rec["identity_id"],
            "name": rec.get("name", rec["identity_id"]),
            "similarity_score": round(score, 4),
            "is_provisional": rec.get("is_provisional", False),
            "reference_image": rec.get("reference_image", "")
        })
    return sorted(ranked, key=lambda x: x["similarity_score"], reverse=True)
