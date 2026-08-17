import React, { useState, useEffect } from 'react';
import { UserCheck, ShieldCheck, AlertTriangle, CheckCircle2, Edit3, ArrowRight, Eye, Calendar, Layers, MapPin } from 'lucide-react';

export default function ReviewPage({ currentUser }) {
  const [provisionalTigers, setProvisionalTigers] = useState([]);
  const [selectedTiger, setSelectedTiger] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [verifiedId, setVerifiedId] = useState('');
  const [assignedName, setAssignedName] = useState('');
  const [sex, setSex] = useState('Male');
  const [territory, setTerritory] = useState('Karmajhiri Core Zone');
  const [reason, setReason] = useState('Confirmed distinct flank stripe pattern against state tiger database.');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchTigers = () => {
    fetch('/api/tigers')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const provs = data.filter(t => t.is_provisional || t.identity_id.includes('UNVERIFIED'));
          setProvisionalTigers(provs);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchTigers();
  }, []);

  const handleOpenPromote = (tiger) => {
    setSelectedTiger(tiger);
    setVerifiedId(`PENCH-T-0${Math.floor(Math.random() * 20 + 25)}`);
    setAssignedName('');
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handlePromoteSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTiger) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/movement/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provisional_id: selectedTiger.identity_id,
          verified_id: verifiedId,
          assigned_name: assignedName || `Pench Tiger ${verifiedId}`,
          sex: sex,
          territory: territory,
          reason: reason
        })
      });
      const data = await res.json();
      setSuccessMsg(data.message || 'Provisional identity promoted.');
      fetchTigers();
      setTimeout(() => {
        setModalOpen(false);
      }, 1800);
    } catch (err) {
      console.error("Conversion error:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-[#1b3d2f] pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f59e0b]/10 border border-[#f59e0b]/30 text-[#f59e0b] text-xs font-bold mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Open-Set Verification Workflow</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-[#f5f2eb] tracking-tight">
            Provisional Tiger Identity Review & Promotion
          </h2>
          <p className="text-xs text-[#a7b4ab] mt-1">
            Review uncatalogued tigers discovered by camera traps and promote them to scientifically verified Pench individuals.
          </p>
        </div>

        <div className="text-xs bg-[#0b241b] px-3.5 py-2 rounded-xl border border-[#1b3d2f] text-[#cbd5e1]">
          <span>Pending Field Confirmation: <strong className="text-[#f59e0b] font-mono">{provisionalTigers.length} Individuals</strong></span>
        </div>
      </div>

      {/* Provisional Identities Grid */}
      {provisionalTigers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {provisionalTigers.map((tiger) => (
            <div
              key={tiger.identity_id}
              className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl overflow-hidden shadow-xl p-6 space-y-4 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-black text-[#f59e0b]">{tiger.identity_id}</span>
                  <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-[#f59e0b]/20 text-[#fcd34d] border border-[#f59e0b]/40">
                    PROVISIONAL SIGHTING
                  </span>
                </div>
                <h3 className="text-base font-black text-[#f5f2eb] mt-1">{tiger.name}</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-[#05150f] p-3 rounded-2xl border border-[#1b3d2f]">
                <div>
                  <span className="text-[10px] text-[#a7b4ab] block">First Sighting</span>
                  <span className="font-mono text-[#cbd5e1] font-bold">{tiger.first_seen}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#a7b4ab] block">Total Detections</span>
                  <span className="font-mono text-[#10b981] font-bold">{tiger.total_detections}</span>
                </div>
              </div>

              <button
                onClick={() => handleOpenPromote(tiger)}
                className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#051a12] font-black text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Assign Pench ID</span>
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0a2018] border border-[#1b3d2f] rounded-3xl text-[#a7b4ab] space-y-3">
          <CheckCircle2 className="w-8 h-8 text-[#10b981] mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-[#f5f2eb]">No Pending Provisional Tigers</h4>
          <p className="text-xs max-w-md mx-auto">
            When camera trap batches detect uncatalogued tigers below the similarity threshold, they will automatically appear here for biologist confirmation.
          </p>
        </div>
      )}

      {/* Promotion Modal */}
      {modalOpen && selectedTiger && (
        <div className="fixed inset-0 z-50 bg-[#030d09]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0a2018] border border-[#1b3d2f] rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1b3d2f] pb-3">
              <h4 className="text-sm font-bold text-[#f5f2eb] flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#10b981]" />
                Promote to Verified Pench Tiger Identity
              </h4>
              <button onClick={() => setModalOpen(false)} className="text-[#a7b4ab] hover:text-[#f5f2eb]">
                ✕
              </button>
            </div>

            <form onSubmit={handlePromoteSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-[#05150f] rounded-2xl border border-[#1b3d2f] space-y-1">
                <div className="text-[#a7b4ab]">Source Provisional ID: <strong className="text-[#f59e0b] font-mono">{selectedTiger.identity_id}</strong></div>
                <div className="text-[#a7b4ab]">Current Total Detections: <strong className="text-[#10b981] font-mono">{selectedTiger.total_detections}</strong></div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">New Official ID:</label>
                  <input
                    type="text"
                    value={verifiedId}
                    onChange={(e) => setVerifiedId(e.target.value)}
                    placeholder="e.g. PENCH-T-023"
                    className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] font-mono focus:border-[#10b981] focus:outline-none"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Assigned Name / Alias:</label>
                  <input
                    type="text"
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                    placeholder="e.g. Touriya Male / T-23"
                    className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] focus:border-[#10b981] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Sex:</label>
                  <select
                    value={sex}
                    onChange={(e) => setSex(e.target.value)}
                    className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] focus:border-[#10b981] focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Sub-adult">Sub-adult</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Territory / Range:</label>
                  <input
                    type="text"
                    value={territory}
                    onChange={(e) => setTerritory(e.target.value)}
                    className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] focus:border-[#10b981] focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase text-[#a7b4ab]">Morphological Verification Reason:</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#05150f] border border-[#1b3d2f] rounded-xl p-2.5 text-[#f5f2eb] focus:border-[#10b981] focus:outline-none"
                  required
                />
              </div>

              {successMsg && (
                <div className="p-3 rounded-xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#6ee7b7] font-semibold text-center">
                  ✓ {successMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#051a12] font-black shadow-lg transition-all"
              >
                {submitting ? 'Promoting Identity...' : 'Confirm Verification & Record in Audit Trail'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
