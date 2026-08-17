import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  MapPin, 
  Compass, 
  AlertTriangle, 
  Clock, 
  ShieldAlert, 
  Radio, 
  Eye, 
  CheckCircle2, 
  XCircle,
  Filter,
  Navigation,
  Layers,
  ArrowRight,
  Maximize2,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Camera,
  Info,
  ShieldCheck,
  ChevronRight,
  UploadCloud,
  Sparkles,
  Zap
} from 'lucide-react';
import WildlifeLiveMap from '../components/WildlifeLiveMap';

export default function Phase4Page({ currentUser, results = [] }) {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tigerList, setTigerList] = useState([]);
  const [selectedTigerId, setSelectedTigerId] = useState('PENCH-T-023');
  
  const [trajectoryData, setTrajectoryData] = useState({
    identity_id: 'PENCH-T-023',
    identity_status: 'VERIFIED',
    observations: [],
    summary: {}
  });

  const [activeObservation, setActiveObservation] = useState(null);
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Buffer Station Simulation State
  const [targetSimCameraId, setTargetSimCameraId] = useState('CAM-PNC-06'); // Default to Sillari Buffer
  const [isSimulatingUpload, setIsSimulatingUpload] = useState(false);
  const [simUploadSuccess, setSimUploadSuccess] = useState(null);
  const [recentUploadStation, setRecentUploadStation] = useState(null);
  const fileInputRef = useRef(null);

  // Live Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  // 1. Initial Load of Cameras, Tigers, Alerts
  const refreshMovementData = () => {
    fetch('/api/movement/cameras')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCameras(data);
      })
      .catch(() => {});

    fetch('/api/movement/alerts')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAlerts(data);
      })
      .catch(() => {});

    fetch('/api/tigers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setTigerList(data);
          const exists = data.some(t => t.identity_id === selectedTigerId);
          if (!exists && data.length > 0) {
            setSelectedTigerId(data[0].identity_id);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    refreshMovementData();
  }, []);

  // 2. Fetch Tiger Trajectory when selectedTigerId changes
  const fetchTrajectory = (id) => {
    if (!id) return;
    fetch(`/api/tigers/${id}/trajectory`)
      .then(res => res.json())
      .then(data => {
        if (data && data.observations) {
          setTrajectoryData(data);
          if (data.observations.length > 0) {
            setActiveObservation(data.observations[data.observations.length - 1]);
          } else {
            setActiveObservation(null);
          }
        }
      })
      .catch(err => console.error("Could not fetch tiger trajectory:", err));
  };

  useEffect(() => {
    fetchTrajectory(selectedTigerId);
    setIsReplaying(false);
    setReplayIndex(0);
  }, [selectedTigerId]);

  // 3. Live Replay Timer Progression
  useEffect(() => {
    let timer;
    if (isReplaying) {
      timer = setInterval(() => {
        setReplayIndex(prev => {
          const obsCount = trajectoryData.observations.length;
          if (prev + 1 >= obsCount) {
            setIsReplaying(false);
            return obsCount - 1;
          }
          const nextIdx = prev + 1;
          setActiveObservation(trajectoryData.observations[nextIdx]);
          return nextIdx;
        });
      }, 1600);
    }
    return () => clearInterval(timer);
  }, [isReplaying, trajectoryData]);

  const handleStartReplay = () => {
    if (trajectoryData.observations.length <= 1) return;
    setReplayIndex(0);
    setIsReplaying(true);
    setActiveObservation(trajectoryData.observations[0]);
  };

  const handleStopReplay = () => {
    setIsReplaying(false);
  };

  const handleResetReplay = () => {
    setIsReplaying(false);
    setReplayIndex(0);
    if (trajectoryData.observations.length > 0) {
      setActiveObservation(trajectoryData.observations[trajectoryData.observations.length - 1]);
    }
  };

  // 4. Handle Direct Image Ingest Simulation at Buffer/Core Station
  const handleSimulateUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSimulatingUpload(true);
    setSimUploadSuccess(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('camera_id', targetSimCameraId);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Analysis error');
      }

      const result = await response.json();
      
      // Find assigned tiger identity from detection
      const tigerDet = result.detections?.find(d => d.reidentification && d.reidentification.identity_id);
      const assignedIdentity = tigerDet?.reidentification?.identity_id || selectedTigerId;

      setSimUploadSuccess(`Camera ${targetSimCameraId} recorded capture for ${assignedIdentity}! Map updated.`);
      setRecentUploadStation(targetSimCameraId);
      
      // Switch selector to matched identity and refresh trajectory
      setSelectedTigerId(assignedIdentity);
      fetchTrajectory(assignedIdentity);
      refreshMovementData();

      // Clear recent station highlight after 6 seconds
      setTimeout(() => {
        setRecentUploadStation(null);
      }, 6000);

    } catch (err) {
      console.error('Buffer station simulation failed:', err);
      setSimUploadSuccess(`Simulation failed: ${err.message}`);
    } finally {
      setIsSimulatingUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const observations = trajectoryData.observations || [];
  const summary = trajectoryData.summary || {};
  const isProv = trajectoryData.identity_status === 'PROVISIONAL' || selectedTigerId.includes('UNVERIFIED');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1b3d2f] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-bold mb-2">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Phase 4: Camera-Trap Tiger Movement Intelligence & Early Warning</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[#f5f2eb] tracking-tight">
            Spatial Tiger Trajectory & Camera Sequence Grid
          </h2>
          <p className="text-xs text-[#a7b4ab] mt-1">
            Displaying chronologically verified camera-to-camera detections, corridor transitions, and last-seen telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-[#0b241b] px-3.5 py-2 rounded-xl border border-[#1b3d2f] text-[#cbd5e1]">
          <span className="text-[#a7b4ab]">Sensor Network:</span>
          <strong className="text-[#10b981] font-mono">{cameras.filter(c => c.status === 'online').length} Online</strong>
          <span>•</span>
          <span className="text-[#f59e0b] font-mono">{alerts.length} Active Alerts</span>
        </div>
      </div>

      {/* Control Bar: Tiger Selector + Buffer Station Ingest Simulator + Live Replay */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-[#0a2018] p-4 rounded-2xl border border-[#1b3d2f] shadow-lg">
        {/* Tiger Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Navigation className="w-4 h-4 text-[#f59e0b]" />
            <label className="text-xs font-bold text-[#f5f2eb]">Selected Tiger Individual:</label>
          </div>
          <select
            value={selectedTigerId}
            onChange={(e) => setSelectedTigerId(e.target.value)}
            className="bg-[#05150f] border border-[#1b3d2f] rounded-xl px-3 py-1.5 text-xs text-[#f5f2eb] font-mono font-bold focus:outline-none focus:border-[#10b981]"
          >
            {tigerList.map(t => (
              <option key={t.identity_id} value={t.identity_id}>
                {t.identity_id} — {t.name} ({t.is_provisional ? 'Provisional' : 'Verified'})
              </option>
            ))}
          </select>
          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
            isProv ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]/40' : 'bg-[#10b981]/20 text-[#6ee7b7] border-[#10b981]/40'
          }`}>
            {isProv ? 'PROVISIONAL IDENTITY' : 'VERIFIED IDENTITY'}
          </span>
        </div>

        {/* Real-Time Camera Station Ingest & Sighting Simulation */}
        <div className="flex flex-wrap items-center gap-2.5 bg-[#05150f] p-2 rounded-xl border border-[#1b3d2f]">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="text-[10px] font-bold text-[#a7b4ab] uppercase">Simulate Ingest at:</span>
          </div>

          <select
            value={targetSimCameraId}
            onChange={(e) => setTargetSimCameraId(e.target.value)}
            className="bg-[#0a2018] border border-[#1b3d2f] rounded-lg px-2 py-1 text-[11px] text-[#f5f2eb] font-mono font-bold focus:outline-none"
          >
            {cameras.map(c => (
              <option key={c.camera_id} value={c.camera_id}>
                {c.camera_id}: {c.station_name} ({c.range_zone})
              </option>
            ))}
          </select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSimulateUpload}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isSimulatingUpload}
            className="px-3 py-1 bg-[#10b981] hover:bg-[#059669] text-[#051a12] font-black text-xs rounded-lg flex items-center gap-1.5 shadow transition-all disabled:opacity-50"
          >
            {isSimulatingUpload ? (
              <>
                <span className="w-3 h-3 border-2 border-[#051a12] border-t-transparent rounded-full animate-spin"></span>
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload & Simulate Capture</span>
              </>
            )}
          </button>
        </div>

        {/* Live Replay Button Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-[10px] text-[#a7b4ab] font-bold uppercase mr-1">Replay:</span>
          {isReplaying ? (
            <button
              onClick={handleStopReplay}
              className="px-3 py-1.5 rounded-xl bg-[#ef4444] text-white font-bold flex items-center gap-1.5 shadow-md hover:bg-[#dc2626] transition-all"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause Replay</span>
            </button>
          ) : (
            <button
              onClick={handleStartReplay}
              disabled={observations.length <= 1}
              className="px-3 py-1.5 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-[#051a12] font-black flex items-center gap-1.5 shadow-md disabled:opacity-40 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Live Replay Trajectory</span>
            </button>
          )}

          <button
            onClick={handleResetReplay}
            className="p-1.5 rounded-xl bg-[#05150f] border border-[#1b3d2f] text-[#cbd5e1] hover:text-[#f5f2eb]"
            title="Reset to latest observation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Upload Simulation Notification Alert */}
      {simUploadSuccess && (
        <div className="bg-[#10b981]/15 border border-[#10b981]/40 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs text-[#6ee7b7] animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#10b981]" />
            <span className="font-bold">{simUploadSuccess}</span>
          </div>
          <button onClick={() => setSimUploadSuccess(null)} className="text-[#a7b4ab] hover:text-white font-bold">×</button>
        </div>
      )}

      {/* Main Map + Right Movement Summary Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Real GPS Map (Span 3 cols) */}
        <div className="lg:col-span-3 space-y-3">
          <WildlifeLiveMap
            cameras={cameras}
            observations={observations}
            selectedTigerId={selectedTigerId}
            activeObservation={activeObservation}
            onSelectObservation={(obs) => setActiveObservation(obs)}
            onSelectCamera={(cam) => setSelectedCamera(cam)}
            isReplaying={isReplaying}
            replayIndex={replayIndex}
            recentUploadStation={recentUploadStation}
            currentUser={currentUser}
          />
        </div>

        {/* Right-Side Tiger Movement Summary Panel */}
        <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl p-6 space-y-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#1b3d2f]/80 pb-3">
              <div>
                <span className="text-xs font-mono font-black text-[#10b981]">{summary.identity_id || selectedTigerId}</span>
                <h3 className="text-base font-black text-[#f5f2eb]">{summary.name || selectedTigerId}</h3>
              </div>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded border ${
                isProv ? 'bg-[#f59e0b]/20 text-[#fcd34d] border-[#f59e0b]/40' : 'bg-[#10b981]/20 text-[#6ee7b7] border-[#10b981]/40'
              }`}>
                {summary.identity_status || 'VERIFIED'}
              </span>
            </div>

            {/* Core Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs mt-4">
              <div className="bg-[#05150f] p-3 rounded-2xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Total Sightings</span>
                <span className="text-lg font-black font-mono text-[#f59e0b]">{summary.total_observations || observations.length}</span>
              </div>
              <div className="bg-[#05150f] p-3 rounded-2xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Elapsed Time</span>
                <span className="text-lg font-black font-mono text-[#6ee7b7]">{summary.elapsed_duration || '0m'}</span>
              </div>
            </div>

            {/* Historical Sequence Breakdown */}
            <div className="mt-4 space-y-2 text-xs">
              <div className="p-3 bg-[#05150f] rounded-2xl border border-[#1b3d2f] space-y-1">
                <div className="text-[10px] text-[#a7b4ab] font-bold uppercase">First Sighting</div>
                <div className="text-xs text-[#f5f2eb] font-mono">{summary.first_seen}</div>
                <div className="text-[10px] text-[#10b981]">Camera: <strong>{summary.first_camera}</strong></div>
              </div>

              <div className="p-3 bg-[#05150f] rounded-2xl border border-[#1b3d2f] space-y-1">
                <div className="text-[10px] text-[#a7b4ab] font-bold uppercase flex items-center justify-between">
                  <span>Last Sighting</span>
                  <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-[#ef4444] text-white animate-pulse">LIVE</span>
                </div>
                <div className="text-xs text-[#f5f2eb] font-mono">{summary.last_seen}</div>
                <div className="text-[10px] text-[#f59e0b]">Camera: <strong>{summary.last_camera} ({summary.last_station_name})</strong></div>
              </div>
            </div>

            {/* Camera Sequence Trail List */}
            <div className="mt-4 space-y-1 text-xs">
              <span className="text-[10px] font-bold uppercase text-[#a7b4ab] block">Camera-to-Camera Sequence:</span>
              <div className="flex flex-wrap items-center gap-1 bg-[#05150f] p-2.5 rounded-xl border border-[#1b3d2f]">
                {(summary.camera_sequence || []).map((camId, cIdx) => (
                  <React.Fragment key={cIdx}>
                    <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      cIdx === (summary.camera_sequence.length - 1)
                        ? 'bg-[#ef4444] text-white'
                        : 'bg-[#0a2018] text-[#cbd5e1] border border-[#1b3d2f]'
                    }`}>
                      {camId}
                    </span>
                    {cIdx < summary.camera_sequence.length - 1 && (
                      <span className="text-[#f59e0b] font-bold">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-[#6b7280] leading-relaxed border-t border-[#1b3d2f]">
            * Camera coordinates represent fixed trap sensors. Path indicates detection sequence, not physical animal walking route.
          </div>
        </div>
      </div>

      {/* Chronological Camera-Trap Timeline (Synchronized with Map) */}
      <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-[#1b3d2f]/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10b981]" />
              Camera-Trap Chronological Timeline ({observations.length} Detections)
            </h3>
            <p className="text-xs text-[#a7b4ab] mt-0.5">
              Click any timeline event to focus and inspect the captured camera trap image on the GPS map.
            </p>
          </div>
        </div>

        {/* Timeline Cards Container */}
        {observations.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {observations.map((obs, idx) => {
              const isLast = idx === observations.length - 1;
              const isSelected = activeObservation?.observation_id === obs.observation_id;

              return (
                <div
                  key={obs.observation_id || idx}
                  onClick={() => setActiveObservation(obs)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#05150f] border-[#f59e0b] shadow-xl ring-2 ring-[#f59e0b]/40'
                      : isLast
                      ? 'bg-[#0a2018] border-[#ef4444]/60'
                      : 'bg-[#05150f]/80 border-[#1b3d2f] hover:border-[#10b981]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#f59e0b] font-bold">Step {idx + 1}</span>
                    {isLast ? (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[#ef4444] text-white">
                        🔴 LAST SEEN
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono text-[#a7b4ab]">
                        {new Date(obs.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 space-y-1">
                    <div className="text-sm font-black text-[#f5f2eb]">{obs.station_name || obs.camera_id}</div>
                    <div className="text-[11px] text-[#a7b4ab]">Zone: <strong className="text-[#10b981]">{obs.range_zone}</strong></div>
                    <div className="text-[10px] font-mono text-[#9ca3af]">GPS: {obs.latitude.toFixed(4)}° N, {obs.longitude.toFixed(4)}° E</div>
                  </div>

                  {/* Thumbnail Preview inside Timeline Card */}
                  <div className="mt-2 aspect-video w-full rounded-xl overflow-hidden border border-[#1b3d2f] bg-black relative flex items-center justify-center">
                    <img
                      src={obs.image_url || obs.crop_path || "/crops/tiger_sample.jpg"}
                      alt="Capture Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = "/crops/tiger_sample.jpg"; }}
                    />
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#1b3d2f] flex items-center justify-between text-[10px]">
                    <span className="text-[#a7b4ab]">{new Date(obs.timestamp).toLocaleDateString()}</span>
                    <span className="text-[#f59e0b] font-bold flex items-center gap-0.5">
                      <span>Inspect Sighting</span>
                      <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-[#05150f] rounded-2xl border border-[#1b3d2f] text-[#a7b4ab]">
            No historical camera trap sightings recorded for {selectedTigerId}.
          </div>
        )}
      </div>

      {/* Active Observation Image Inspector Modal / Card */}
      {activeObservation && (
        <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-[#1b3d2f] pb-3">
            <h4 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
              <Eye className="w-4 h-4 text-[#10b981]" />
              Inspecting Captured Sighting: {activeObservation.identity_id} at {activeObservation.station_name || activeObservation.camera_id}
            </h4>
            <span className="text-[9px] font-mono uppercase px-2.5 py-1 rounded bg-[#10b981]/20 text-[#6ee7b7] border border-[#10b981]/40">
              {activeObservation.is_last_seen ? 'LATEST DETECTION' : 'HISTORICAL SIGHTING'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            {/* Captured Crop Image */}
            <div className="aspect-video bg-[#05150f] rounded-2xl overflow-hidden border border-[#1b3d2f] flex items-center justify-center relative shadow-inner">
              <img
                src={activeObservation.image_url || activeObservation.crop_path || "/crops/tiger_sample.jpg"}
                alt="Captured Tiger"
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src = "/crops/tiger_sample.jpg";
                }}
              />
              <span className="absolute bottom-2 left-2 text-[9px] font-mono px-2 py-0.5 rounded bg-[#030d09]/90 text-white border border-[#1b3d2f]">
                {activeObservation.camera_id}
              </span>
            </div>

            {/* Sighting Metadata */}
            <div className="space-y-3">
              <div className="p-3 bg-[#05150f] rounded-xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Target Tiger Identity</span>
                <span className="text-base font-black font-mono text-[#10b981]">{activeObservation.identity_id}</span>
              </div>

              <div className="p-3 bg-[#05150f] rounded-xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Timestamp & Date</span>
                <span className="text-xs font-mono text-[#f5f2eb]">{new Date(activeObservation.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Spatial Context */}
            <div className="space-y-3">
              <div className="p-3 bg-[#05150f] rounded-xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Camera Station & Range</span>
                <span className="text-xs font-bold text-[#f5f2eb]">{activeObservation.station_name || activeObservation.camera_id}</span>
                <span className="text-[11px] text-[#10b981] block mt-0.5">{activeObservation.range_zone}</span>
              </div>

              <div className="p-3 bg-[#05150f] rounded-xl border border-[#1b3d2f]">
                <span className="text-[10px] text-[#a7b4ab] block font-bold uppercase">Exact GPS Coordinates</span>
                <span className="font-mono text-xs text-[#f59e0b] font-bold">{activeObservation.latitude.toFixed(4)}° N, {activeObservation.longitude.toFixed(4)}° E</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
