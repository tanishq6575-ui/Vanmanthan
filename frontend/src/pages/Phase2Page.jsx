import React, { useState } from 'react';
import { Sparkles, ShieldCheck, AlertTriangle, Filter, CheckCircle2, ChevronRight, Upload, Clock, Image as ImageIcon } from 'lucide-react';
import UploadPanel from '../components/UploadPanel';
import ProcessingStatus from '../components/ProcessingStatus';

export default function Phase2Page({
  results,
  onSelectResult,
  selectedFiles,
  setSelectedFiles,
  handleStartProcessing,
  isProcessing,
  currentIndex,
  currentFilename,
  error
}) {
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Extract all animal detections with species classification
  const allSpeciesDetections = [];
  results.forEach(res => {
    (res.detections || []).forEach((det, idx) => {
      if (det.species) {
        allSpeciesDetections.push({
          parent_image_id: res.image_id,
          original_filename: res.original_filename,
          annotated_image: res.annotated_image,
          detection_index: idx,
          crop_path: det.crop_path,
          species: det.species,
          megadetector_confidence: det.confidence,
          reid: det.reidentification,
          rawResult: res
        });
      }
    });
  });

  const speciesStats = {
    total: allSpeciesDetections.length,
    tiger: allSpeciesDetections.filter(d => d.species.display_label.toLowerCase() === 'tiger').length,
    leopard: allSpeciesDetections.filter(d => d.species.display_label.toLowerCase() === 'leopard').length,
    deer: allSpeciesDetections.filter(d => d.species.display_label.toLowerCase().includes('deer') || d.species.display_label.toLowerCase().includes('cervidae')).length,
    gaur: allSpeciesDetections.filter(d => d.species.display_label.toLowerCase().includes('gaur') || d.species.display_label.toLowerCase().includes('bovidae')).length,
    wildBoar: allSpeciesDetections.filter(d => d.species.display_label.toLowerCase().includes('boar') || d.species.display_label.toLowerCase().includes('suidae')).length,
    reviewNeeded: allSpeciesDetections.filter(d => d.species.human_review_required).length,
  };

  const filteredDetections = allSpeciesDetections.filter(d => {
    if (selectedFilter === 'tiger') return d.species.display_label.toLowerCase() === 'tiger';
    if (selectedFilter === 'leopard') return d.species.display_label.toLowerCase() === 'leopard';
    if (selectedFilter === 'review') return d.species.human_review_required;
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-teal-400" />
            Phase 2: Species Intelligence (Google SpeciesNet)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Fine-grained taxonomic species identification for animal crops extracted by MegaDetector V6.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800 text-teal-300 font-semibold">
          <span>Model: <strong className="text-slate-100">SpeciesNet v4.0.3a</strong></span>
        </div>
      </div>

      {/* Direct Upload & Analyze Panel */}
      <UploadPanel
        selectedFiles={selectedFiles}
        setSelectedFiles={setSelectedFiles}
        onStartProcessing={handleStartProcessing}
        isProcessing={isProcessing}
      />

      {/* Processing Status */}
      <ProcessingStatus
        isProcessing={isProcessing}
        currentIndex={currentIndex}
        totalIndex={selectedFiles.length}
        currentFilename={currentFilename}
        error={error}
      />

      {/* Species Distribution Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => setSelectedFilter('all')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'all' ? 'bg-slate-800 border-emerald-500/60' : 'bg-slate-900/80 border-slate-800'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-slate-400">All Species</span>
          <div className="text-2xl font-black text-slate-100 mt-1">{speciesStats.total}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('tiger')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'tiger' ? 'bg-emerald-950/60 border-emerald-500' : 'bg-slate-900/80 border-emerald-500/20'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-emerald-400">Tiger (Panthera tigris)</span>
          <div className="text-2xl font-black text-emerald-400 mt-1">{speciesStats.tiger}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('leopard')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'leopard' ? 'bg-amber-950/60 border-amber-500' : 'bg-slate-900/80 border-amber-500/20'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-amber-400">Leopard</span>
          <div className="text-2xl font-black text-amber-400 mt-1">{speciesStats.leopard}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400">Deer / Cervidae</span>
          <div className="text-2xl font-black text-slate-200 mt-1">{speciesStats.deer}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <span className="text-[10px] font-bold uppercase text-slate-400">Gaur / Bovidae</span>
          <div className="text-2xl font-black text-slate-200 mt-1">{speciesStats.gaur}</div>
        </div>

        <div 
          onClick={() => setSelectedFilter('review')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            selectedFilter === 'review' ? 'bg-rose-950/60 border-rose-500' : 'bg-slate-900/80 border-rose-500/20'
          }`}
        >
          <span className="text-[10px] font-bold uppercase text-rose-400">Human Review</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{speciesStats.reviewNeeded}</div>
        </div>
      </div>

      {/* Species Crops Grid */}
      {filteredDetections.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredDetections.map((item, i) => (
            <div
              key={i}
              onClick={() => onSelectResult(item.rawResult)}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden shadow-lg cursor-pointer transition-all flex flex-col group"
            >
              {/* Crop Image */}
              <div className="aspect-[4/3] bg-slate-950 overflow-hidden relative">
                <img
                  src={item.crop_path}
                  alt={item.species.display_label}
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 right-2">
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded shadow ${
                      item.species.status === 'HIGH_CONFIDENCE'
                        ? 'bg-emerald-500 text-slate-950 font-black'
                        : 'bg-amber-500 text-slate-950 font-black'
                    }`}
                  >
                    {(item.species.confidence * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-black text-emerald-400 capitalize flex items-center justify-between">
                    <span>{item.species.display_label}</span>
                    <span className="text-[10px] font-mono text-slate-400">{item.original_filename}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 italic">{item.species.raw_label}</p>
                </div>

                {item.species.top_predictions && item.species.top_predictions.length > 1 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 space-y-1">
                    <span className="font-bold uppercase text-slate-500">Top Candidate Labels:</span>
                    {item.species.top_predictions.slice(0, 3).map((tp, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>{tp.display_label}</span>
                        <span className="font-mono text-emerald-400">{(tp.confidence * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-900/60 border border-slate-800 rounded-3xl text-slate-400 space-y-3">
          <Sparkles className="w-8 h-8 text-teal-400 mx-auto opacity-50" />
          <p className="text-sm font-semibold">Upload an image or batch above to classify wildlife species.</p>
          <p className="text-xs text-slate-500">Google SpeciesNet automatically processes detected animal crops.</p>
        </div>
      )}
    </div>
  );
}
