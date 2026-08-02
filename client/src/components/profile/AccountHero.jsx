import React, { memo } from 'react';
import { Camera, Shield, Download, Share2, User } from 'lucide-react';
import StatusBadge from './primitives/StatusBadge';
import ActionButton from './primitives/ActionButton';

const ROLE_COLORS = {
  admin: { from: 'from-violet-500', to: 'to-purple-600', text: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  manager: { from: 'from-blue-500', to: 'to-cyan-600', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  tenant: { from: 'from-emerald-500', to: 'to-teal-600', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
};

export const AccountHero = memo(({
  user,
  completionPercentage = 0,
  onOpenAvatarModal,
  onDownloadPDF,
  onEditProfile
}) => {
  const rc = ROLE_COLORS[user?.role] || ROLE_COLORS.tenant;
  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();
  const fullName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Tenant User';
  const memberSince = user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—';

  // Computed display status badges
  const kycVariant = user?.kycStatus === 'verified' || user?.kycStatus === 'approved' ? 'success'
    : user?.kycStatus === 'pending' ? 'warning' : 'neutral';

  return (
    <div className="p-6 md:p-8 rounded-3xl border border-border bg-card shadow-sm transition-all relative overflow-hidden">
      {/* Background Subtle Gradient Glow */}
      <div className={`absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br ${rc.from} ${rc.to} opacity-10 rounded-full blur-3xl pointer-events-none`} />

      <div className="flex flex-col lg:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* Left: Avatar & Personal Identity */}
        <div className="flex items-center gap-5 w-full lg:w-auto">
          {/* Avatar with Upload Trigger Overlay */}
          <div className="relative group flex-shrink-0">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={fullName}
                className="w-24 h-24 rounded-2xl object-cover border-2 border-border shadow-md"
              />
            ) : (
              <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${rc.from} ${rc.to} flex items-center justify-center text-3xl font-black text-white shadow-md`}>
                {initials || <User className="w-10 h-10" />}
              </div>
            )}
            
            <button
              type="button"
              onClick={onOpenAvatarModal}
              title="Upload / Change Profile Photo"
              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
              <span>Change</span>
            </button>
          </div>

          {/* User Display Info */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-foreground">{fullName}</h1>
              <StatusBadge label={user?.role || 'tenant'} variant="info" icon={false} />
            </div>

            <p className="text-sm font-medium text-muted-foreground">{user?.email}</p>

            {/* Display Badges */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <StatusBadge label={user?.kycStatus ? `KYC ${user.kycStatus}` : 'KYC Pending'} variant={kycVariant} />
              {user?.twoFactorEnabled && <StatusBadge label="2FA Enabled" variant="success" />}
            </div>
          </div>
        </div>

        {/* Center: Computed Metadata Summary */}
        <div className="flex items-center gap-6 py-3 px-5 rounded-2xl bg-muted/30 border border-border/60 w-full lg:w-auto justify-around">
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Member Since</p>
            <p className="text-xs font-bold text-foreground mt-0.5">{memberSince}</p>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Tenant ID</p>
            <p className="text-xs font-bold text-foreground font-mono mt-0.5">{user?._id?.slice(-8)?.toUpperCase() || '—'}</p>
          </div>
          <div className="h-8 w-px bg-border/60" />
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Lease Status</p>
            <p className="text-xs font-bold text-emerald-500 mt-0.5">Active</p>
          </div>
        </div>

        {/* Right: Radial Completion Ring & Quick Actions */}
        <div className="flex items-center gap-5 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-border/60 pt-4 lg:pt-0">
          {/* Radial Completion SVG Ring */}
          <div className="flex items-center gap-3">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 transform -rotate-90">
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  className="text-muted/40"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="22"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={138.2}
                  strokeDashoffset={138.2 - (138.2 * completionPercentage) / 100}
                  className="text-emerald-500 transition-all duration-1000 ease-out"
                />
              </svg>
              <span className="absolute text-xs font-black text-foreground">{completionPercentage}%</span>
            </div>
            <div>
              <p className="text-xs font-black text-foreground">Account Score</p>
              <p className="text-[10px] font-bold text-muted-foreground">Profile Rating</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <ActionButton variant="secondary" onClick={onDownloadPDF} icon={Download} title="Download Profile PDF Summary">
              <span className="hidden sm:inline">Summary</span>
            </ActionButton>
            <ActionButton variant="outline" onClick={() => alert('Tenant ID Sharing link copied to clipboard!')} icon={Share2} title="Share Tenant ID">
              <span className="hidden sm:inline">Share</span>
            </ActionButton>
          </div>
        </div>

      </div>
    </div>
  );
});

AccountHero.displayName = 'AccountHero';
export default AccountHero;
