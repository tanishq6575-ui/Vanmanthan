import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Radio, 
  Compass, 
  Eye, 
  AlertTriangle, 
  Maximize2, 
  Navigation, 
  Camera, 
  ShieldAlert,
  Play,
  Pause,
  RotateCcw,
  Info,
  ExternalLink
} from 'lucide-react';

export const RESERVE_PRESETS = {
  PENCH: {
    id: 'PENCH',
    name: 'Pench Tiger Reserve',
    state: 'Maharashtra / MP',
    center: [21.72, 79.28],
    zoom: 11,
    bounds: [
      [21.55, 79.12],
      [21.85, 79.42]
    ],
    corePolygon: [
      [21.79, 79.24],
      [21.83, 79.35],
      [21.74, 79.40],
      [21.68, 79.32],
      [21.70, 79.22]
    ],
    bufferPolygon: [
      [21.86, 79.16],
      [21.87, 79.44],
      [21.63, 79.43],
      [21.57, 79.25],
      [21.62, 79.15]
    ],
    fringeVillageZone: [
      [21.59, 79.16],
      [21.63, 79.20],
      [21.58, 79.26],
      [21.56, 79.18]
    ]
  },
  GOREWADA: {
    id: 'GOREWADA',
    name: 'Gorewada International Wildlife Park',
    state: 'Nagpur, Maharashtra',
    center: [21.205, 79.034],
    zoom: 13,
    bounds: [
      [21.18, 79.01],
      [21.23, 79.06]
    ],
    corePolygon: [
      [21.220, 79.025],
      [21.225, 79.045],
      [21.195, 79.050],
      [21.190, 79.028]
    ],
    bufferPolygon: [
      [21.235, 79.015],
      [21.238, 79.058],
      [21.182, 79.062],
      [21.178, 79.020]
    ],
    fringeVillageZone: [
      [21.185, 79.045],
      [21.192, 79.058],
      [21.180, 79.055]
    ]
  },
  TADOBA: {
    id: 'TADOBA',
    name: 'Tadoba Andhari Tiger Reserve',
    state: 'Chandrapur, Maharashtra',
    center: [20.25, 79.30],
    zoom: 11,
    bounds: [
      [20.10, 79.15],
      [20.40, 79.45]
    ],
    corePolygon: [
      [20.35, 79.25],
      [20.36, 79.38],
      [20.18, 79.39],
      [20.16, 79.23]
    ],
    bufferPolygon: [
      [20.39, 79.18],
      [20.40, 79.44],
      [20.11, 79.45],
      [20.10, 79.16]
    ],
    fringeVillageZone: [
      [20.14, 79.35],
      [20.17, 79.42],
      [20.12, 79.40]
    ]
  }
};

export default function WildlifeLiveMap({
  cameras = [],
  observations = [],
  selectedTigerId = 'ALL',
  activeObservation = null,
  onSelectObservation,
  onSelectCamera,
  isReplaying = false,
  replayIndex = 0,
  recentUploadStation = null,
  currentUser
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const polylineLayerRef = useRef(null);
  const polygonLayerRef = useRef(null);
  const arrowsLayerRef = useRef(null);

  const [selectedReserve, setSelectedReserve] = useState('PENCH');
  const [mapTileType, setMapTileType] = useState('satellite');
  const [cursorCoords, setCursorCoords] = useState({ lat: 21.720, lng: 79.280 });
  const [showZones, setShowZones] = useState(true);

  const tileLayers = {
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    terrain: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
  };

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const preset = RESERVE_PRESETS[selectedReserve];
      const map = L.map(mapContainerRef.current, {
        center: preset.center,
        zoom: preset.zoom,
        zoomControl: false,
        attributionControl: false
      });

      L.control.zoom({ position: 'topright' }).addTo(map);

      const baseTile = L.tileLayer(tileLayers[mapTileType], {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(map);

      const polygonGroup = L.layerGroup().addTo(map);
      const markerGroup = L.layerGroup().addTo(map);
      const lineGroup = L.layerGroup().addTo(map);
      const arrowsGroup = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
      mapInstanceRef.current.baseTile = baseTile;
      polygonLayerRef.current = polygonGroup;
      layerGroupRef.current = markerGroup;
      polylineLayerRef.current = lineGroup;
      arrowsLayerRef.current = arrowsGroup;

      map.on('mousemove', (e) => {
        setCursorCoords({
          lat: Number(e.latlng.lat.toFixed(4)),
          lng: Number(e.latlng.lng.toFixed(4))
        });
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. Change Tile Layer Style
  useEffect(() => {
    if (mapInstanceRef.current && mapInstanceRef.current.baseTile) {
      mapInstanceRef.current.removeLayer(mapInstanceRef.current.baseTile);
      const newTile = L.tileLayer(tileLayers[mapTileType], {
        maxZoom: 18,
        subdomains: 'abcd'
      }).addTo(mapInstanceRef.current);
      mapInstanceRef.current.baseTile = newTile;
      newTile.bringToBack();
    }
  }, [mapTileType]);

  // 3. Switch National Park Presets & Render Boundaries
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const preset = RESERVE_PRESETS[selectedReserve];
    mapInstanceRef.current.flyTo(preset.center, preset.zoom, { duration: 1.2 });

    if (polygonLayerRef.current) {
      polygonLayerRef.current.clearLayers();

      if (showZones) {
        // Core Zone
        L.polygon(preset.corePolygon, {
          color: '#10b981',
          weight: 2,
          fillColor: '#10b981',
          fillOpacity: 0.12,
          dashArray: '4, 4'
        }).bindTooltip(`<strong>${preset.name} — Core Zone</strong>`, { sticky: true }).addTo(polygonLayerRef.current);

        // Buffer Zone
        L.polygon(preset.bufferPolygon, {
          color: '#f59e0b',
          weight: 1.5,
          fillColor: '#f59e0b',
          fillOpacity: 0.06,
          dashArray: '6, 6'
        }).bindTooltip(`<strong>${preset.name} — Buffer Range</strong>`, { sticky: true }).addTo(polygonLayerRef.current);

        // Fringe Village Risk Zone
        if (preset.fringeVillageZone) {
          L.polygon(preset.fringeVillageZone, {
            color: '#ef4444',
            weight: 2,
            fillColor: '#ef4444',
            fillOpacity: 0.22
          }).bindTooltip(`<strong>⚠️ Village Fringe Buffer Border</strong>`, { sticky: true }).addTo(polygonLayerRef.current);
        }
      }
    }
  }, [selectedReserve, showZones]);

  // 4. Render Fixed Geographic Camera Markers with Live Photo Simulation Popups
  useEffect(() => {
    if (!layerGroupRef.current || !mapInstanceRef.current) return;
    layerGroupRef.current.clearLayers();

    cameras.forEach(cam => {
      const isOnline = cam.status === 'online';
      const isRisk = cam.is_risk_zone;
      const isRecentStation = recentUploadStation === cam.camera_id;
      const markerColor = isRisk ? '#ef4444' : isOnline ? '#10b981' : '#6b7280';

      // Find latest observation recorded at this camera station
      const stationObs = observations.filter(o => o.camera_id === cam.camera_id);
      const latestObsAtCam = stationObs.length > 0 ? stationObs[stationObs.length - 1] : null;

      const customIcon = L.divIcon({
        className: 'custom-camera-station',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-4 h-4 rounded-full shadow-md transition-transform group-hover:scale-125 ${isRecentStation ? 'ring-4 ring-[#f59e0b] animate-bounce' : ''}" style="background-color: ${markerColor}; border: 2px solid white;"></div>
            <div class="absolute -bottom-3.5 text-[8px] font-mono font-bold px-1 rounded bg-[#030d09]/95 text-[#e5e7eb] border border-[#1b3d2f] whitespace-nowrap">
              ${cam.camera_id}
            </div>
            ${latestObsAtCam ? `
              <div class="absolute -top-3 right-0 w-2.5 h-2.5 rounded-full bg-[#f59e0b] border border-white" title="Active Sighting at Station"></div>
            ` : ''}
          </div>
        `,
        iconSize: [18, 18],
        iconAnchor: [9, 9]
      });

      const photoHtml = latestObsAtCam ? `
        <div class="mt-2 w-full aspect-video rounded-lg overflow-hidden border border-[#1b3d2f] bg-black relative flex items-center justify-center">
          <img src="${latestObsAtCam.image_url || latestObsAtCam.crop_path || '/crops/tiger_sample.jpg'}" alt="Sighting" class="w-full h-full object-cover" />
          <span class="absolute bottom-1 left-1 text-[7px] font-mono px-1 rounded bg-black/80 text-[#f59e0b] font-bold">
            ${latestObsAtCam.identity_id}
          </span>
        </div>
        <p class="text-[9px] text-[#f59e0b] font-bold mt-1">📸 Simulated Image Captured</p>
      ` : '';

      const marker = L.marker([cam.latitude, cam.longitude], { icon: customIcon })
        .bindPopup(`
          <div class="p-1 space-y-1 max-w-[200px]">
            <div class="font-black text-xs text-[#10b981] flex items-center justify-between">
              <span>${cam.station_name}</span>
              <span class="text-[8px] uppercase px-1 py-0.2 rounded ${isOnline ? 'bg-[#10b981]/20 text-[#6ee7b7]' : 'bg-[#ef4444]/20 text-[#fca5a5]'}">${cam.status}</span>
            </div>
            <p class="text-[10px] text-[#cbd5e1]">Zone: <strong>${cam.range_zone}</strong></p>
            <p class="text-[9px] font-mono text-[#9ca3af]">GPS: ${cam.latitude.toFixed(4)}° N, ${cam.longitude.toFixed(4)}° E</p>
            <p class="text-[10px] text-[#f59e0b] font-bold">Total Captures: ${cam.total_captures}</p>
            ${photoHtml}
          </div>
        `);

      marker.on('click', () => {
        if (latestObsAtCam && onSelectObservation) {
          onSelectObservation(latestObsAtCam);
        } else if (onSelectCamera) {
          onSelectCamera(cam);
        }
      });

      marker.addTo(layerGroupRef.current);
    });
  }, [cameras, observations, recentUploadStation]);

  // 5. Draw Tiger Trajectory & Waypoint Markers
  useEffect(() => {
    if (!polylineLayerRef.current || !arrowsLayerRef.current || !mapInstanceRef.current) return;
    polylineLayerRef.current.clearLayers();
    arrowsLayerRef.current.clearLayers();

    const activeSlice = isReplaying 
      ? observations.slice(0, Math.max(1, replayIndex + 1))
      : observations;

    if (activeSlice.length === 0) return;

    const latlngs = activeSlice.map(o => [o.latitude, o.longitude]);

    if (activeSlice.length > 1) {
      const polyline = L.polyline(latlngs, {
        color: '#f59e0b',
        weight: 4,
        opacity: 0.95,
        dashArray: '8, 6',
        lineCap: 'round'
      }).addTo(polylineLayerRef.current);

      for (let i = 0; i < latlngs.length - 1; i++) {
        const p1 = latlngs[i];
        const p2 = latlngs[i + 1];
        const midLat = (p1[0] + p2[0]) / 2;
        const midLng = (p1[1] + p2[1]) / 2;

        const arrowIcon = L.divIcon({
          className: 'trajectory-arrow',
          html: `
            <div class="text-[#f59e0b] font-black text-xs transform -translate-x-1/2 -translate-y-1/2 drop-shadow-md">
              ▶
            </div>
          `,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        L.marker([midLat, midLng], { icon: arrowIcon, interactive: false }).addTo(arrowsLayerRef.current);
      }

      if (!isReplaying) {
        mapInstanceRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50], maxZoom: 14 });
      }
    } else if (activeSlice.length === 1 && !isReplaying) {
      mapInstanceRef.current.panTo([activeSlice[0].latitude, activeSlice[0].longitude]);
    }

    activeSlice.forEach((obs, idx) => {
      const isLatest = idx === activeSlice.length - 1;
      const isSelected = activeObservation?.observation_id === obs.observation_id;

      let markerHtml = '';

      if (isLatest) {
        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-7 h-7 rounded-full bg-[#ef4444] border-2 border-white shadow-xl pulsing-tiger-pin flex items-center justify-center text-[11px]">
              🐅
            </div>
            <div class="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[9px] font-black font-mono px-2 py-0.5 rounded-full bg-[#ef4444] text-white border border-white whitespace-nowrap shadow-lg animate-bounce">
              🔴 LAST SEEN
            </div>
            <div class="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[8px] font-mono font-bold px-1 rounded bg-[#030d09] text-[#f59e0b] border border-[#f59e0b]/40 whitespace-nowrap">
              ${obs.camera_id} (${new Date(obs.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
            </div>
          </div>
        `;
      } else {
        markerHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="w-4 h-4 rounded-full ${isSelected ? 'bg-[#f59e0b] ring-4 ring-[#f59e0b]/40' : 'bg-[#0a2018]'} border-2 border-[#f59e0b] flex items-center justify-center text-[8px] font-mono font-black text-[#f59e0b] shadow-md">
              ${idx + 1}
            </div>
            <div class="absolute -bottom-3.5 text-[8px] font-mono font-bold px-1 rounded bg-[#030d09] text-[#cbd5e1] border border-[#1b3d2f] whitespace-nowrap">
              ${obs.camera_id}
            </div>
          </div>
        `;
      }

      const waypointIcon = L.divIcon({
        className: 'obs-waypoint-marker',
        html: markerHtml,
        iconSize: isLatest ? [32, 32] : [20, 20],
        iconAnchor: isLatest ? [16, 16] : [10, 10]
      });

      const obsMarker = L.marker([obs.latitude, obs.longitude], { icon: waypointIcon });

      obsMarker.on('click', () => {
        if (onSelectObservation) onSelectObservation(obs);
      });

      obsMarker.bindTooltip(`
        <div class="p-0.5 text-xs">
          <strong>Step ${idx + 1}: ${obs.identity_id}</strong><br/>
          Camera: ${obs.station_name || obs.camera_id}<br/>
          Time: ${new Date(obs.timestamp).toLocaleString()}<br/>
          Zone: ${obs.range_zone}
        </div>
      `, { sticky: true });

      obsMarker.addTo(polylineLayerRef.current);
    });

  }, [observations, isReplaying, replayIndex, activeObservation]);

  return (
    <div className="relative w-full aspect-[16/9] min-h-[480px] bg-[#04100c] border border-[#1b3d2f] rounded-3xl overflow-hidden shadow-2xl flex flex-col">
      {/* Top Map Control HUD Bar */}
      <div className="absolute top-4 left-4 right-4 z-[400] flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="pointer-events-auto bg-[#071c14]/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#1b3d2f] shadow-xl flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#a7b4ab] pl-2 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#10b981]" />
            Reserve:
          </span>
          <select
            value={selectedReserve}
            onChange={(e) => setSelectedReserve(e.target.value)}
            className="bg-[#04100c] border border-[#1b3d2f] rounded-xl px-3 py-1 text-xs text-[#f5f2eb] font-bold focus:outline-none focus:border-[#10b981]"
          >
            <option value="PENCH">Pench Tiger Reserve (Maharashtra / MP)</option>
            <option value="GOREWADA">Gorewada International Wildlife Park (Nagpur)</option>
            <option value="TADOBA">Tadoba Andhari Tiger Reserve (Chandrapur)</option>
          </select>
        </div>

        <div className="pointer-events-auto bg-[#071c14]/95 backdrop-blur-md p-1.5 rounded-2xl border border-[#1b3d2f] shadow-xl flex items-center gap-2 text-xs">
          <div className="flex bg-[#04100c] rounded-xl p-0.5 border border-[#1b3d2f]">
            <button
              onClick={() => setMapTileType('satellite')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                mapTileType === 'satellite' ? 'bg-[#10b981] text-[#051a12]' : 'text-[#a7b4ab] hover:text-[#f5f2eb]'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapTileType('dark')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                mapTileType === 'dark' ? 'bg-[#10b981] text-[#051a12]' : 'text-[#a7b4ab] hover:text-[#f5f2eb]'
              }`}
            >
              Dark Grid
            </button>
            <button
              onClick={() => setMapTileType('terrain')}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                mapTileType === 'terrain' ? 'bg-[#10b981] text-[#051a12]' : 'text-[#a7b4ab] hover:text-[#f5f2eb]'
              }`}
            >
              Terrain
            </button>
          </div>

          <button
            onClick={() => setShowZones(!showZones)}
            className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
              showZones ? 'bg-[#10b981]/20 text-[#6ee7b7] border-[#10b981]/40' : 'bg-[#04100c] text-[#a7b4ab] border-[#1b3d2f]'
            }`}
          >
            GIS Zones
          </button>
        </div>
      </div>

      {/* Leaflet Map DOM Canvas */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0"></div>

      {/* Trajectory Sequence Scientific Disclaimer Notice */}
      <div className="absolute top-16 left-4 z-[400] pointer-events-none">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 bg-[#030d09]/90 backdrop-blur-md px-3 py-1 rounded-xl border border-[#1b3d2f] text-[10px] text-[#cbd5e1] shadow-lg">
          <Info className="w-3 h-3 text-[#f59e0b]" />
          <span>Observed Camera-to-Camera Sequence</span>
          <span className="text-[#6b7280] hidden sm:inline">(Chronological camera trap sequence, not physical path)</span>
        </div>
      </div>

      {/* Bottom Telemetry HUD Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-[400] pointer-events-none flex flex-wrap items-center justify-between gap-3">
        <div className="pointer-events-auto bg-[#071c14]/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-[#1b3d2f] shadow-xl text-xs text-[#cbd5e1] flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-ping"></span>
            <span className="text-[10px] text-[#a7b4ab] font-bold uppercase">GPS Telemetry:</span>
            <span className="font-mono text-[#10b981] font-bold">{cursorCoords.lat}° N, {cursorCoords.lng}° E</span>
          </div>
          <span className="text-[#4b5563]">|</span>
          <div className="text-[10px]">
            <span className="text-[#a7b4ab]">Waypoints:</span> <strong className="text-[#f59e0b] font-mono">{observations.length}</strong>
          </div>
        </div>

        <div className="pointer-events-auto bg-[#071c14]/95 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-[#1b3d2f] shadow-xl text-[10px] flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
            <span className="text-[#cbd5e1]">Camera</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[12px]">🐅</span>
            <span className="text-[#f59e0b]">Observation</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3.5 h-0.5 bg-[#f59e0b] border-t border-dashed border-[#f59e0b]"></span>
            <span className="text-[#f59e0b]">Trajectory Trail (▶)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444] animate-pulse"></span>
            <span className="text-[#fca5a5] font-black">Last Seen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
