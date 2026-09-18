import React from 'react';
import { MessageSquare, Clock, ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '../../utils/cn';

/**
 * Formats an ISO date string to readable format e.g. "29 Aug 2026"
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return '';
    }
}

/**
 * LeaseFeedbackCard:
 * Authoritative feedback status indicator embedded naturally inside the active lease card.
 * All status decisions and dates are supplied strictly by the backend eligibility API.
 */
export default function LeaseFeedbackCard({ eligibility, loading, onOpenModal }) {
    if (loading) {
        return (
            <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm animate-pulse flex items-center justify-between">
                <div className="space-y-2">
                    <div className="h-3 w-32 bg-white/10 rounded-full" />
                    <div className="h-2.5 w-48 bg-white/5 rounded-full" />
                </div>
                <div className="h-8 w-24 bg-white/10 rounded-xl" />
            </div>
        );
    }

    if (!eligibility || eligibility.status === 'NOT_ELIGIBLE') {
        return null;
    }

    const { status, periodIndex, periodStart, periodEnd, nextFeedbackAt, daysUntilAvailable } = eligibility;

    if (status === 'DUE') {
        const startFormatted = formatDate(periodStart);
        const endFormatted = formatDate(periodEnd);

        return (
            <div className="mb-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-600/20 border border-emerald-400/40 backdrop-blur-md shadow-lg shadow-emerald-950/20 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 flex-shrink-0 shadow-inner">
                            <MessageSquare className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-black uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Feedback Due
                                </span>
                                {periodIndex && (
                                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded-md">
                                        Period #{periodIndex}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs sm:text-sm text-white/90 font-medium mt-1">
                                Share your verified experience for {startFormatted} – {endFormatted}.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onOpenModal}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-400/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                    >
                        <span>Give Feedback</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    if (status === 'SUBMITTED') {
        // SUBMITTED remains an authoritative backend state for eligibility, duplicate prevention, and scheduler.
        // As requested: Do NOT display the "FEEDBACK RECORDED" confirmation card on My Lease.
        // The tenant receives confirmation exclusively via the Notification system.
        return null;
    }

    if (status === 'UPCOMING') {
        const nextDateFormatted = formatDate(nextFeedbackAt);

        return (
            <div className="mb-6 p-3.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-white/10 text-white/60 flex-shrink-0">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-wider text-white/70">
                            Feedback Upcoming
                        </p>
                        <p className="text-[11px] text-white/50 font-medium">
                            First feedback becomes available on {nextDateFormatted} ({daysUntilAvailable || 7} days remaining).
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}
