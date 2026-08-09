import React, { useState } from 'react';
import useAuthStore from '../context/authStore';
import { technicianPortalService } from '../services/api';
import { User, ShieldCheck, Save } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../utils/cn';

export default function TechnicianProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const { theme } = useTheme();

  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const profile = user?.technicianProfile || {};

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await technicianPortalService.updateMyProfile({ phone });
      if (res?.data) {
        setUser({ ...user, phone });
        setMessage('Profile updated successfully');
      }
    } catch (err) {
      console.error('Failed to update profile', err);
      setMessage('Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12 transition-colors duration-300">
      <div>
        <h1 className="text-xl font-black text-foreground flex items-center gap-2">
          <User className="w-6 h-6 text-cyan-500" />
          Technician Mobile Profile
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          View company credentials and update self-service contact details
        </p>
      </div>

      <form onSubmit={handleSave} className={cn(
        "space-y-4 rounded-3xl border p-6 backdrop-blur-xl shadow-xl transition-all",
        theme === 'light' ? "bg-white border-slate-200 shadow-slate-200/50" : "bg-[#0c0d15]/80 border-white/10 shadow-black/60"
      )}>
        {message && (
          <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-xs font-bold text-cyan-500">
            {message}
          </div>
        )}

        {/* Company Identity Banner */}
        <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground font-mono uppercase font-bold">Company Employee Identity</span>
            <p className="text-base font-mono font-black text-cyan-500 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-500" />
              {profile.employeeId || 'TECH-7846'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground uppercase font-bold block">Verification Status</span>
            <span className="text-xs font-black text-emerald-500 uppercase">
              {profile.verificationStatus || 'VERIFIED'}
            </span>
          </div>
        </div>

        {/* Read-Only Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Full Name</label>
            <input
              type="text"
              disabled
              value={`${user?.firstName || ''} ${user?.lastName || ''}`}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold text-foreground opacity-80 cursor-not-allowed",
                theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-white/10"
              )}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground block mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border text-xs font-bold text-foreground opacity-80 cursor-not-allowed",
                theme === 'light' ? "bg-slate-100 border-slate-200" : "bg-slate-900 border-white/10"
              )}
            />
          </div>
        </div>

        {/* Editable Phone */}
        <div>
          <label className="text-xs font-bold text-foreground block mb-1">Contact Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={cn(
              "w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none",
              theme === 'light' ? "bg-white border-slate-200" : "bg-[#0c0d15] border-white/10"
            )}
          />
        </div>

        {/* Performance & Skill Summary */}
        <div className="pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
          <div className={cn(
            "p-3.5 rounded-2xl border text-center",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
          )}>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">First-Time Fix Rate</span>
            <p className="text-lg font-black text-amber-500 mt-1">{profile.firstTimeFixRate ? `${profile.firstTimeFixRate}%` : 'Not available'}</p>
          </div>
          <div className={cn(
            "p-3.5 rounded-2xl border text-center",
            theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-900/60 border-white/5"
          )}>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Performance Rating</span>
            <p className="text-lg font-black text-purple-500 mt-1">{profile.rating ? `${profile.rating} ★` : 'Not available'}</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
