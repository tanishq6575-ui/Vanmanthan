import React from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ProcessingStatus({ isProcessing, currentIndex, totalIndex, currentFilename, error }) {
  if (!isProcessing && !error) return null;

  const percentage = totalIndex > 0 ? Math.round((currentIndex / totalIndex) * 100) : 0;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg mb-6 backdrop-blur-sm">
      {error ? (
        <div className="flex items-center gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>
                {currentIndex === 0
                  ? 'Loading MegaDetector V6 model...'
                  : `Processing image ${currentIndex}/${totalIndex} — ${currentFilename || ''}`}
              </span>
            </div>
            <span className="text-emerald-400 font-semibold">{percentage}%</span>
          </div>

          <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
