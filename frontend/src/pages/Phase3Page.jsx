import React, { useState, useEffect } from 'react';
import { 
  Fingerprint, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  Search, 
  Edit3, 
  UserCheck, 
  Layers, 
  MapPin,
  Calendar,
  Activity,
  Upload,
  Eye,
  Sliders
} from 'lucide-react';
import Tiger3DCanvas from '../components/Tiger3DCanvas';
import UploadPanel from '../components/UploadPanel';
import ProcessingStatus from '../components/ProcessingStatus';

export default function Phase3Page({
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
  const [galleryIdentities, setGalleryIdentities] = useState([]);
  const [selectedTiger, setSelectedTiger] = useState(null);
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [correctionObservation, setCorrectionObservation] = useState(null);
  const [correctedId, setCorrectedId] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState(null);

  useEffect(() => {
    fetch('/api/tigers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setGalleryIdentities(data);
      })
      .catch(err => console.error("Could not fetch tigers gallery:", err));
  }, []);

  // Extract all tiger sightings from pipeline results
  const tigerSightings = [];
  results.forEach(res => {
    (res.detections || []).forEach(det => {
      if (det.species?.display_label?.toLowerCase() === 'tiger' && det.reidentification) {
        tigerSightings.push({
          parent_image_id: res.image_id,
          original_filename: res.original_filename,
          annotated_image: res.annotated_image,
          crop_path: det.crop_path,
          reid: det.reidentification,
          rawResult: res
        });
      }
    });
  });

  const handleOpenCorrection = (sighting) => {
    setCorrectionObservation(sighting);
    setCorrectedId(sighting.reid.identity_id === 'UNKNOWN' ? 'PENCH-T-001' : sighting.reid.identity_id);
    setCorrectionReason('');
    setReviewSuccessMsg(null);
    setCorrectionModalOpen(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!correctionObservation) return;
    setSubmittingReview(true);

    try {
      const res = await fetch('/api/tigers/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observation_id: correctionObservation.parent_image_id,
          original_prediction: correctionObservation.reid.identity_id || 'UNKNOWN',
          corrected_identity: correctedId,
          reason: correctionReason || 'Verified stripe pattern match by researcher.'
        })
      });
      const data = await res.json();
      setReviewSuccessMsg(data.message || 'Identity correction recorded.');
      setTimeout(() => {
        setCorrectionModalOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Error submitting correction:", err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'VERIFIED_REFERENCE') {
      return <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#10b981]/20 text-[#6ee7b7] border border-[#10b981]/40">VERIFIED REFERENCE</span>;
    }
    if (s === 'MATCHED') {
      return <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#3b82f6]/20 text-[#93c5fd] border border-[#3b82f6]/40">GALLERY MATCH</span>;
    }
    if (s === 'AMBIGUOUS') {
      return <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40">AMBIGUOUS MATCH</span>;
    }
    return <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-md bg-[#ef4444]/20 text-[#fca5a5] border border-[#ef4444]/40">NEW PROVISIONAL</span>;
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Title Header with 3D Scanner Canvas */}
      <div className="relative bg-[#0a2018] border border-[#1b3d2f] rounded-3xl p-6 md:p-8 overflow-hidden shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-30 pointer-events-none hidden md:block">
          <Tiger3DCanvas className="w-full h-full" mode="scanner" />
        </div>

        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] text-xs font-bold">
            <Fingerprint className="w-4 h-4" />
            <span>Open-Set TigerReIDNet Visual Feature Extractor (512-D)</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-[#f5f2eb] tracking-tight">
            Phase 3: Individual Tiger Re-Identification
          </h2>

          <p className="text-xs md:text-sm text-[#a7b4ab] leading-relaxed">
            Re-identifying individual tigers across camera trap sightings using learned appearance and body stripe representations matched against the authoritative <strong className="text-[#10b981]">Pench Tiger Reserve Gallery</strong>.
          </p>
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

      {/* Verified Pench Tiger Gallery Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#10b981]" />
            Authoritative Pench Gallery Reference Registry ({galleryIdentities.length} Verified Individuals)
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {galleryIdentities.map((tiger) => (
            <div
              key={tiger.identity_id}
              onClick={() => setSelectedTiger(tiger)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all bg-[#0a2018] hover:border-[#10b981]/50 ${
                selectedTiger?.identity_id === tiger.identity_id ? 'border-[#10b981] bg-[#05150f]' : 'border-[#1b3d2f]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#10b981]">{tiger.identity_id}</span>
                <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#030d09] text-[#9ca3af]">
                  {tiger.sex}
                </span>
              </div>
              <h4 className="text-sm font-black text-[#f5f2eb] mt-1">{tiger.name}</h4>
              <p className="text-[11px] text-[#a7b4ab] mt-0.5">{tiger.territory}</p>
              <div className="mt-3 pt-2 border-t border-[#1b3d2f] flex items-center justify-between text-[10px] text-[#9ca3af]">
                <span>Sightings: <strong className="text-[#f5f2eb]">{tiger.total_detections}</strong></span>
                <span className="text-[#10b981] font-semibold">{tiger.is_provisional ? 'Provisional' : 'Verified'}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Real-time Tiger Re-ID Sightings from Ingested Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10b981]" />
            Live Query Tiger Detections & Gallery Matching Results ({tigerSightings.length})
          </h3>
        </div>

        {tigerSightings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tigerSightings.map((item, idx) => {
              const reid = item.reid;
              const qual = reid.quality_assessment;

              return (
                <div
                  key={idx}
                  className="bg-[#0a2018] border border-[#1b3d2f] rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between"
                >
                  {/* Top Images Comparison Header */}
                  <div className="p-4 bg-[#05150f] border-b border-[#1b3d2f] flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#f5f2eb]">{item.original_filename}</span>
                      <p className="text-[10px] text-[#a7b4ab]">Query Crop vs Identity Engine</p>
                    </div>
                    {getStatusBadge(reid.status)}
                  </div>

                  {/* Crop Image Display & Quality Indicator */}
                  <div className="p-4 flex gap-3">
                    <div className="w-1/2 aspect-square bg-[#030d09] rounded-xl overflow-hidden border border-[#1b3d2f] relative">
                      <img src={item.crop_path} alt="Query Crop" className="w-full h-full object-contain" />
                      {qual && (
                        <span className={`absolute bottom-1 right-1 text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          qual.quality === 'GOOD' ? 'bg-[#10b981] text-[#051a12]' : 'bg-[#f59e0b] text-[#051a12]'
                        }`}>
                          {qual.quality} (Blur: {qual.blur_score})
                        </span>
                      )}
                    </div>
                    <div className="w-1/2 flex flex-col justify-center space-y-1.5 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#a7b4ab]">Assigned Identity:</span>
                        <div className="text-sm font-mono font-black text-[#10b981]">{reid.identity_id || 'UNKNOWN'}</div>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#a7b4ab]">Similarity Score:</span>
                        <div className="text-base font-mono font-black text-[#f5f2eb]">
                          {(reid.similarity_score * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Top Candidates Breakdown */}
                  {reid.top_candidates && reid.top_candidates.length > 0 && (
                    <div className="px-4 pb-3 space-y-1 text-[11px]">
                      <span className="text-[10px] uppercase font-bold text-[#6b7280]">Top Ranked Gallery Matches:</span>
                      {reid.top_candidates.slice(0, 3).map((cand, cIdx) => (
                        <div key={cIdx} className="flex justify-between items-center bg-[#05150f] px-2.5 py-1 rounded-lg border border-[#1b3d2f]">
                          <span className="text-[#cbd5e1] font-mono">{cand.identity_id}</span>
                          <span className="font-mono text-[#10b981] font-bold">{(cand.similarity_score * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Action Footer: Researcher Correction */}
                  <div className="p-4 bg-[#05150f] border-t border-[#1b3d2f] flex items-center justify-between">
                    <button
                      onClick={() => onSelectResult(item.rawResult)}
                      className="text-xs text-[#a7b4ab] hover:text-[#10b981] font-semibold"
                    >
                      Inspect Full Details
                    </button>
                    <button
                      onClick={() => handleOpenCorrection(item)}
                      className="px-3 py-1.5 rounded-lg bg-[#0b241b] hover:bg-[#12382a] text-[#f5f2eb] text-xs font-bold flex items-center gap-1.5 border border-[#1b3d2f] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#10b981]" />
                      <span>Review / Correct</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-[#0a2018] border border-[#1b3d2f] rounded-3xl text-[#a7b4ab] space-y-3">
            <Fingerprint className="w-8 h-8 text-[#10b981] mx-auto opacity-50" />
            <p className="text-sm font-semibold">Upload an image or batch above to identify individual tigers.</p>
            <p className="text-xs text-[#6b7280]">The 512-D Re-ID deep embedding extractor automatically queries the Pench gallery.</p>
          </div>
        )}
      </div>

      {/* Identity Correction Modal */}
      {correctionModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#030d09]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1b3d2f] pb-3">
              <h4 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#10b981]" />
                Scientist Identity Review & Correction
              </h4>
              <button
                onClick={() => setCorrectionModalOpen(false)}
                className="text-[#a7b4ab] hover:text-[#f5f2eb]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#05150f] rounded-xl border border-[#1b3d2f] space-y-1">
                <div className="text-[#a7b4ab]">Current AI Prediction: <strong className="text-[#10b981] font-mono">{correctionObservation?.reid.identity_id}</strong></div>
                <div className="text-[#a7b4ab]">Similarity Score: <strong className="text-[#f5f2eb] font-mono">{(correctionObservation?.reid.similarity_score * 100).toFixed(1)}%</strong></div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Corrected Tiger Identity:</label>
                <select
                  value={correctedId}
                  onChange={(e) => setCorrectedId(e.target.value)}
                  className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] font-mono focus:border-[#10b981] focus:outline-none"
                >
                  {galleryIdentities.map(t => (
                    <option key={t.identity_id} value={t.identity_id}>{t.identity_id} — {t.name}</option>
                  ))}
                  <option value="UNKNOWN">UNKNOWN INDIVIDUAL (New Tiger)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Researcher Reason / Morphological Evidence:</label>
                <textarea
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g., Flank stripe asymmetry matches Collarwali T-15 reference catalog."
                  className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] focus:border-[#10b981] focus:outline-none"
                />
              </div>

              {reviewSuccessMsg && (
                <div className="p-3 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#6ee7b7] font-semibold text-center">
                  ✓ {reviewSuccessMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submittingReview}
                className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#051a12] font-black shadow-lg transition-all"
              >
                {submittingReview ? 'Submitting to Audit Log...' : 'Record Scientific Correction'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
