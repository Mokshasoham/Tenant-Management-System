import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldAlert, RefreshCw, LogOut, ArrowLeft, Clock, AlertTriangle } from 'lucide-react';
import apiClient from '../services/apiClient';

export default function LeaseDecisionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leaseId = searchParams.get('leaseId');

  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaseData = async () => {
      setLoading(true);
      try {
        let current = null;
        if (leaseId) {
          const res = await apiClient.get(`/leases/${leaseId}`);
          current = res?.data || res;
        } else {
          const res = await apiClient.get('/leases/my-lease');
          current = res?.data || res;
        }
        setLease(current);
      } catch (err) {
        console.error('Error fetching lease for decision:', err);
        setError('Failed to load lease parameters.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaseData();
  }, [leaseId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  const endMs = lease?.endDate ? new Date(lease.endDate).getTime() : 0;
  const nowMs = Date.now();
  const daysRemaining = endMs ? Math.ceil((endMs - nowMs) / (1000 * 60 * 60 * 24)) : 0;
  const isDecisionDeadlinePassed = daysRemaining <= 0;
  const canRenew = (lease?.lifecycle?.canRenew !== undefined) 
    ? lease.lifecycle.canRenew 
    : (daysRemaining > 0 && daysRemaining <= 7 && lease?.leaseDecision === 'pending');

  const hasSubmittedRenewal = lease?.leaseDecision === 'renewal_requested';
  const hasSubmittedMoveOut = lease?.leaseDecision === 'moving_out' || lease?.moveOutStatus === 'requested';

  return (
    <div className="min-h-[80vh] flex flex-col justify-center items-center px-4 py-8">
      <div className="w-full max-w-2xl bg-card/60 backdrop-blur-md border border-border rounded-3xl p-6 sm:p-10 text-center space-y-7 shadow-2xl">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(leaseId ? `/my-lease?leaseId=${leaseId}` : '/my-lease')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground text-xs font-black uppercase tracking-wider transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Lease
          </button>
          {lease?.property?.name && (
            <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              {lease.property.name}
            </span>
          )}
        </div>

        <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            {isDecisionDeadlinePassed ? 'Lease Term Expired' : 'Lease Approaching Expiry'}
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm leading-relaxed">
            {isDecisionDeadlinePassed ? (
              <span className="text-rose-500 dark:text-rose-400 font-semibold">
                The renewal deadline for this lease has passed. Please schedule your Move Out.
              </span>
            ) : (
              <span>
                Your lease agreement expires in <strong className="text-foreground">{daysRemaining} days</strong>. 
                Please choose your preference before expiration.
              </span>
            )}
          </p>
        </div>

        {/* Existing Decision State Banner */}
        {hasSubmittedRenewal && (
          <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-2.5 justify-center">
            <Clock className="w-4 h-4" />
            <span>Renewal request already submitted and under review by management.</span>
          </div>
        )}

        {hasSubmittedMoveOut && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center gap-2.5 justify-center">
            <LogOut className="w-4 h-4" />
            <span>Move-out notice already submitted. Awaiting checkout inspection.</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
          {/* Renew Lease Button */}
          <button
            disabled={!canRenew}
            onClick={() => {
              if (canRenew) {
                navigate(leaseId ? `/lease-renewal?leaseId=${leaseId}` : '/lease-renewal');
              }
            }}
            className={`flex flex-col items-center justify-center p-6 rounded-2xl border text-center space-y-4 transition-all ${
              canRenew
                ? 'border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 group cursor-pointer'
                : 'border-border/60 bg-muted/20 opacity-50 cursor-not-allowed'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform ${
              canRenew ? 'bg-emerald-500/10 group-hover:scale-110 text-emerald-500' : 'bg-muted text-muted-foreground'
            }`}>
              <RefreshCw className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Renew Lease</p>
              <p className="text-xs text-muted-foreground mt-1">
                {canRenew 
                  ? 'Submit extension term proposal for manager approval.' 
                  : (isDecisionDeadlinePassed ? 'Renewal window closed (Deadline passed)' : 'Decision already submitted')}
              </p>
            </div>
          </button>

          {/* Move Out Button */}
          <button
            onClick={() => navigate(leaseId ? `/move-out?leaseId=${leaseId}` : '/move-out')}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/40 transition-all group text-center space-y-4 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform text-amber-500">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Move Out</p>
              <p className="text-xs text-muted-foreground mt-1">
                Schedule checkout date and complete feedback checklist.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
