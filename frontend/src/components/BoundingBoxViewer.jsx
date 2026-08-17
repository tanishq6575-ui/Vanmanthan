import React, { useState } from 'react';
import { X, Layers, Image as ImageIcon, ShieldCheck, Scissors, Sparkles, AlertTriangle, Fingerprint, MapPin, Calendar, Activity } from 'lucide-react';

export default function BoundingBoxViewer({ result, onClose }) {
  const [showOriginal, setShowOriginal] = useState(false);

  if (!result) return null;

  const animalDetections = (result.detections || []).filter(d => d.crop_path);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-400" />
              MegaDetector V6 + SpeciesNet + Tiger Re-ID Analysis
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              File: <span className="font-mono text-emerald-400">{result.original_filename}</span> • Reserve: <strong className="text-slate-200">Pench Tiger Reserve, Maharashtra</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Viewing: <span className="text-emerald-400">{showOriginal ? 'Original Image' : 'MegaDetector Bounding Boxes & AI Overlays'}</span>
            </span>
            <button
              onClick={() => setShowOriginal(!showOriginal)}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              <ImageIcon className="w-4 h-4 text-emerald-400" />
              {showOriginal ? 'Show Bounding Boxes' : 'Show Original Image'}
            </button>
          </div>

          {/* Main Image View */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center min-h-[350px] relative">
            <img
              src={showOriginal ? (result.original_image || result.annotated_image) : result.annotated_image}
              alt={result.original_filename}
              className="max-h-[500px] w-auto object-contain"
            />
          </div>

          {/* Animal Crops & AI Intelligence */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Scissors className="w-4 h-4 text-teal-400" /> Detected Animals & Tiger Re-ID Profiles ({animalDetections.length})
            </h4>

            {animalDetections.length > 0 ? (
              <div className="grid grid-cols-1 gap-6">
                {animalDetections.map((det, i) => {
                  const sp = det.species;
                  const reid = det.reidentification;
                  const isTiger = sp?.display_label?.toLowerCase() === 'tiger';
                  const profile = reid?.tiger_profile;

                  return (
                    <div key={i} className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row gap-5">
                      {/* Crop Image */}
                      <div className="w-full md:w-48 h-48 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                        <img src={det.crop_path} alt={`Crop ${i}`} className="w-full h-full object-contain" />
                      </div>

                      {/* Details Area */}
                      <div className="flex-1 space-y-4 text-xs">
                        {/* Species Header */}
                        <div className="flex items-start justify-between border-b border-slate-800/80 pb-3">
                          <div>
                            <span className="text-[10px] text-slate-400 font-mono">Crop #{i + 1}</span>
                            <h5 className="text-base font-black text-emerald-400 flex items-center gap-1.5 capitalize">
                              {sp ? sp.display_label : 'Animal'}
                            </h5>
                            {sp && <p className="text-[11px] text-slate-400 italic">{sp.raw_label}</p>}
                          </div>
                          {sp && (
                            <span
                              className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-md border ${
                                sp.status === 'HIGH_CONFIDENCE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : sp.status === 'MEDIUM_CONFIDENCE'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {sp.status} ({(sp.confidence * 100).toFixed(1)}%)
                            </span>
                          )}
                        </div>

                        {/* Phase 3 Individual Tiger Re-ID Section */}
                        {isTiger && reid && reid.status !== 'not_applicable' && (
                          <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <Fingerprint className="w-4 h-4" />
                                Individual Tiger Identification
                              </span>
                              <span
                                className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md border ${
                                  reid.status === 'matched'
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : reid.status === 'ambiguous'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                    : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                }`}
                              >
                                {reid.status.toUpperCase()}
                              </span>
                            </div>

                            {/* Match Result Banner */}
                            <div className="flex items-center justify-between text-slate-200">
                              <span>Assigned Identity: <strong className="text-emerald-300 text-sm font-mono">{reid.identity_id || 'UNKNOWN'}</strong></span>
                              <span>Similarity Score: <strong className="font-mono text-emerald-400 text-sm">{(reid.similarity_score * 100).toFixed(1)}%</strong></span>
                            </div>

                            <p className="text-[11px] text-slate-400">{reid.message}</p>

                            {/* Verified Tiger Profile Card (When Matched) */}
                            {profile && (
                              <div className="mt-3 p-3 bg-slate-950/80 border border-emerald-500/20 rounded-xl space-y-2 text-[11px]">
                                <div className="font-bold text-slate-200 flex items-center justify-between">
                                  <span>{profile.name}</span>
                                  <span className="text-emerald-400 text-[10px] uppercase font-mono">Verified Gallery Record</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-slate-400">
                                  <div>Sex: <strong className="text-slate-200">{profile.sex}</strong></div>
                                  <div>Territory: <strong className="text-slate-200">{profile.territory}</strong></div>
                                  <div>First Seen: <strong className="text-slate-200">{profile.first_seen}</strong></div>
                                  <div>Total Detections: <strong className="text-slate-200">{profile.total_detections}</strong></div>
                                </div>
                              </div>
                            )}

                            {/* Top Candidates Ranking */}
                            {reid.top_candidates && reid.top_candidates.length > 0 && (
                              <div className="pt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                                  Top Candidate Matches:
                                </span>
                                <div className="space-y-1">
                                  {reid.top_candidates.slice(0, 4).map((cand, cIdx) => (
                                    <div key={cIdx} className="flex items-center justify-between text-[11px] bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
                                      <span className="font-mono font-semibold text-slate-300">{cand.identity_id} ({cand.name})</span>
                                      <span className="font-mono font-bold text-emerald-400">{(cand.similarity_score * 100).toFixed(1)}%</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic bg-slate-950 p-4 rounded-xl border border-slate-800">
                No animal detections found in this image.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
