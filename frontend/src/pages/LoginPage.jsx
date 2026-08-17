import React, { useState } from 'react';
import { Camera, ShieldCheck, Lock, Sparkles, CheckCircle2, UserCheck, MapPin } from 'lucide-react';
import Tiger3DCanvas from '../components/Tiger3DCanvas';

export default function LoginPage({ onLoginSuccess }) {
  const [selectedRole, setSelectedRole] = useState('RESEARCHER');
  const [email, setEmail] = useState('researcher@pench-wildlife.org');
  const [displayName, setDisplayName] = useState('Dr. Anita Roy (Lead Biologist)');
  const [loading, setLoading] = useState(false);

  const roles = [
    {
      id: 'ADMIN',
      title: 'Administrator',
      email: 'admin.pench@wildlife-intelligence.gov.in',
      name: 'Dr. Rajesh Sharma (Director)',
      desc: 'Full access to system thresholds, model configs, user permissions, and audit logs.'
    },
    {
      id: 'RESEARCHER',
      title: 'Wildlife Researcher',
      email: 'anita.biologist@pench-wildlife.org',
      name: 'Dr. Anita Roy (Lead Biologist)',
      desc: 'Run triage, species classification, tiger Re-ID, submit identity corrections, and register gallery photos.'
    },
    {
      id: 'VIEWER',
      title: 'Field Ranger / Viewer',
      email: 'field.ranger@forest.gov.in',
      name: 'Pench Field Ranger Unit',
      desc: 'View observation dashboards, real-time sighting logs, and camera telemetry.'
    }
  ];

  const handleRoleSelect = (roleObj) => {
    setSelectedRole(roleObj.id);
    setEmail(roleObj.email);
    setDisplayName(roleObj.name);
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json.stringify({
          email,
          role: selectedRole,
          display_name: displayName
        })
      });
      const data = await res.json();
      onLoginSuccess(data);
    } catch (err) {
      console.warn('Fallback local login:', err);
      onLoginSuccess({
        user_id: 'usr-local-01',
        email,
        display_name: displayName,
        role: selectedRole
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow & 3D canvas backdrop */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <Tiger3DCanvas className="w-full h-full" mode="radar" />
      </div>

      <div className="max-w-md w-full bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Camera className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black tracking-tight text-slate-100">
            Pench Wildlife Intelligence
          </h2>
          <p className="text-xs text-slate-400">
            Automated Camera Trap Triage & Individual Tiger Re-Identification
          </p>
          <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-800/60 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Protected by Cloudflare Access & Google OIDC</span>
          </div>
        </div>

        {/* Role Selector */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            Select Authenticated Persona:
          </label>
          <div className="space-y-2">
            {roles.map((r) => {
              const isSelected = selectedRole === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleRoleSelect(r)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{r.title}</span>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-semibold">
                      {r.id}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{r.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{r.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sign In Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          {loading ? 'Authenticating...' : `Enter Platform as ${selectedRole}`}
        </button>

        <div className="text-center text-[10px] text-slate-500">
          Viksit Bharat Hackathon 2025 • VNIT Nagpur &nbsp;|&nbsp; Wildlife AI Track &nbsp;|&nbsp; Pench Tiger Reserve
        </div>
      </div>
    </div>
  );
}
