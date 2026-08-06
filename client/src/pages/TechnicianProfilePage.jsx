import React, { useEffect, useState } from 'react';
import useAuthStore from '../context/authStore';
import { technicianPortalService } from '../services/api';
import { User, ShieldCheck, Mail, Phone, Lock, Save, Star, Award, CheckCircle2 } from 'lucide-react';

export default function TechnicianProfilePage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  
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
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User className="w-5 h-5 text-cyan-400" />
          Technician Mobile Profile
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          View company credentials and update self-service contact details
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-4 rounded-2xl bg-slate-900/60 border border-slate-800 p-6 backdrop-blur-xl">
        {message && (
          <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300">
            {message}
          </div>
        )}

        {/* Company Identity Banner */}
        <div className="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase">Company Employee Identity</span>
            <p className="text-base font-mono font-bold text-cyan-300 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              {profile.employeeId || 'TECH-000000'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase block">Verification Status</span>
            <span className="text-xs font-bold text-emerald-400 uppercase">
              {profile.verificationStatus || 'ACTIVE'}
            </span>
          </div>
        </div>

        {/* Read-Only Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-400 block mb-1">Full Name</label>
            <input
              type="text"
              disabled
              value={`${user?.firstName || ''} ${user?.lastName || ''}`}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 block mb-1">Email Address</label>
            <input
              type="text"
              disabled
              value={user?.email || ''}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Editable Phone */}
        <div>
          <label className="text-xs text-slate-300 block mb-1">Contact Phone Number</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Performance & Skill Summary */}
        <div className="pt-4 border-t border-slate-800 grid grid-cols-2 gap-4">
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase">First-Time Fix Rate</span>
            <p className="text-lg font-bold text-amber-400 mt-1">{profile.firstTimeFixRate || 95}%</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/30 border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase">Performance Rating</span>
            <p className="text-lg font-bold text-purple-400 mt-1">{profile.rating || 5.0} ★</p>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
}
