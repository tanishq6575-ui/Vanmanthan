import React from 'react';
import { Eye, ShieldCheck, Tag, Layers, Sparkles, AlertTriangle, Fingerprint } from 'lucide-react';

export default function DetectionCard({ result, onSelect }) {
  const isBlank = result.classification === 'blank';
  const detections = result.detections || [];
  const detectionsCount = detections.length;

  const speciesList = detections
    .filter(d => d.species)
    .map(d => d.species);

  const tigerReids = detections
    .filter(d => d.reidentification && d.reidentification.status !== 'not_applicable')
    .map(d => d.reidentification);

  const highestConf = detectionsCount > 0
    ? Math.max(...detections.map(d => d.confidence))
    : 0;

  const hasHumanReview = speciesList.some(s => s.human_review_required) || tigerReids.some(r => r.human_review_required);

  return (
    <div className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg transition-all duration-200 flex flex-col group">
      {/* Header Badge */}
      <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <span className="text-xs font-semibold text-slate-300 truncate" title={result.original_filename}>
            {result.original_filename}
          </span>
        </div>
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
            isBlank
              ? 'bg-slate-800/60 text-slate-400 border-slate-700'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          }`}
        >
          {isBlank ? 'BLANK' : 'NON-BLANK'}
        </span>
      </div>

      {/* Image Preview Container */}
      <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden cursor-pointer" onClick={() => onSelect(result)}>
        <img
          src={result.annotated_image || result.original_image}
          alt={result.original_filename}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button className="flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2 rounded-xl shadow-lg">
            <Eye className="w-4 h-4" />
            Inspect Re-ID & Species
          </button>
        </div>
      </div>

      {/* Details & Metrics */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <Layers className="w-3 h-3 text-slate-400" /> Detections
            </div>
            <div className="text-sm font-bold text-slate-100 mt-0.5">
              {detectionsCount}
            </div>
          </div>

          <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-2.5">
            <div className="text-slate-400 text-[10px] uppercase font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> Max Conf.
            </div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {highestConf > 0 ? `${(highestConf * 100).toFixed(1)}%` : '0%'}
            </div>
          </div>
        </div>

        {/* Phase 2 Species Badges */}
        {speciesList.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-teal-400" /> Species (SpeciesNet)
            </div>
            <div className="flex flex-wrap gap-1">
              {speciesList.map((sp, i) => (
                <span
                  key={i}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${
                    sp.display_label.toLowerCase() === 'tiger'
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                      : sp.display_label.toLowerCase() === 'leopard'
                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      : 'bg-teal-500/10 text-teal-300 border-teal-500/30'
                  }`}
                >
                  {sp.display_label} — {(sp.confidence * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Phase 3 Individual Tiger Re-ID Badges */}
        {tigerReids.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t border-slate-800/80">
            <div className="text-[10px] uppercase font-bold text-emerald-400 flex items-center gap-1">
              <Fingerprint className="w-3 h-3 text-emerald-400" /> Individual Tiger Re-ID
            </div>
            <div className="space-y-1">
              {tigerReids.map((reid, rIdx) => (
                <div
                  key={rIdx}
                  className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border flex items-center justify-between ${
                    reid.status === 'matched'
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : reid.status === 'ambiguous'
                      ? 'bg-amber-950/40 text-amber-300 border-amber-500/40'
                      : 'bg-blue-950/40 text-blue-300 border-blue-500/40'
                  }`}
                >
                  <span className="font-bold">
                    {reid.status === 'matched'
                      ? `ID: ${reid.identity_id}`
                      : reid.status === 'ambiguous'
                      ? `Ambiguous (${reid.identity_id})`
                      : 'Unknown Individual'}
                  </span>
                  <span className="font-mono text-[10px] font-bold">
                    {(reid.similarity_score * 100).toFixed(1)}% sim
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Human Review Alert Pill */}
        {hasHumanReview && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300 bg-amber-950/40 border border-amber-800/60 px-2.5 py-1 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span>⚠ Human Review Required</span>
          </div>
        )}
      </div>
    </div>
  );
}
