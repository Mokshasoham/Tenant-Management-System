import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import useAuthStore from '../context/authStore';
import { authService, userService } from '../services/api';
import { User, Mail, Phone, Shield, Lock, Check, AlertTriangle, Eye, EyeOff, QrCode, Upload, FileText } from 'lucide-react';

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

  // 2FA Setup Form
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [twoFactorMsg, setTwoFactorMsg] = useState('');
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [is2FASetupLoading, setIs2FASetupLoading] = useState(false);

  const handleSetup2FA = async () => {
    setIs2FASetupLoading(true);
    setTwoFactorStatus(null);
    setTwoFactorMsg('');
    try {
      const res = await authService.setup2FA();
      setQrCodeData(res.data.qrCodeUrl);
    } catch (err) {
      setTwoFactorStatus('error');
      setTwoFactorMsg(err.message || 'Failed to setup 2FA');
    } finally {
      setIs2FASetupLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTwoFactorStatus('saving'); setTwoFactorMsg('');
    try {
      await authService.verifyAndEnable2FA({ token: verificationCode });
      if (setUser) setUser({ ...user, twoFactorEnabled: true });
      setTwoFactorStatus('success'); 
      setTwoFactorMsg('Two-Factor Authentication successfully enabled!');
      setQrCodeData(null);
    } catch (err) {
      setTwoFactorStatus('error'); 
      setTwoFactorMsg('Invalid verification code');
    }
  };

  // KYC Upload Form
  const [kycFiles, setKycFiles] = useState([]);
  const [kycStatusMsg, setKycStatusMsg] = useState('');
  const [kycStatusType, setKycStatusType] = useState(null);

  const handleKycFileChange = (e) => {
    setKycFiles(Array.from(e.target.files));
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (kycFiles.length === 0) return;
    
    setKycStatusType('saving');
    setKycStatusMsg('');
    
    const formData = new FormData();
    kycFiles.forEach(file => {
      formData.append('documents', file);
    });

    try {
      const res = await userService.uploadKycDocuments(formData);
      if (setUser) {
        setUser({ 
          ...user, 
          kycStatus: res.data.kycStatus, 
          kycDocuments: res.data.kycDocuments 
        });
      }
      setKycStatusType('success');
      setKycStatusMsg('KYC Documents uploaded successfully. Pending verification.');
      setKycFiles([]);
    } catch (err) {
      setKycStatusType('error');
      setKycStatusMsg(err.message || 'Failed to upload documents');
    }
  };

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

      {/* Two-Factor Authentication */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="p-6 rounded-2xl border border-border bg-card shadow-sm">
        <h2 className="text-base font-black text-foreground mb-5 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-emerald-500" /> Two-Factor Authentication
        </h2>
        
        {user?.twoFactorEnabled ? (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center gap-3">
            <Check className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold text-sm">2FA is currently enabled for this account.</p>
              <p className="text-xs opacity-80 font-medium">Your login process requires a rolling authenticator token.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground font-medium">Protect your account by adding an additional layer of security. We support Google Authenticator, Authy, and more.</p>
            
            {!qrCodeData ? (
              <button 
                onClick={handleSetup2FA} 
                disabled={is2FASetupLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50"
              >
                {is2FASetupLoading ? 'Generating QR Code...' : 'Enable 2FA Authenticator'}
              </button>
            ) : (
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div className="bg-white p-4 rounded-xl inline-block border border-gray-200 shadow-sm mx-auto flex items-center justify-center">
                  <img src={qrCodeData} alt="2FA QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-center font-bold text-muted-foreground">Scan this QR Code with your authenticator app.</p>
                <div className="pt-2">
                  <InputField 
                    label="Verification Code" 
                    type="text" 
                    required 
                    value={verificationCode} 
                    onChange={v => setVerificationCode(v)} 
                    icon={Shield} 
                  />
                </div>
                <button type="submit" disabled={twoFactorStatus === 'saving'}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
                  {twoFactorStatus === 'saving' ? 'Verifying...' : 'Verify & Enable Security Layer'}
                </button>
              </form>
            )}
            
            <AnimatePresence>
              {twoFactorStatus && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className={`p-3 rounded-xl border text-sm flex items-center gap-2 mt-4 ${twoFactorStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-500'
                    }`}>
                  {twoFactorStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                  {twoFactorMsg}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* KYC Verification */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="p-6 rounded-2xl border border-border bg-card shadow-sm mt-6">
        <h2 className="text-base font-black text-foreground mb-5 flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-500" /> Identity Verification (KYC)
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Verification Status</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.kycStatus || 'unverified'}</p>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
              user?.kycStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
              user?.kycStatus === 'pending' ? 'bg-amber-500/10 text-amber-500' :
              user?.kycStatus === 'rejected' ? 'bg-rose-500/10 text-rose-500' :
              'bg-slate-500/10 text-slate-500 dark:bg-slate-500/20 dark:text-slate-400'
            }`}>
              {user?.kycStatus || 'Unverified'}
            </div>
          </div>

          {(user?.kycStatus === 'unverified' || user?.kycStatus === 'rejected' || !user?.kycStatus) && (
            <form onSubmit={handleKycSubmit} className="space-y-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground font-medium">Please upload valid identity documents (e.g. Passport, National ID, Driver's License) to verify your account.</p>
              
              <div className="border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center bg-muted/30">
                <Upload className="w-8 h-8 text-muted-foreground mb-3" />
                <label className="cursor-pointer text-sm font-bold text-primary hover:underline">
                  Browse Files
                  <input type="file" multiple accept="image/*,.pdf" className="hidden" onChange={handleKycFileChange} />
                </label>
                <p className="text-xs text-muted-foreground mt-1">Images or PDFs, max 5MB each.</p>
              </div>
              
              {kycFiles.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Selected Files ({kycFiles.length})</p>
                  {kycFiles.map((f, i) => (
                    <div key={i} className="flex items-center text-sm px-3 py-2 bg-muted rounded-lg border border-border">
                      <FileText className="w-4 h-4 mr-2 text-primary" />
                      <span className="truncate flex-1">{f.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={kycStatusType === 'saving' || kycFiles.length === 0}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black hover:opacity-90 transition-all disabled:opacity-50">
                {kycStatusType === 'saving' ? 'Uploading...' : 'Submit Documents'}
              </button>
            </form>
          )}

          <AnimatePresence>
            {kycStatusType && (
              <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className={`p-3 rounded-xl border text-sm flex items-center gap-2 mt-2 ${
                  kycStatusType === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
                  'bg-rose-500/10 border-rose-500/20 text-rose-500'
                }`}>
                {kycStatusType === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {kycStatusMsg}
              </motion.div>
            )}
          </AnimatePresence>

          {user?.kycDocuments?.length > 0 && (
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Uploaded Documents</p>
              <div className="grid grid-cols-2 gap-2">
                {user.kycDocuments.map((doc, idx) => (
                  <a key={idx} href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${doc}`} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm p-3 bg-muted rounded-lg border border-border hover:border-primary transition-colors hover:text-primary">
                    <FileText className="w-4 h-4 mr-2" /> Document {idx + 1}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>

    </div>
  );
}
