import React, { useState, memo } from 'react';
import { QrCode, Shield, Check, AlertTriangle } from 'lucide-react';
import SettingsCard from './primitives/SettingsCard';
import EditableField from './primitives/EditableField';
import ActionButton from './primitives/ActionButton';
import useAuthStore from '../../context/authStore';
import { authService } from '../../services/api';

export const TwoFactorCard = memo(({ disabled = false }) => {
  const { user, setUser } = useAuthStore();
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
      setTwoFactorMsg(err.response?.data?.message || err.message || 'Failed to setup 2FA');
    } finally {
      setIs2FASetupLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setTwoFactorStatus('saving');
    setTwoFactorMsg('');
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

  return (
    <SettingsCard
      title="Two-Factor Authentication"
      subtitle="Add an extra layer of security to your account"
      icon={QrCode}
      iconColor="text-emerald-500"
    >
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
            <ActionButton
              onClick={handleSetup2FA}
              loading={is2FASetupLoading}
              disabled={disabled}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white"
            >
              Enable 2FA Authenticator
            </ActionButton>
          ) : (
            <form onSubmit={handleVerify2FA} className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-center max-w-[220px] mx-auto">
                <img src={qrCodeData} alt="2FA QR Code" className="w-44 h-44" />
              </div>
              <p className="text-xs text-center font-bold text-muted-foreground">Scan this QR Code with your authenticator app.</p>
              
              <EditableField
                label="Verification Code"
                type="text"
                required
                value={verificationCode}
                onChange={v => setVerificationCode(v)}
                icon={Shield}
                placeholder="123456"
              />

              <ActionButton
                type="submit"
                loading={twoFactorStatus === 'saving'}
                disabled={disabled || !verificationCode}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white"
              >
                Verify & Enable 2FA
              </ActionButton>
            </form>
          )}

          {twoFactorStatus && (
            <div className={`p-3 rounded-xl border text-sm flex items-center gap-2 ${
              twoFactorStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' :
              'bg-rose-500/10 border-rose-500/20 text-rose-500'
            }`}>
              {twoFactorStatus === 'success' ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              <span>{twoFactorMsg}</span>
            </div>
          )}
        </div>
      )}
    </SettingsCard>
  );
});

TwoFactorCard.displayName = 'TwoFactorCard';
export default TwoFactorCard;
