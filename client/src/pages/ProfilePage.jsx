import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { authService } from '../services/api';
import { User, Mail, Phone, Shield, Lock, Check, AlertTriangle, Eye, EyeOff } from 'lucide-react';

const ROLE_COLORS = {
  admin: { from: 'from-violet-500', to: 'to-purple-600', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  manager: { from: 'from-blue-500', to: 'to-cyan-600', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  tenant: { from: 'from-emerald-500', to: 'to-teal-600', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
};

function InputField({ label, type = 'text', value, onChange, disabled, icon: Icon, required, rightEl }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}{required && ' *'}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/30" />}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} disabled={disabled} required={required}
          className={`w-full ${Icon ? 'pl-10' : 'pl-4'} ${rightEl ? 'pr-10' : 'pr-4'} py-3 rounded-xl bg-muted border border-border text-foreground text-sm placeholder-muted-foreground/20 focus:outline-none focus:border-primary/50 transition-all disabled:opacity-40 disabled:cursor-not-allowed`} />
        {rightEl && <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const rc = ROLE_COLORS[user?.role] || ROLE_COLORS.tenant;

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    phone: user?.phone || '',
  });
  const [profileStatus, setProfileStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [profileMsg, setProfileMsg] = useState('');

  // Password form
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState(null);
  const [pwMsg, setPwMsg] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileStatus('saving'); setProfileMsg('');
    try {
      const res = await authService.updateProfile(profile);
      if (setUser) setUser({ ...user, ...profile });
      setProfileStatus('success'); setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileStatus(null), 3000);
    } catch (err) {
      setProfileStatus('error'); setProfileMsg(err.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) { setPwStatus('error'); setPwMsg('New passwords do not match'); return; }
    if (pw.next.length < 8) { setPwStatus('error'); setPwMsg('Password must be at least 8 characters'); return; }
    setPwStatus('saving'); setPwMsg('');
    try {
      await authService.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPwStatus('success'); setPwMsg('Password changed successfully!');
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwStatus(null), 3000);
    } catch (err) {
      setPwStatus('error'); setPwMsg(err.message || 'Failed to change password');
    }
  };

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl border border-border bg-card shadow-sm flex items-center gap-5 transition-colors">
        <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${rc.from} ${rc.to} flex items-center justify-center text-3xl font-black text-white flex-shrink-0 shadow-lg`}>
          {initials || <User className="w-8 h-8" />}
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground">{user?.firstName} {user?.lastName}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-black mt-2 capitalize ${rc.text} ${rc.bg} ${rc.border}`}>
            <Shield className="w-3 h-3" /> {user?.role}
          </div>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Member Since</p>
          <p className="text-sm font-bold text-muted-foreground/60">
            {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '—'}
          </p>
        </div>
      </motion.div>

      {/* Profile Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="text-base font-black text-foreground mb-5 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-500" /> Personal Information
        </h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <InputField label="First Name" required value={profile.firstName} onChange={v => setProfile(p => ({ ...p, firstName: v }))} icon={User} />
            <InputField label="Last Name" required value={profile.lastName} onChange={v => setProfile(p => ({ ...p, lastName: v }))} icon={User} />
          </div>
          <InputField label="Email" type="email" value={user?.email || ''} onChange={() => { }} disabled icon={Mail} />
          <InputField label="Phone" type="tel" value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} icon={Phone} />

          <AnimatePresence>
            {profileStatus && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${profileStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : profileStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                {profileStatus === 'success' ? <Check className="w-4 h-4" /> : profileStatus === 'error' ? <AlertTriangle className="w-4 h-4" /> : null}
                {profileMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={profileStatus === 'saving'}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
            {profileStatus === 'saving' ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </motion.div>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="text-base font-black text-foreground mb-5 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-500" /> Change Password
        </h2>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          {['current', 'next', 'confirm'].map(k => (
            <InputField key={k}
              label={k === 'current' ? 'Current Password' : k === 'next' ? 'New Password' : 'Confirm New Password'}
              type={showPw[k] ? 'text' : 'password'}
              required
              value={pw[k]} onChange={v => setPw(p => ({ ...p, [k]: v }))}
              icon={Lock}
              rightEl={
                <button type="button" onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))} className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors">
                  {showPw[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />
          ))}

          <AnimatePresence>
            {pwStatus && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${pwStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : pwStatus === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                    : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                {pwStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {pwMsg}
              </motion.div>
            )}
          </AnimatePresence>

          <button type="submit" disabled={pwStatus === 'saving'}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
            {pwStatus === 'saving' ? 'Changing...' : 'Change Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
