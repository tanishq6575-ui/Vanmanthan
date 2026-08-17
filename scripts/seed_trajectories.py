import sqlite3
import uuid
from datetime import datetime, timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DB_FILE = BASE_DIR / "wildlife_platform.db"

def seed_tiger_trajectories():
    conn = sqlite3.connect(str(DB_FILE))
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Recreate table with image_url
    cursor.execute("DROP TABLE IF EXISTS movement_events")
    cursor.execute("""
    CREATE TABLE movement_events (
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

    base_time = datetime.utcnow()
    t1 = (base_time - timedelta(hours=6, minutes=48)).strftime("%Y-%m-%d %H:%M:%S")
    t2 = (base_time - timedelta(hours=4, minutes=12)).strftime("%Y-%m-%d %H:%M:%S")
    t3 = (base_time - timedelta(hours=1, minutes=53)).strftime("%Y-%m-%d %H:%M:%S")
    t4 = (base_time - timedelta(minutes=28)).strftime("%Y-%m-%d %H:%M:%S")

    sample_crop = "/crops/tiger_sample.jpg"

    # Make sure tiger_identities exist
    tigers = [
        ('PENCH-T-023', 'Touriya Male / T-23', 'Male', 'Touriya Core to Khursapar Buffer', '2021-04-10', '2026-08-17', 4, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', base_time.isoformat()),
        ('PENCH-T-001', 'Collarwali / T-15', 'Female', 'Karmajhiri Core Zone', '2008-05-12', '2026-08-17', 142, 0, 1, 'Pench Tiger Reserve Field Research Unit', base_time.isoformat()),
        ('PENCH-T-002', 'Rayanakass / T-30', 'Male', 'Rayanakass & Chhindimatta Buffer', '2018-11-20', '2026-08-17', 89, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', base_time.isoformat()),
        ('PENCH-T-003', 'Langdi / T-20', 'Female', 'Ghumtara Meadow & Alikatta', '2015-03-10', '2026-06-19', 115, 0, 1, 'Pench Tiger Reserve Field Research Unit', base_time.isoformat()),
        ('PENCH-T-004', 'Baghini / T-04', 'Female', 'Touriya Core Range', '2019-02-14', '2026-08-02', 64, 0, 1, 'Pench Tiger Reserve Automated Camera Trap Survey', base_time.isoformat()),
        ('PENCH-T-005', 'Choti Mada / T-31', 'Female', 'Khursapar Zone', '2020-09-08', '2026-05-11', 51, 0, 1, 'Pench Tiger Reserve Field Research Unit', base_time.isoformat()),
        ('PENCH-UNVERIFIED-001', 'Provisional Male (Sillari Fringe)', 'Male', 'Sillari Village Border', '2026-08-16', '2026-08-17', 3, 1, 0, 'Automated Camera Trap Discovery', base_time.isoformat()),
        ('PENCH-UNVERIFIED-002', 'Provisional Sub-Adult', 'Unconfirmed', 'Khursapar Buffer', '2026-08-17', '2026-08-17', 2, 1, 0, 'Automated Camera Trap Discovery', base_time.isoformat())
    ]

    for t in tigers:
        cursor.execute("""
        INSERT INTO tiger_identities (identity_id, name, sex, territory, first_seen, last_seen, total_detections, is_provisional, verified, source, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(identity_id) DO UPDATE SET
            name = excluded.name,
            territory = excluded.territory,
            total_detections = excluded.total_detections,
            last_seen = excluded.last_seen
        """, t)

    # 1. PENCH-T-023 Trajectory: CAM-PNC-01 (14:12) -> CAM-PNC-04 (16:48) -> CAM-PNC-05 (19:07) -> CAM-PNC-06 (20:31 LAST SEEN)
    seed_events = [
        ("evt-t23-1", "obs-t23-1", "PENCH-T-023", "CAM-PNC-01", t1, 21.7584, 79.3142, "Karmajhiri Core", sample_crop, 0, t1),
        ("evt-t23-2", "obs-t23-2", "PENCH-T-023", "CAM-PNC-04", t2, 21.6521, 79.2218, "Touriya Core", sample_crop, 0, t2),
        ("evt-t23-3", "obs-t23-3", "PENCH-T-023", "CAM-PNC-05", t3, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 0, t3),
        ("evt-t23-4", "obs-t23-4", "PENCH-T-023", "CAM-PNC-06", t4, 21.5840, 79.1520, "Sillari Village Border", sample_crop, 0, t4),

        # 2. PENCH-T-001 Trajectory: CAM-PNC-01 -> CAM-PNC-03 -> CAM-PNC-04
        ("evt-t1-1", "obs-t1-1", "PENCH-T-001", "CAM-PNC-01", t1, 21.7584, 79.3142, "Karmajhiri Core", sample_crop, 0, t1),
        ("evt-t1-2", "obs-t1-2", "PENCH-T-001", "CAM-PNC-03", t2, 21.7892, 79.3510, "Ghumtara Meadow", sample_crop, 0, t2),
        ("evt-t1-3", "obs-t1-3", "PENCH-T-001", "CAM-PNC-04", t4, 21.6521, 79.2218, "Touriya Core", sample_crop, 0, t4),

        # 3. PENCH-T-002 Trajectory: CAM-PNC-02 -> CAM-PNC-07 -> CAM-PNC-05
        ("evt-t2-1", "obs-t2-1", "PENCH-T-002", "CAM-PNC-02", t1, 21.6941, 79.2831, "Rayanakass Buffer", sample_crop, 0, t1),
        ("evt-t2-2", "obs-t2-2", "PENCH-T-002", "CAM-PNC-07", t2, 21.7120, 79.3380, "Chhindimatta Range", sample_crop, 0, t2),
        ("evt-t2-3", "obs-t2-3", "PENCH-T-002", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 0, t4),

        # 4. PENCH-UNVERIFIED-001 Trajectory: CAM-PNC-06 -> CAM-PNC-05
        ("evt-u1-1", "obs-u1-1", "PENCH-UNVERIFIED-001", "CAM-PNC-06", t2, 21.5840, 79.1520, "Sillari Village Border", sample_crop, 1, t2),
        ("evt-u1-2", "obs-u1-2", "PENCH-UNVERIFIED-001", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 1, t4),

        # 5. PENCH-UNVERIFIED-002: Single Observation at CAM-PNC-05
        ("evt-u2-1", "obs-u2-1", "PENCH-UNVERIFIED-002", "CAM-PNC-05", t4, 21.6110, 79.1892, "Khursapar Buffer", sample_crop, 1, t4)
    ]

    cursor.executemany("""
    INSERT INTO movement_events (event_id, observation_id, identity_id, camera_id, timestamp, latitude, longitude, range_zone, image_url, is_provisional, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, seed_events)

    conn.commit()
    conn.close()
    print(f"Successfully seeded {len(seed_events)} chronological movement events across {len(tigers)} tiger identities.")

if __name__ == "__main__":
    seed_tiger_trajectories()
