import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, RefreshCw, LogOut } from 'lucide-react';

export default function LeaseDecisionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leaseId = searchParams.get('leaseId');

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-card/40 backdrop-blur-md border border-border rounded-3xl p-8 text-center space-y-8 shadow-2xl">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">Lease Approaching Expiry</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Your lease agreement is expiring soon. Please choose whether you want to request a renewal or schedule a move-out.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
          <button
            onClick={() => navigate(leaseId ? `/lease-renewal?leaseId=${leaseId}` : '/lease-renewal')}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all group text-center space-y-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <RefreshCw className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Renew Lease</p>
              <p className="text-xs text-muted-foreground mt-1">Submit extension term proposal for manager approval.</p>
            </div>
          </button>

          <button
            onClick={() => navigate(leaseId ? `/move-out?leaseId=${leaseId}` : '/move-out')}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all group text-center space-y-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <LogOut className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Move Out</p>
              <p className="text-xs text-muted-foreground mt-1">Schedule checkout date and complete feedback checklist.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
