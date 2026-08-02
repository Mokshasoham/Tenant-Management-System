import React, { useState, memo } from 'react';
import { Lock, Eye, EyeOff, Check, AlertTriangle } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import EditableField from './primitives/EditableField';
import ActionButton from './primitives/ActionButton';
import { authService } from '../../services/api';

export const ChangePasswordCard = memo(({ disabled = false }) => {
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [pwStatus, setPwStatus] = useState(null); // null | 'saving' | 'success' | 'error'
  const [pwMsg, setPwMsg] = useState('');
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pw.next !== pw.confirm) {
      setPwStatus('error');
      setPwMsg('New passwords do not match');
      return;
    }
    if (pw.next.length < 8) {
      setPwStatus('error');
      setPwMsg('Password must be at least 8 characters');
      return;
    }

    setPwStatus('saving');
    setPwMsg('');

    try {
      await authService.changePassword({ currentPassword: pw.current, newPassword: pw.next });
      setPwStatus('success');
      setPwMsg('Password changed successfully!');
      setPw({ current: '', next: '', confirm: '' });
      setTimeout(() => setPwStatus(null), 3500);
    } catch (err) {
      setPwStatus('error');
      setPwMsg(err.response?.data?.message || err.message || 'Failed to change password');
    }
  };

  return (
    <SettingsCard
      title="Security & Password"
      subtitle="Update your account security credentials"
      icon={Lock}
      iconColor="text-amber-500"
    >
      <form onSubmit={handlePasswordChange} className="space-y-4">
        {['current', 'next', 'confirm'].map(k => (
          <EditableField
            key={k}
            label={k === 'current' ? 'Current Password' : k === 'next' ? 'New Password' : 'Confirm New Password'}
            type={showPw[k] ? 'text' : 'password'}
            required
            value={pw[k]}
            onChange={v => setPw(p => ({ ...p, [k]: v }))}
            icon={Lock}
            disabled={disabled || pwStatus === 'saving'}
            rightEl={
              <button
                type="button"
                onClick={() => setShowPw(p => ({ ...p, [k]: !p[k] }))}
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                {showPw[k] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />
        ))}

        {pwStatus && (
          <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
            pwStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
            'bg-rose-500/10 border-rose-500/20 text-rose-500'
          }`}>
            {pwStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{pwMsg}</span>
          </div>
        )}

        <ActionButton
          type="submit"
          loading={pwStatus === 'saving'}
          disabled={disabled || !pw.current || !pw.next || !pw.confirm}
          className="w-full py-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:opacity-90 text-white"
        >
          {pwStatus === 'saving' ? 'Updating Password...' : 'Update Password'}
        </ActionButton>
      </form>
    </SettingsCard>
  );
});

ChangePasswordCard.displayName = 'ChangePasswordCard';
export default ChangePasswordCard;
