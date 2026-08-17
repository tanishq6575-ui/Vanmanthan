import React from 'react';
import { Camera, Layers, ShieldCheck, Scissors, Upload, FileCheck2, Clock } from 'lucide-react';
import UploadPanel from '../components/UploadPanel';
import ProcessingStatus from '../components/ProcessingStatus';
import DetectionCard from '../components/DetectionCard';

export default function Phase1Page({
  selectedFiles,
  setSelectedFiles,
  handleStartProcessing,
  isProcessing,
  currentIndex,
  currentFilename,
  error,
  results,
  onSelectResult
}) {
  const blankResults = results.filter(r => r.classification === 'blank');
  const nonBlankResults = results.filter(r => r.classification !== 'blank');

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Camera className="w-6 h-6 text-emerald-400" />
            Phase 1: Camera Trap Triage (MegaDetector V6)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Automated triage for high-volume camera trap batches. Separates blank frames, detects animals, humans, vehicles, and generates precise crops.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-slate-300">
          <Clock className="w-4 h-4 text-emerald-400" />
          <span>Avg. Latency: <strong className="text-emerald-400">~2.5s / 1280px frame</strong></span>
        </div>
      </div>

      {/* Upload Component */}
      <UploadPanel
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onStartProcessing={handleStartProcessing}
        isProcessing={isProcessing}
      />

      {/* Progress */}
      <ProcessingStatus
        isProcessing={isProcessing}
        currentIndex={currentIndex}
        totalIndex={selectedFiles.length}
        currentFilename={currentFilename}
        error={error}
      />

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Triage Results ({results.length} Total • {nonBlankResults.length} Non-Blank • {blankResults.length} Blank)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((res) => (
              <DetectionCard key={res.image_id} result={res} onSelect={onSelectResult} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
