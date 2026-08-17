import requests
import json
import time
from pathlib import Path

base_url = 'http://localhost:8000'

print('==================================================================')
print('LIVE WILDLIFE PLATFORM END-TO-END DEMONSTRATION')
print('==================================================================')

# 1. Health & Models
health = requests.get(f'{base_url}/health').json()
print('\n[1] PLATFORM HEALTH & MODEL REGISTRY:')
print(f"    Status:             {health['status'].upper()}")
print(f"    MegaDetector:       {health['model']} ({health['model_version']})")
print(f"    SpeciesNet:         {'ENABLED' if health['speciesnet_enabled'] else 'DISABLED'}")
print(f"    Open-Set Re-ID:     {'ENABLED' if health['reid_enabled'] else 'DISABLED'}")
print(f"    Reserve Deployment: {health['reserve_name']}")

# 2. Camera Grid Telemetry
cams = requests.get(f'{base_url}/api/movement/cameras').json()
print(f'\n[2] PENCH SPATIAL CAMERA NETWORK ({len(cams)} Stations):')
for c in cams[:4]:
    print(f"    - {c['camera_id']}: {c['station_name']} ({c['range_zone']}) -> Status: {c['status']} | Captures: {c['total_captures']}")

# 3. Live Pipeline Image Analysis
img_path = Path(__file__).resolve().parent.parent / "data" / "sample_images" / "tiger_test.jpg"
print(f'\n[3] INGESTING CAMERA TRAP IMAGE: {img_path.name}')
t0 = time.time()
with open(img_path, 'rb') as f:
    resp = requests.post(f'{base_url}/api/analyze', files={'file': ('camera_trap_01.jpg', f, 'image/jpeg')}, data={'camera_id': 'CAM-PNC-05'})
elapsed = time.time() - t0

res = resp.json()
print(f'    Processing Time:    {elapsed:.2f}s (HTTP {resp.status_code})')
print(f"    Image Observation:  {res['image_id']}")
print(f"    Camera Station:     {res['camera_id']}")

for det in res.get('detections', []):
    sp = det.get('species', {})
    reid = det.get('reidentification', {})
    qual = reid.get('quality_assessment', {})
    print(f"\n    --> Phase 1 (MegaDetector V6): Category = {det.get('category')} (Confidence: {det.get('confidence', 0)*100:.1f}%)")
    print(f"    --> Phase 2 (SpeciesNet):      Species = {sp.get('display_label')} ({sp.get('raw_label')}) | Confidence: {sp.get('confidence', 0)*100:.1f}%")
    print(f"    --> Image Quality Check:       {qual.get('quality')} (Blur Score: {qual.get('blur_score')}, Reliable: {qual.get('is_reliable')})")
    print(f"    --> Phase 3 (Open-Set Re-ID):  Status = {reid.get('status')} | Identity = {reid.get('identity_id')} | Similarity = {reid.get('similarity_score', 0)*100:.1f}% | Provisional = {reid.get('is_provisional')}")

# 4. Movement Event & Alerts
m_event = res.get('movement_event', {})
alerts = res.get('generated_alerts', [])
print(f'\n[4] PHASE 4 SPATIAL MOVEMENT & ANOMALY ENGINE:')
print(f"    Event ID:           {m_event.get('event_id')}")
print(f"    Coordinates:        {m_event.get('latitude')}° N, {m_event.get('longitude')}° E ({m_event.get('range_zone')})")
print(f"    Triggered Alerts:   {len(alerts)} alert(s)")
for a in alerts:
    print(f"    [!] [{a['severity']}] {a['title']}: {a['description']}")

print('\n==================================================================')
print('DEMO COMPLETE: All 4 phases operational and ready for demonstration!')
print('Frontend URL: http://localhost:3000')
print('Backend URL:  http://localhost:8000')
print('==================================================================')
