import sqlite3
import json
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional
from app.config import settings
from app.utils.logging_config import logger

DB_FILE = settings.BASE_DIR / "wildlife_platform.db"

def get_db_connection():
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    logger.info("Initializing Wildlife Platform Database Schema (PostgreSQL + PostGIS + pgvector compatible)...")
    conn = get_db_connection()
    cursor = conn.cursor()

    # Drop old tables if columns changed
    tables = [
        "users", "images", "detections", "species_predictions", 
        "tiger_identities", "tiger_gallery", "observations", 
        "cameras", "movement_events", "alerts", "audit_logs", "reviews"
    ]
    
    try:
        cursor.execute("SELECT is_provisional FROM tiger_identities LIMIT 1")
    except sqlite3.OperationalError:
        logger.info("Upgrading SQLite schema with Open-Set Re-ID & Phase 4 tables...")
        for t in ["tiger_identities", "tiger_gallery", "observations", "cameras", "movement_events", "alerts"]:
            cursor.execute(f"DROP TABLE IF EXISTS {t}")
        conn.commit()

    # 1. Users Table (Google OAuth / OIDC)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        user_id TEXT PRIMARY KEY,
        google_subject_id TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'RESEARCHER',
        created_at TEXT NOT NULL,
        last_login TEXT NOT NULL
    );
    """)

    # 2. Images Table (Cloudflare R2 Object Reference)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS images (
        image_id TEXT PRIMARY KEY,
        user_id TEXT,
        r2_key TEXT NOT NULL,
        filename TEXT NOT NULL,
        checksum TEXT,
        content_type TEXT NOT NULL,
        size INTEGER,
        status TEXT DEFAULT 'uploaded',
        created_at TEXT NOT NULL
    );
    """)

    # 3. Detections Table (MegaDetector V6)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS detections (
        detection_id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        category TEXT NOT NULL,
        confidence REAL NOT NULL,
        bbox_json TEXT NOT NULL,
        crop_r2_key TEXT,
        quality_score TEXT DEFAULT 'GOOD',
        created_at TEXT NOT NULL
    );
    """)

    # 4. Species Predictions Table (Google SpeciesNet)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS species_predictions (
        prediction_id TEXT PRIMARY KEY,
        detection_id TEXT NOT NULL,
        raw_label TEXT NOT NULL,
        display_label TEXT NOT NULL,
        confidence REAL NOT NULL,
        status TEXT NOT NULL,
        human_review_required INTEGER DEFAULT 0,
        model TEXT DEFAULT 'SpeciesNet',
        created_at TEXT NOT NULL
    );
    """)

    # 5. Tiger Identities Table (Verified & Provisional)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tiger_identities (
        identity_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sex TEXT NOT NULL,
        territory TEXT NOT NULL,
        first_seen TEXT NOT NULL,
        last_seen TEXT NOT NULL,
        total_detections INTEGER DEFAULT 0,
        is_provisional INTEGER DEFAULT 0,
        verified INTEGER DEFAULT 1,
        source TEXT,
        created_at TEXT NOT NULL
    );
    """)

    # 6. Tiger Gallery Table (FAISS + pgvector representation)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS tiger_gallery (
        gallery_id TEXT PRIMARY KEY,
        identity_id TEXT NOT NULL,
        image_id TEXT,
        reference_image TEXT NOT NULL,
        embedding_json TEXT NOT NULL,
        is_provisional INTEGER DEFAULT 0,
        source TEXT NOT NULL,
        verified INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    );
    """)

    # 7. Observations Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS observations (
        observation_id TEXT PRIMARY KEY,
        image_id TEXT NOT NULL,
        camera_id TEXT DEFAULT 'CAM-PNC-01',
        reserve TEXT NOT NULL,
        state TEXT NOT NULL,
        country TEXT NOT NULL,
        latitude REAL,
        longitude REAL,
        detector_model TEXT NOT NULL,
        species_model TEXT NOT NULL,
        reid_model TEXT NOT NULL,
        species_label TEXT,
        reid_status TEXT NOT NULL,
        reid_identity_id TEXT,
        is_provisional INTEGER DEFAULT 0,
        similarity_score REAL DEFAULT 0.0,
        image_quality TEXT DEFAULT 'GOOD',
        human_review_required INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 8. Cameras Table (Spatial Sensors & Telemetry)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cameras (
        camera_id TEXT PRIMARY KEY,
        station_name TEXT NOT NULL,
        range_zone TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        location_type TEXT DEFAULT 'DEMO',
        status TEXT DEFAULT 'online',
        last_active TEXT NOT NULL,
        total_captures INTEGER DEFAULT 0,
        is_risk_zone INTEGER DEFAULT 0
    );
    """)

    # 9. Movement Events Table (Phase 4 PostGIS Spatial Timeline)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS movement_events (
        event_id TEXT PRIMARY KEY,
        observation_id TEXT NOT NULL,
        identity_id TEXT NOT NULL,
        camera_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        range_zone TEXT NOT NULL,
        image_url TEXT,
        is_provisional INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    );
    """)

    # 10. Alerts & Anomalies Table (Phase 4 Early Warning)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS alerts (
        alert_id TEXT PRIMARY KEY,
        alert_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        identity_id TEXT,
        camera_id TEXT,
        observation_id TEXT,
        status TEXT DEFAULT 'OPEN',
        created_at TEXT NOT NULL
    );
    """)

    # 11. Audit Logs Table (Scientific Claim & Provenance)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        log_id TEXT PRIMARY KEY,
        user_id TEXT,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details_json TEXT,
        ip_address TEXT,
        timestamp TEXT NOT NULL
    );
    """)

    # 12. Identity Reviews & Conversion Workflow Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        review_id TEXT PRIMARY KEY,
        observation_id TEXT,
        provisional_id TEXT,
        verified_id TEXT,
        original_prediction TEXT NOT NULL,
        corrected_identity TEXT NOT NULL,
        reviewer TEXT NOT NULL,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'APPROVED',
        review_timestamp TEXT NOT NULL
    );
    """)

    # Seed Default Users if empty
    cursor.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO users (user_id, google_subject_id, email, display_name, role, created_at, last_login)
        VALUES 
            ('usr-admin-01', 'google-sub-admin', 'admin.pench@forest.gov.in', 'Dr. Rajesh Sharma (Field Director)', 'ADMIN', ?, ?),
            ('usr-officer-01', 'google-sub-officer', 'dfo.pench@forest.gov.in', 'Shri V. S. Chauhan (DFO Core)', 'FOREST_OFFICER', ?, ?),
            ('usr-research-01', 'google-sub-research', 'anita.biologist@pench-wildlife.org', 'Dr. Anita Roy (Lead Biologist)', 'RESEARCHER', ?, ?),
            ('usr-viewer-01', 'google-sub-viewer', 'field.ranger@forest.gov.in', 'Pench Field Ranger Unit', 'VIEWER', ?, ?)
        """, (now_str, now_str, now_str, now_str, now_str, now_str, now_str, now_str))

    # Seed Demo Pench Camera Network if empty
    cursor.execute("SELECT COUNT(*) FROM cameras")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO cameras (camera_id, station_name, range_zone, latitude, longitude, location_type, status, last_active, total_captures, is_risk_zone)
        VALUES 
            ('CAM-PNC-01', 'Karmajhiri Core Station 01', 'Karmajhiri Core', 21.7584, 79.3142, 'DEMO', 'online', ?, 342, 0),
            ('CAM-PNC-02', 'Rayanakass Waterhole Cam', 'Rayanakass Buffer', 21.6941, 79.2831, 'DEMO', 'online', ?, 218, 0),
            ('CAM-PNC-03', 'Ghumtara Meadow North Cam', 'Ghumtara Meadow', 21.7892, 79.3510, 'DEMO', 'online', ?, 412, 0),
            ('CAM-PNC-04', 'Touriya Trail Cam 04', 'Touriya Core', 21.6521, 79.2218, 'DEMO', 'online', ?, 189, 0),
            ('CAM-PNC-05', 'Khursapar Frontier Cam 05', 'Khursapar Buffer', 21.6110, 79.1892, 'DEMO', 'online', ?, 156, 1),
            ('CAM-PNC-06', 'Sillari Fringe Buffer Station', 'Sillari Village Border', 21.5840, 79.1520, 'DEMO', 'online', ?, 94, 1),
            ('CAM-PNC-07', 'Chhindimatta Riverbed Cam', 'Chhindimatta Range', 21.7120, 79.3380, 'DEMO', 'offline', ?, 62, 0)
        """, (now_str, now_str, now_str, now_str, now_str, now_str, now_str))

    # Seed Verified Pench Tigers if empty
    cursor.execute("SELECT COUNT(*) FROM tiger_identities")
    if cursor.fetchone()[0] == 0:
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
        INSERT INTO tiger_identities (identity_id, name, sex, territory, first_seen, last_seen, total_detections, is_provisional, verified, source, created_at)
        VALUES 
            ('PENCH-T-001', 'Collarwali / T-15', 'Female', 'Karmajhiri Core Zone', '2008-05-12', '2026-08-17', 142, 0, 1, 'Pench Tiger Reserve Field Research Unit', ?),
            ('PENCH-T-002', 'Rayanakass / T-30', 'Male', 'Rayanakass & Chhindimatta Buffer', '2018-11-20', '2026-08-17', 89, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', ?),
            ('PENCH-T-003', 'Langdi / T-20', 'Female', 'Ghumtara Meadow & Alikatta', '2015-03-10', '2026-06-19', 115, 0, 1, 'Pench Tiger Reserve Field Research Unit', ?),
            ('PENCH-T-004', 'Baghini / T-04', 'Female', 'Touriya Core Range', '2019-02-14', '2026-08-02', 64, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', ?),
            ('PENCH-T-005', 'Choti Mada / T-31', 'Female', 'Khursapar Zone', '2020-09-08', '2026-05-11', 51, 0, 1, 'Pench Tiger Reserve Field Research Unit', ?),
            ('PENCH-T-023', 'Touriya Male / T-23', 'Male', 'Touriya Core to Khursapar Buffer', '2021-04-10', '2026-08-17', 38, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', ?),
            ('PENCH-UNVERIFIED-001', 'Provisional Male (Sillari Fringe)', 'Male', 'Sillari Village Border', '2026-08-16', '2026-08-17', 3, 1, 0, 'Automated Camera Trap Discovery', ?),
            ('PENCH-UNVERIFIED-002', 'Provisional Sub-Adult', 'Unconfirmed', 'Khursapar Buffer', '2026-08-17', '2026-08-17', 2, 1, 0, 'Automated Camera Trap Discovery', ?)
        """, (now_str, now_str, now_str, now_str, now_str, now_str, now_str, now_str))

    # Seed Chronological Historical Trajectory Sightings if empty
    cursor.execute("SELECT COUNT(*) FROM movement_events")
    if cursor.fetchone()[0] == 0:
        base_time = datetime.utcnow()
        t1 = (base_time - timedelta(hours=8)).strftime("%Y-%m-%d %H:%M:%S")
        t2 = (base_time - timedelta(hours=5, minutes=20)).strftime("%Y-%m-%d %H:%M:%S")
        t3 = (base_time - timedelta(hours=2, minutes=10)).strftime("%Y-%m-%d %H:%M:%S")
        t4 = (base_time - timedelta(minutes=45)).strftime("%Y-%m-%d %H:%M:%S")

        sample_crop = "/crops/tiger_sample.jpg"

        seed_events = [
            # PENCH-T-023 Trajectory: CAM-01 (14:12) -> CAM-04 (16:48) -> CAM-05 (19:07)
            ("evt-t23-1", "obs-t23-1", "PENCH-T-023", "CAM-PNC-01", t1, 21.7584, 79.3142, "Karmajhiri Core", sample_crop, 0),
            ("evt-t23-2", "obs-t23-2", "PENCH-T-023", "CAM-PNC-04", t2, 21.6521, 79.2218, "Touriya Core", sample_crop, 0),
            ("evt-t23-3", "obs-t23-3", "PENCH-T-023", "CAM-PNC-05", t3, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 0),
            ("evt-t23-4", "obs-t23-4", "PENCH-T-023", "CAM-PNC-06", t4, 21.5840, 79.1520, "Sillari Village Border", sample_crop, 0),

            # PENCH-T-001 Trajectory: CAM-01 -> CAM-03 -> CAM-04
            ("evt-t1-1", "obs-t1-1", "PENCH-T-001", "CAM-PNC-01", t1, 21.7584, 79.3142, "Karmajhiri Core", sample_crop, 0),
            ("evt-t1-2", "obs-t1-2", "PENCH-T-001", "CAM-PNC-03", t2, 21.7892, 79.3510, "Ghumtara Meadow", sample_crop, 0),
            ("evt-t1-3", "obs-t1-3", "PENCH-T-001", "CAM-PNC-04", t4, 21.6521, 79.2218, "Touriya Core", sample_crop, 0),

            # PENCH-T-002 Trajectory: CAM-02 -> CAM-07 -> CAM-05
            ("evt-t2-1", "obs-t2-1", "PENCH-T-002", "CAM-PNC-02", t1, 21.6941, 79.2831, "Rayanakass Buffer", sample_crop, 0),
            ("evt-t2-2", "obs-t2-2", "PENCH-T-002", "CAM-PNC-07", t2, 21.7120, 79.3380, "Chhindimatta Range", sample_crop, 0),
            ("evt-t2-3", "obs-t2-3", "PENCH-T-002", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 0),

            # PENCH-UNVERIFIED-001 Trajectory: CAM-06 -> CAM-05
            ("evt-u1-1", "obs-u1-1", "PENCH-UNVERIFIED-001", "CAM-PNC-06", t2, 21.5840, 79.1520, "Sillari Village Border", sample_crop, 1),
            ("evt-u1-2", "obs-u1-2", "PENCH-UNVERIFIED-001", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 1),

            # PENCH-UNVERIFIED-002: Single Observation at CAM-05
            ("evt-u2-1", "obs-u2-1", "PENCH-UNVERIFIED-002", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 1)
        ]

        cursor.executemany("""
        INSERT INTO movement_events (event_id, observation_id, identity_id, camera_id, timestamp, latitude, longitude, range_zone, image_url, is_provisional, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, [(e[0], e[1], e[2], e[3], e[4], e[5], e[6], e[7], e[8], e[9], e[4]) for e in seed_events])

    conn.commit()
    conn.close()
    logger.info("Database schema initialized with Open-Set Re-ID & Phase 4 Movement structures.")
