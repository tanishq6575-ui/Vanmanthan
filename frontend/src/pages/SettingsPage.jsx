import React, { useState, useEffect } from 'react';
import { Settings, Sliders, ShieldCheck, Database, Cloud, Save, CheckCircle2 } from 'lucide-react';

export default function SettingsPage({ currentUser }) {
  const [config, setConfig] = useState({
    megadetector_threshold: 0.20,
    species_threshold: 0.60,
    reid_match_threshold: 0.70,
    reid_ambiguity_delta: 0.03,
    max_upload_mb: 50,
    max_batch_size: 100,
    reserve_name: 'Pench Tiger Reserve',
    state: 'Maharashtra',
    country: 'India'
  });

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (data) setConfig(data);
      })
      .catch(err => console.error("Could not load config:", err));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          megadetector_threshold: parseFloat(config.megadetector_threshold),
          species_threshold: parseFloat(config.species_threshold),
          reid_match_threshold: parseFloat(config.reid_match_threshold),
          reid_ambiguity_delta: parseFloat(config.reid_ambiguity_delta)
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error("Failed to update config:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <Settings className="w-6 h-6 text-emerald-400" />
          Platform Thresholds & Scientific Parameters
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Adjust statistical cutoffs and decision criteria across Phase 1, Phase 2, and Phase 3 without redeploying code.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Sliders Container */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-400" />
            Inference Thresholds
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* MegaDetector Confidence */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">MegaDetector V6 Threshold</span>
                <span className="font-mono text-emerald-400 font-bold">{config.megadetector_threshold}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.80"
                step="0.05"
                value={config.megadetector_threshold}
                onChange={(e) => setConfig({ ...config, megadetector_threshold: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-slate-400">Minimum object detection confidence to create bounding box crops.</p>
            </div>

            {/* SpeciesNet Confidence */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">SpeciesNet Confidence Cutoff</span>
                <span className="font-mono text-teal-400 font-bold">{config.species_threshold}</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={config.species_threshold}
                onChange={(e) => setConfig({ ...config, species_threshold: parseFloat(e.target.value) })}
                className="w-full accent-teal-500"
              />
              <p className="text-[10px] text-slate-400">Classifications below this score trigger Human Review flag.</p>
            </div>

            {/* Re-ID Match Threshold */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">Tiger Re-ID Match Threshold</span>
                <span className="font-mono text-emerald-400 font-bold">{config.reid_match_threshold}</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={config.reid_match_threshold}
                onChange={(e) => setConfig({ ...config, reid_match_threshold: parseFloat(e.target.value) })}
                className="w-full accent-emerald-500"
              />
              <p className="text-[10px] text-slate-400">Similarity score below this triggers UNKNOWN INDIVIDUAL.</p>
            </div>

            {/* Re-ID Ambiguity Delta */}
            <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <div className="flex justify-between">
                <span className="font-bold text-slate-200">Re-ID Ambiguity Delta</span>
                <span className="font-mono text-amber-400 font-bold">{config.reid_ambiguity_delta}</span>
              </div>
              <input
                type="range"
                min="0.01"
                max="0.10"
                step="0.01"
                value={config.reid_ambiguity_delta}
                onChange={(e) => setConfig({ ...config, reid_ambiguity_delta: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
              <p className="text-[10px] text-slate-400">If top 2 candidate scores differ by less than this delta, triggers AMBIGUOUS MATCH.</p>
            </div>
          </div>
        </div>

        {/* Infrastructure & Storage Status */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            Infrastructure & Cloud Services Status
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-400 font-semibold">Object Storage</div>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cloudflare R2 (wildlife-prod)
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-400 font-semibold">Vector Database</div>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                PostgreSQL + pgvector / FAISS
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
              <div className="text-slate-400 font-semibold">Authentication</div>
              <div className="font-bold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cloudflare Access & Google OIDC
              </div>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Parameters updated and logged to audit trail.
            </span>
          ) : <div></div>}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
