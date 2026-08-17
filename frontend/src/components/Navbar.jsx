import React from 'react';
import { 
  Camera, 
  Layers, 
  Sparkles, 
  Fingerprint, 
  Activity, 
  Settings, 
  ShieldAlert, 
  LayoutDashboard, 
  LogOut, 
  UserCheck, 
  MapPin,
  Compass,
  AlertTriangle,
  Shield
} from 'lucide-react';

export default function Navbar({ activePage, setActivePage, currentUser, onLogout, openAlertCount = 0 }) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'phase-1', label: '01 Triage', icon: Camera },
    { id: 'phase-2', label: '02 Species', icon: Sparkles },
    { id: 'phase-3', label: '03 Tiger Re-ID', icon: Fingerprint },
    { id: 'phase-4', label: '04 Movement & Alerts', icon: Activity, alertCount: openAlertCount },
    { id: 'review', label: 'Provisional Review', icon: UserCheck },
    { id: 'settings', label: 'Parameters', icon: Settings },
    { id: 'admin', label: 'Audit & Admin', icon: ShieldAlert }
  ];

  return (
    <header className="border-b border-[#1b3d2f] bg-[#071912]/95 backdrop-blur-md sticky top-0 z-40">
      {/* Top Government Portal Branding Bar */}
      <div className="bg-[#030d09] border-b border-[#102a1f] px-4 sm:px-6 py-1 flex items-center justify-between text-[10px] text-[#9ca3af]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-serif text-[#d1c7b7]">
            <Shield className="w-3 h-3 text-[#d97706]" />
            Viksit Bharat Hackathon 2025 • VNIT Nagpur — Wildlife AI Track
          </span>
          <span className="hidden md:inline text-[#4b5563]">|</span>
          <span className="hidden md:inline font-mono text-[#10b981]">Pench Tiger Reserve — Automated Camera-Trap Intelligence System</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[9px] text-[#6ee7b7]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse"></span>
          <span>CLOUDFLARE ACCESS SECURED</span>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Emblem & Portal Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#10b981]/20 to-[#d97706]/20 border border-[#10b981]/40 flex items-center justify-center text-[#10b981] shadow-inner">
            <Camera className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-[#f5f2eb] flex items-center gap-2">
              PENCH WILDLIFE INTELLIGENCE
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#d97706]/20 text-[#f59e0b] border border-[#d97706]/40">
                Phase 1-4
              </span>
            </h1>
            <p className="text-[11px] text-[#a7b4ab]">Camera Trap Triage • Open-Set Re-ID • Spatial Early Warning</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden xl:flex items-center gap-1 bg-[#0b241b]/90 p-1 rounded-xl border border-[#1b3d2f]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                  isActive
                    ? 'bg-[#10b981] text-[#051a12] shadow-md'
                    : 'text-[#cbd5e1] hover:text-[#f5f2eb] hover:bg-[#12382a]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.alertCount > 0 && (
                  <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-[#ef4444] text-white">
                    {item.alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile & Role Badge & Download Zip */}
        <div className="flex items-center gap-3">
          <a
            href="/wildlife-intelligence-platform-pench.zip"
            download="wildlife-intelligence-platform-pench.zip"
            title="Download complete project source code, models & documentation (.ZIP)"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d97706]/20 hover:bg-[#d97706]/30 border border-[#d97706]/50 text-[#f59e0b] text-xs font-bold transition-all shadow"
          >
            <span>📥 Download Project ZIP</span>
          </a>

          <div className="hidden sm:flex flex-col items-end text-right">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#f5f2eb]">
              <span>{currentUser?.display_name || 'Forest Biologist'}</span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-[#10b981]/20 text-[#6ee7b7] border border-[#10b981]/40">
                {currentUser?.role || 'RESEARCHER'}
              </span>
            </div>
            <span className="text-[10px] text-[#a7b4ab]">Pench Core & Buffer Command</span>
          </div>

          <button
            onClick={onLogout}
            title="Switch Persona / Sign Out"
            className="p-2 rounded-xl bg-[#0b241b] hover:bg-[#12382a] border border-[#1b3d2f] text-[#cbd5e1] hover:text-[#f5f2eb] transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Responsive Mobile / Tablet Nav */}
      <div className="xl:hidden flex items-center gap-1 px-4 py-2 bg-[#081d15] border-t border-[#1b3d2f] overflow-x-auto text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap flex items-center gap-1.5 font-bold ${
                isActive ? 'bg-[#10b981] text-[#051a12]' : 'text-[#cbd5e1]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
              {item.alertCount > 0 && (
                <span className="text-[9px] px-1 rounded-full bg-[#ef4444] text-white">
                  {item.alertCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </header>
  );
}
