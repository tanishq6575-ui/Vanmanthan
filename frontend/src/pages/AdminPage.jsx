import React, { useState, useEffect } from 'react';
import { ShieldAlert, FileText, Upload, Plus, CheckCircle2, User, Clock } from 'lucide-react';

export default function AdminPage({ currentUser }) {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  // Gallery photo upload state
  const [identityId, setIdentityId] = useState('PENCH-T-001');
  const [sourceOrg, setSourceOrg] = useState('Pench Tiger Reserve Field Research Unit');
  const [sourceUrl, setSourceUrl] = useState('https://penchtigerreserve.gov.in/monitoring/catalogue');
  const [sourceTitle, setSourceTitle] = useState('Field Camera Trap Identification Photo');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(null);

  const fetchAuditLogs = () => {
    fetch('/api/admin/audit-logs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setAuditLogs(data);
      })
      .catch(err => console.error("Could not fetch audit logs:", err));
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const handleAddGalleryPhoto = async (e) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setUploadSuccess(null);

    const formData = new FormData();
    formData.append('identity_id', identityId);
    formData.append('source_organization', sourceOrg);
    formData.append('source_url', sourceUrl);
    formData.append('source_title', sourceTitle);
    formData.append('file', file);

    try {
      const res = await fetch('/api/tigers/gallery', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setUploadSuccess(data.message || 'Reference photo registered in gallery.');
      setFile(null);
      fetchAuditLogs();
    } catch (err) {
      console.error("Gallery upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5">
        <h2 className="text-xl font-black text-slate-100 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-emerald-400" />
          Administration & Scientific Audit Trail
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Full audit logging for individual re-identification events, gallery modifications, and researcher corrections.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gallery Addition Form with Provenance */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Add Verified Reference with Provenance
          </h3>
          <p className="text-xs text-slate-400">
            Pench reference images require traceable provenance before being indexed into the FAISS/pgvector gallery.
          </p>

          <form onSubmit={handleAddGalleryPhoto} className="space-y-3 text-xs">
            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Target Tiger Identity:</label>
              <select
                value={identityId}
                onChange={(e) => setIdentityId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200 font-mono"
              >
                <option value="PENCH-T-001">PENCH-T-001 (Collarwali / T-15)</option>
                <option value="PENCH-T-002">PENCH-T-002 (Rayanakass / T-30)</option>
                <option value="PENCH-T-003">PENCH-T-003 (Langdi / T-20)</option>
                <option value="PENCH-T-004">PENCH-T-004 (Baghini / T-04)</option>
                <option value="PENCH-T-005">PENCH-T-005 (Choti Mada / T-31)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Source Organization:</label>
              <input
                type="text"
                value={sourceOrg}
                onChange={(e) => setSourceOrg(e.target.value)}
                placeholder="e.g. Pench Tiger Reserve Field Unit"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Authoritative Source URL:</label>
              <input
                type="text"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-slate-400 block mb-1">Reference Image File:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-[11px] text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-slate-950 cursor-pointer"
                required
              />
            </div>

            {uploadSuccess && (
              <div className="p-2.5 rounded-xl bg-emerald-950 border border-emerald-500 text-emerald-300 text-[11px]">
                ✓ {uploadSuccess}
              </div>
            )}

            <button
              type="submit"
              disabled={uploading}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold shadow-lg transition-all"
            >
              {uploading ? 'Extracting Vector & Indexing...' : 'Index Verified Reference'}
            </button>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Scientific Claim Audit Log Stream ({auditLogs.length} Events)
            </h3>
            <button
              onClick={fetchAuditLogs}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400 bg-slate-950/60 sticky top-0">
                <tr>
                  <th className="p-2.5">Timestamp</th>
                  <th className="p-2.5">Action</th>
                  <th className="p-2.5">Entity</th>
                  <th className="p-2.5">User</th>
                  <th className="p-2.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {auditLogs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-950/40">
                    <td className="p-2.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2.5 font-bold uppercase text-emerald-400 text-[10px]">
                      {log.action}
                    </td>
                    <td className="p-2.5 font-mono text-[10px] text-slate-400">
                      {log.entity_type}/{log.entity_id}
                    </td>
                    <td className="p-2.5 text-[11px] text-slate-300">
                      {log.user_id}
                    </td>
                    <td className="p-2.5 text-[10px] text-slate-400 truncate max-w-xs" title={log.details_json}>
                      {log.details_json}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
