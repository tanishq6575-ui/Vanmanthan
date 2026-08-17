import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from app.db.database import get_db_connection
from app.services.audit_service import audit_service
from app.utils.logging_config import logger

class MovementService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MovementService, cls).__new__(cls)
        return cls._instance

    def record_tiger_sighting(
        self,
        observation_id: str,
        identity_id: str,
        camera_id: str,
        image_url: Optional[str] = None,
        is_provisional: bool = False
    ) -> Tuple[Dict[str, Any], List[Dict[str, Any]]]:
        """
        Records a spatial tiger movement event and evaluates real-time anomaly early warning rules.
        """
        conn = get_db_connection()
        now_str = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # 1. Fetch camera coordinates
        cam_row = conn.execute("SELECT * FROM cameras WHERE camera_id = ?", (camera_id,)).fetchone()
        if not cam_row:
            cam_row = conn.execute("SELECT * FROM cameras LIMIT 1").fetchone()

        lat = cam_row["latitude"] if cam_row else 21.7584
        lng = cam_row["longitude"] if cam_row else 79.3142
        range_zone = cam_row["range_zone"] if cam_row else "Karmajhiri Core"
        is_risk = bool(cam_row["is_risk_zone"]) if cam_row else False

        # 2. Update camera last_active and total_captures
        conn.execute("""
        UPDATE cameras 
        SET last_active = ?, total_captures = total_captures + 1 
        WHERE camera_id = ?
        """, (now_str, cam_row["camera_id"]))

        # 3. Check previous camera history for this tiger
        prev_sightings = conn.execute("""
        SELECT camera_id, timestamp, latitude, longitude 
        FROM movement_events 
        WHERE identity_id = ? 
        ORDER BY timestamp DESC
        """, (identity_id,)).fetchall()

        # 4. Insert new movement event
        event_id = str(uuid.uuid4())
        conn.execute("""
        INSERT INTO movement_events (event_id, observation_id, identity_id, camera_id, timestamp, latitude, longitude, range_zone, image_url, is_provisional, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (event_id, observation_id, identity_id, cam_row["camera_id"], now_str, lat, lng, range_zone, image_url, 1 if is_provisional else 0, now_str))

        # 5. Evaluate Early Warning Anomaly Rules
        generated_alerts = []

        # Rule A: New Provisional Individual Alert
        if is_provisional:
            alert_id = str(uuid.uuid4())
            title = f"NEW PROVISIONAL TIGER SIGHTING: {identity_id}"
            desc = f"First-time uncatalogued tiger detected at station {cam_row['station_name']} ({range_zone}). Action: Forest Officer & Biologist review required."
            conn.execute("""
            INSERT INTO alerts (alert_id, alert_type, severity, title, description, identity_id, camera_id, observation_id, status, created_at)
            VALUES (?, 'NEW_INDIVIDUAL', 'HIGH', ?, ?, ?, ?, ?, 'OPEN', ?)
            """, (alert_id, title, desc, identity_id, cam_row["camera_id"], observation_id, now_str))
            generated_alerts.append({
                "alert_id": alert_id,
                "alert_type": "NEW_INDIVIDUAL",
                "severity": "HIGH",
                "title": title,
                "description": desc,
                "identity_id": identity_id,
                "camera_id": cam_row["camera_id"],
                "observation_id": observation_id,
                "status": "OPEN",
                "created_at": now_str
            })

        # Rule B: Village / Fringe Buffer Proximity Alert
        if is_risk:
            alert_id = str(uuid.uuid4())
            title = f"HUMAN-WILDLIFE BUFFER PROXIMITY: {identity_id}"
            desc = f"Tiger {identity_id} detected at high-risk fringe station {cam_row['station_name']} ({range_zone}). Deploy field monitoring unit."
            conn.execute("""
            INSERT INTO alerts (alert_id, alert_type, severity, title, description, identity_id, camera_id, observation_id, status, created_at)
            VALUES (?, 'VILLAGE_PROXIMITY', 'CRITICAL', ?, ?, ?, ?, ?, 'OPEN', ?)
            """, (alert_id, title, desc, identity_id, cam_row["camera_id"], observation_id, now_str))
            generated_alerts.append({
                "alert_id": alert_id,
                "alert_type": "VILLAGE_PROXIMITY",
                "severity": "CRITICAL",
                "title": title,
                "description": desc,
                "identity_id": identity_id,
                "camera_id": cam_row["camera_id"],
                "observation_id": observation_id,
                "status": "OPEN",
                "created_at": now_str
            })

        # Rule C: New Station Territory Expansion Alert
        past_cameras = set(r["camera_id"] for r in prev_sightings)
        if len(past_cameras) > 0 and cam_row["camera_id"] not in past_cameras:
            alert_id = str(uuid.uuid4())
            title = f"TERRITORY EXPANSION / NEW STATION: {identity_id}"
            desc = f"Tiger {identity_id} observed at {cam_row['station_name']} ({range_zone}) for the first time in historical monitoring."
            conn.execute("""
            INSERT INTO alerts (alert_id, alert_type, severity, title, description, identity_id, camera_id, observation_id, status, created_at)
            VALUES (?, 'NEW_STATION', 'MEDIUM', ?, ?, ?, ?, ?, 'OPEN', ?)
            """, (alert_id, title, desc, identity_id, cam_row["camera_id"], observation_id, now_str))
            generated_alerts.append({
                "alert_id": alert_id,
                "alert_type": "NEW_STATION",
                "severity": "MEDIUM",
                "title": title,
                "description": desc,
                "identity_id": identity_id,
                "camera_id": cam_row["camera_id"],
                "observation_id": observation_id,
                "status": "OPEN",
                "created_at": now_str
            })

        # Update tiger last_seen date & count
        conn.execute("""
        UPDATE tiger_identities
        SET last_seen = ?, total_detections = total_detections + 1
        WHERE identity_id = ?
        """, (now_str[:10], identity_id))

        conn.commit()
        conn.close()

        movement_event_dict = {
            "event_id": event_id,
            "observation_id": observation_id,
            "identity_id": identity_id,
            "camera_id": cam_row["camera_id"],
            "timestamp": now_str,
            "latitude": lat,
            "longitude": lng,
            "range_zone": range_zone,
            "image_url": image_url,
            "is_provisional": is_provisional
        }

        return movement_event_dict, generated_alerts

    def get_tiger_trajectory(self, identity_id: str) -> Dict[str, Any]:
        """
        Returns chronological camera-to-camera observations and a GeoJSON LineString.
        """
        conn = get_db_connection()
        tiger_row = conn.execute("SELECT * FROM tiger_identities WHERE identity_id = ?", (identity_id,)).fetchone()
        is_prov = bool(tiger_row["is_provisional"]) if tiger_row else identity_id.startswith("PENCH-UNVERIFIED")

        rows = conn.execute("""
        SELECT me.*, c.station_name, c.location_type, c.is_risk_zone
        FROM movement_events me
        LEFT JOIN cameras c ON me.camera_id = c.camera_id
        WHERE me.identity_id = ?
        ORDER BY me.timestamp ASC
        """, (identity_id,)).fetchall()
        conn.close()

        observations = []
        for idx, r in enumerate(rows):
            obs = dict(r)
            obs["sequence_index"] = idx + 1
            obs["is_last_seen"] = (idx == len(rows) - 1)
            observations.append(obs)

        # Build GeoJSON LineString (GeoJSON coordinates are [longitude, latitude])
        geojson_linestring = {
            "type": "Feature",
            "properties": {
                "identity_id": identity_id,
                "identity_status": "PROVISIONAL" if is_prov else "VERIFIED",
                "total_waypoints": len(observations)
            },
            "geometry": {
                "type": "LineString",
                "coordinates": [[o["longitude"], o["latitude"]] for o in observations]
            }
        }

        # Calculate summary statistics
        first_obs = observations[0] if observations else None
        last_obs = observations[-1] if observations else None

        elapsed_str = "0m"
        if first_obs and last_obs and len(observations) > 1:
            try:
                t_first = datetime.fromisoformat(first_obs["timestamp"].replace(" ", "T"))
                t_last = datetime.fromisoformat(last_obs["timestamp"].replace(" ", "T"))
                delta = t_last - t_first
                hours, remainder = divmod(int(delta.total_seconds()), 3600)
                minutes, _ = divmod(remainder, 60)
                elapsed_str = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"
            except Exception:
                elapsed_str = "Recent"

        summary = {
            "identity_id": identity_id,
            "name": tiger_row["name"] if tiger_row else identity_id,
            "identity_status": "PROVISIONAL" if is_prov else "VERIFIED",
            "total_observations": len(observations),
            "first_seen": first_obs["timestamp"] if first_obs else "N/A",
            "last_seen": last_obs["timestamp"] if last_obs else "N/A",
            "first_camera": first_obs["camera_id"] if first_obs else "N/A",
            "last_camera": last_obs["camera_id"] if last_obs else "N/A",
            "last_station_name": last_obs["station_name"] if last_obs else "N/A",
            "last_range_zone": last_obs["range_zone"] if last_obs else "N/A",
            "camera_sequence": [o["camera_id"] for o in observations],
            "elapsed_duration": elapsed_str
        }

        return {
            "identity_id": identity_id,
            "identity_status": "PROVISIONAL" if is_prov else "VERIFIED",
            "observations": observations,
            "geojson": geojson_linestring,
            "summary": summary
        }

    def get_active_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute("""
        SELECT a.*, c.station_name, c.range_zone 
        FROM alerts a
        LEFT JOIN cameras c ON a.camera_id = c.camera_id
        ORDER BY a.created_at DESC 
        LIMIT ?
        """, (limit,)).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def get_cameras_telemetry(self, user_role: str = "RESEARCHER") -> List[Dict[str, Any]]:
        conn = get_db_connection()
        rows = conn.execute("SELECT * FROM cameras ORDER BY camera_id ASC").fetchall()
        conn.close()
        result = []
        for r in rows:
            d = dict(r)
            if user_role.upper() == "VIEWER":
                d["latitude"] = round(d["latitude"], 2)
                d["longitude"] = round(d["longitude"], 2)
            result.append(d)
        return result

    def convert_provisional_to_verified(
        self,
        provisional_id: str,
        verified_id: str,
        assigned_name: str,
        sex: str,
        territory: str,
        reviewer_name: str,
        reason: str
    ) -> Dict[str, Any]:
        conn = get_db_connection()
        now_str = datetime.utcnow().isoformat()
        review_id = str(uuid.uuid4())

        prov_row = conn.execute("SELECT * FROM tiger_identities WHERE identity_id = ?", (provisional_id,)).fetchone()
        if not prov_row:
            conn.close()
            raise ValueError(f"Provisional identity '{provisional_id}' not found.")

        conn.execute("""
        INSERT INTO tiger_identities (identity_id, name, sex, territory, first_seen, last_seen, total_detections, is_provisional, verified, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, 'Promoted from Provisional Review', ?)
        ON CONFLICT(identity_id) DO UPDATE SET
            name = excluded.name,
            territory = excluded.territory,
            verified = 1,
            is_provisional = 0
        """, (verified_id, assigned_name, sex, territory, prov_row["first_seen"], prov_row["last_seen"], prov_row["total_detections"], now_str))

        conn.execute("""
        UPDATE tiger_gallery 
        SET identity_id = ?, is_provisional = 0, verified = 1
        WHERE identity_id = ?
        """, (verified_id, provisional_id))

        conn.execute("UPDATE observations SET reid_identity_id = ?, is_provisional = 0 WHERE reid_identity_id = ?", (verified_id, provisional_id))
        conn.execute("UPDATE movement_events SET identity_id = ?, is_provisional = 0 WHERE identity_id = ?", (verified_id, provisional_id))

        conn.execute("""
        INSERT INTO reviews (review_id, provisional_id, verified_id, original_prediction, corrected_identity, reviewer, reason, status, review_timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PROMOTED', ?)
        """, (review_id, provisional_id, verified_id, provisional_id, verified_id, reviewer_name, reason, now_str))

        conn.commit()
        conn.close()

        from app.services.gallery_service import GalleryService
        gal = GalleryService()
        gal._load_gallery()

        audit_service.log_event(
            action="provisional_identity_promoted",
            entity_type="tiger_identity",
            entity_id=verified_id,
            user_id=reviewer_name,
            details={
                "provisional_id": provisional_id,
                "verified_id": verified_id,
                "assigned_name": assigned_name,
                "reason": reason
            }
        )

        return {
            "status": "success",
            "provisional_id": provisional_id,
            "verified_id": verified_id,
            "message": f"Successfully verified {provisional_id} as {verified_id} ({assigned_name})."
        }

movement_service = MovementService()
