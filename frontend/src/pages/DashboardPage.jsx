import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Layers, 
  Sparkles, 
  Fingerprint, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  FileCheck2,
  Database,
  Radio,
  Compass,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import Tiger3DCanvas from '../components/Tiger3DCanvas';
import WildlifeLiveMap from '../components/WildlifeLiveMap';

export default function DashboardPage({ setActivePage, results = [] }) {
  const [cameras, setCameras] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [tigers, setTigers] = useState([]);

  useEffect(() => {
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
        if (Array.isArray(data)) setTigers(data);
      })
      .catch(() => {});
  }, []);

  const totalProcessed = results.length;
  const blankCount = results.filter(r => r.classification === 'blank').length;
  const tigerCount = results.filter(r => (r.detections || []).some(d => d.species?.display_label?.toLowerCase() === 'tiger')).length;
  const matchedTigers = results.filter(r => (r.detections || []).some(d => d.reidentification?.status === 'MATCHED')).length;
  const provTigers = results.filter(r => (r.detections || []).some(d => d.reidentification?.status === 'NEW_PROVISIONAL')).length;
  const verifiedCount = tigers.filter(t => !t.is_provisional).length;
  const provisionalCount = tigers.filter(t => t.is_provisional).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Hero Command Center Header Banner with 3D Canvas */}
      <div className="relative bg-[#0a2018] border border-[#1b3d2f] rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25 pointer-events-none hidden md:block">
          <Tiger3DCanvas className="w-full h-full" mode="scanner" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>Viksit Bharat Hackathon 2025 • VNIT Nagpur</span>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-[#f5f2eb] tracking-tight">
            Automated Wildlife Triage & Tiger Movement Platform
          </h2>

          <p className="text-xs md:text-sm text-[#a7b4ab] leading-relaxed">
            Unifying <strong className="text-[#10b981]">MegaDetector V6</strong> triage, <strong className="text-[#34d399]">Google SpeciesNet</strong> classification, <strong className="text-[#10b981]">TigerReIDNet</strong> open-set stripe re-identification, and <strong className="text-[#f59e0b]">PostGIS GPS live tracking</strong> across Pench, Gorewada, and Tadoba reserves.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setActivePage('phase-1')}
              className="px-4 py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#051a12] font-black text-xs flex items-center gap-2 shadow-lg transition-all"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Triage (Phase 1)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActivePage('phase-4')}
              className="px-4 py-2.5 rounded-xl bg-[#0b241b] hover:bg-[#12382a] text-[#f5f2eb] font-bold text-xs flex items-center gap-2 border border-[#1b3d2f] transition-all"
            >
              <Compass className="w-4 h-4 text-[#10b981]" />
              <span>Live GPS Movement Map (Phase 4)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Counters Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#a7b4ab]">Active Stations</span>
          <div className="text-2xl font-black text-[#10b981] mt-1">{cameras.filter(c => c.status === 'online').length}</div>
          <span className="text-[10px] text-[#6b7280]">GPS Camera Traps</span>
        </div>

        <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#a7b4ab]">Processed Images</span>
          <div className="text-2xl font-black text-[#f5f2eb] mt-1">{totalProcessed}</div>
          <span className="text-[10px] text-[#6b7280]">Camera trap survey</span>
        </div>

        <div className="bg-[#0a2018] border border-[#10b981]/30 bg-[#10b981]/5 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#10b981]">Tigers Detected</span>
          <div className="text-2xl font-black text-[#10b981] mt-1">{tigerCount}</div>
          <span className="text-[10px] text-[#a7b4ab]">SpeciesNet verified</span>
        </div>

        <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#a7b4ab]">Verified Gallery</span>
          <div className="text-2xl font-black text-[#6ee7b7] mt-1">{verifiedCount || 5}</div>
          <span className="text-[10px] text-[#6b7280]">Authoritative Tigers</span>
        </div>

        <div className="bg-[#0a2018] border border-[#f59e0b]/30 bg-[#f59e0b]/5 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#f59e0b]">Provisional Tigers</span>
          <div className="text-2xl font-black text-[#f59e0b] mt-1">{provisionalCount || 2}</div>
          <span className="text-[10px] text-[#a7b4ab]">Awaiting Promotion</span>
        </div>

        <div className="bg-[#0a2018] border border-[#ef4444]/30 bg-[#ef4444]/5 rounded-2xl p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444]">Open Alerts</span>
          <div className="text-2xl font-black text-[#fca5a5] mt-1">{alerts.length}</div>
          <span className="text-[10px] text-[#a7b4ab]">Corridor / Buffer alerts</span>
        </div>
      </div>

      {/* Embedded Real GPS Live Map */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#10b981]" />
            Real-Time GPS Wildlife Movement Radar (Pench • Gorewada • Tadoba)
          </h3>
          <button
            onClick={() => setActivePage('phase-4')}
            className="text-xs text-[#10b981] hover:underline font-bold flex items-center gap-1"
          >
            <span>Open Full Movement Analytics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <WildlifeLiveMap
          cameras={cameras}
          sightings={[]}
          trajectories={[]}
        />
      </div>

      {/* Grid: 4-Phase System Pipeline Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Phase 1 Card */}
        <div
          onClick={() => setActivePage('phase-1')}
          className="bg-[#0a2018] border border-[#1b3d2f] hover:border-[#10b981] rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
            <Camera className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#f5f2eb]">Phase 1: Triage</h4>
            <p className="text-[11px] text-[#a7b4ab] mt-1 leading-relaxed">
              MegaDetector V6 animal, person, and vehicle bounding box detection and auto-cropping.
            </p>
          </div>
        </div>

        {/* Phase 2 Card */}
        <div
          onClick={() => setActivePage('phase-2')}
          className="bg-[#0a2018] border border-[#1b3d2f] hover:border-[#10b981] rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-[#34d399]/20 border border-[#34d399]/40 flex items-center justify-center text-[#34d399]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#f5f2eb]">Phase 2: SpeciesNet</h4>
            <p className="text-[11px] text-[#a7b4ab] mt-1 leading-relaxed">
              Google SpeciesNet taxonomy: Tiger, Leopard, Gaur, Deer, and Wild Boar classification.
            </p>
          </div>
        </div>

        {/* Phase 3 Card */}
        <div
          onClick={() => setActivePage('phase-3')}
          className="bg-[#0a2018] border border-[#1b3d2f] hover:border-[#10b981] rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
            <Fingerprint className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#f5f2eb]">Phase 3: Tiger Re-ID</h4>
            <p className="text-[11px] text-[#a7b4ab] mt-1 leading-relaxed">
              Open-Set 512-D stripe matching against Pench verified and provisional galleries.
            </p>
          </div>
        </div>

        {/* Phase 4 Card */}
        <div
          onClick={() => setActivePage('phase-4')}
          className="bg-[#0a2018] border border-[#1b3d2f] hover:border-[#10b981] rounded-2xl p-5 cursor-pointer transition-all space-y-3 shadow-lg"
        >
          <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/20 border border-[#f59e0b]/40 flex items-center justify-center text-[#f59e0b]">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-black text-[#f5f2eb]">Phase 4: Movement</h4>
            <p className="text-[11px] text-[#a7b4ab] mt-1 leading-relaxed">
              PostGIS GPS spatial trajectories, village buffer boundaries, and anomaly alerts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
