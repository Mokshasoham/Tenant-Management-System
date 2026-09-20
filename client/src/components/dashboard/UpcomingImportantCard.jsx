import React from 'react';
import { 
    Calendar, Clock, AlertTriangle, FileText, 
    CreditCard, Wrench, Star, CheckCircle2, 
    ChevronRight, Sparkles, Layers 
} from 'lucide-react';
import { cn } from '../../utils/cn';

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function UpcomingImportantCard({
    activeLeases = [],
    activePaymentsToShow = [],
    payments = [],
    maintenance = [],
    feedbackEligibility = null,
    navigate,
    loading = false
}) {
    // 1. Lease Expiry / Renewal Item
    let leaseExpiryItem = null;
    if (activeLeases && activeLeases.length > 0) {
        const primaryLease = activeLeases[0];
        if (primaryLease?.endDate) {
            const end = new Date(primaryLease.endDate);
            const now = new Date();
            const diffTime = end.getTime() - now.getTime();
            const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (daysLeft >= 0) {
                let badgeStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
                let badgeLabel = 'Active';

                if (daysLeft <= 14) {
                    badgeStyle = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
                    badgeLabel = 'Urgent';
                } else if (daysLeft <= 30) {
                    badgeStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
                    badgeLabel = 'Expiring Soon';
                } else if (daysLeft <= 60) {
                    badgeStyle = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                    badgeLabel = 'Renewal Soon';
                }

                leaseExpiryItem = {
                    id: 'lease-expiry',
                    title: 'Lease Expiry',
                    subtitle: `Expires ${formatDate(primaryLease.endDate)} (${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left)`,
                    extra: primaryLease.property?.name || primaryLease.propertyName || 'Active Lease',
                    badge: { label: badgeLabel, style: badgeStyle },
                    icon: FileText,
                    iconBg: 'bg-indigo-500/10 text-indigo-400',
                    onClick: () => navigate && navigate('/my-lease')
                };
            }
        }
    }

    // 2. Rent Payment Item
    let rentPaymentItem = null;
    const overdueBill = (payments || []).find(p => p.status === 'overdue');
    const pendingBill = (payments || []).find(p => ['pending', 'partially_paid', 'generated'].includes(p.status));
    const nextScheduled = (activePaymentsToShow || []).length > 0 ? activePaymentsToShow[0] : null;

    if (overdueBill) {
        const amt = overdueBill.totalDue ?? overdueBill.amount ?? 0;
        rentPaymentItem = {
            id: 'rent-overdue',
            title: 'Rent Overdue',
            subtitle: `Due ${formatDate(overdueBill.dueDate)} • ₹${Number(amt).toLocaleString('en-IN')}`,
            extra: overdueBill.property?.name || overdueBill.propertyName || nextScheduled?.propertyName || 'Rental Payment',
            badge: { label: 'Overdue', style: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
            icon: AlertTriangle,
            iconBg: 'bg-rose-500/10 text-rose-500',
            onClick: () => navigate && navigate('/pay-now')
        };
    } else if (pendingBill) {
        const amt = pendingBill.totalDue ?? pendingBill.amount ?? 0;
        rentPaymentItem = {
            id: 'rent-pending',
            title: 'Rent Payment Due',
            subtitle: `Due ${formatDate(pendingBill.dueDate)} • ₹${Number(amt).toLocaleString('en-IN')}`,
            extra: pendingBill.property?.name || pendingBill.propertyName || nextScheduled?.propertyName || 'Rental Payment',
            badge: { label: 'Due Soon', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
            icon: CreditCard,
            iconBg: 'bg-amber-500/10 text-amber-500',
            onClick: () => navigate && navigate('/pay-now')
        };
    } else if (nextScheduled && nextScheduled.dueDate) {
        const amt = nextScheduled.totalDue ?? nextScheduled.amount ?? 0;
        let badgeStyle = 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
        let badgeLabel = 'Scheduled';

        if (nextScheduled.isOverdue) {
            badgeStyle = 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            badgeLabel = 'Overdue';
        } else if (nextScheduled.isDueToday) {
            badgeStyle = 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            badgeLabel = 'Due Today';
        }

        rentPaymentItem = {
            id: 'rent-scheduled',
            title: 'Next Rent Payment',
            subtitle: `Due ${formatDate(nextScheduled.dueDate)} • ₹${Number(amt).toLocaleString('en-IN')}`,
            extra: nextScheduled.propertyName || 'Rental Payment',
            badge: { label: badgeLabel, style: badgeStyle },
            icon: CreditCard,
            iconBg: 'bg-emerald-500/10 text-emerald-500',
            onClick: () => navigate && navigate('/pay-now')
        };
    }

    // 3. Feedback Item
    let feedbackItem = null;
    if (feedbackEligibility) {
        if (feedbackEligibility.status === 'DUE') {
            feedbackItem = {
                id: 'feedback-due',
                title: `Feedback Due (Period #${feedbackEligibility.periodIndex || 1})`,
                subtitle: `Review your stay at ${feedbackEligibility.propertyName || 'your rental'}`,
                extra: feedbackEligibility.periodEnd ? `Deadline: ${formatDate(feedbackEligibility.periodEnd)}` : '',
                badge: { label: 'Action Required', style: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
                icon: Star,
                iconBg: 'bg-amber-500/10 text-amber-500',
                onClick: () => navigate && navigate('/my-lease?openFeedback=true')
            };
        } else if (feedbackEligibility.status === 'UPCOMING') {
            const days = feedbackEligibility.daysUntilAvailable;
            feedbackItem = {
                id: 'feedback-upcoming',
                title: 'Upcoming Feedback',
                subtitle: days ? `Opens in ${days} ${days === 1 ? 'day' : 'days'} (${formatDate(feedbackEligibility.nextFeedbackAt)})` : `Opens ${formatDate(feedbackEligibility.nextFeedbackAt)}`,
                extra: feedbackEligibility.propertyName || '',
                badge: { label: 'Upcoming', style: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
                icon: Star,
                iconBg: 'bg-indigo-500/10 text-indigo-400',
                onClick: () => navigate && navigate('/my-lease')
            };
        } else if (feedbackEligibility.status === 'SUBMITTED' && feedbackEligibility.nextFeedbackAt) {
            feedbackItem = {
                id: 'feedback-next',
                title: 'Next Feedback Review',
                subtitle: `Opens ${formatDate(feedbackEligibility.nextFeedbackAt)}`,
                extra: feedbackEligibility.propertyName || '',
                badge: { label: 'Scheduled', style: 'bg-muted text-muted-foreground border-border' },
                icon: Star,
                iconBg: 'bg-muted text-muted-foreground',
                onClick: () => navigate && navigate('/my-lease')
            };
        }
    }

    // 4. Maintenance Requests Item
    let maintenanceItem = null;
    const activeRequests = (maintenance || []).filter(
        m => !['resolved', 'cancelled', 'completed', 'closed'].includes((m.status || '').toLowerCase())
    );

    if (activeRequests.length > 0) {
        const latest = activeRequests[0];
        const isUrgent = latest.priority === 'emergency' || latest.priority === 'high';
        maintenanceItem = {
            id: 'maintenance-active',
            title: `${activeRequests.length} Active Maintenance Request${activeRequests.length > 1 ? 's' : ''}`,
            subtitle: `Latest: "${latest.title || latest.issue || 'Request #' + (latest.ticketId || latest._id?.slice(-5) || '')}"`,
            extra: latest.category ? `Category: ${latest.category}` : (latest.property?.name || ''),
            badge: {
                label: isUrgent ? 'High Priority' : (latest.status ? latest.status.replace(/_/g, ' ') : 'Active'),
                style: isUrgent ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-blue-500/10 text-blue-500 border-blue-500/20 capitalize'
            },
            icon: Wrench,
            iconBg: isUrgent ? 'bg-rose-500/10 text-rose-500' : 'bg-blue-500/10 text-blue-500',
            onClick: () => navigate && navigate('/maintenance')
        };
    }

    // Compile items in strict priority order:
    // 1. Lease Expiry -> 2. Rent Payment -> 3. Feedback -> 4. Maintenance
    const items = [leaseExpiryItem, rentPaymentItem, feedbackItem, maintenanceItem].filter(Boolean);

    return (
        <div className="bg-card border border-border rounded-2xl p-4 flex flex-col h-full overflow-hidden relative shadow-sm">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/5 blur-2xl -mr-10 -mt-10 rounded-full pointer-events-none" />

            {/* Card Header */}
            <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2.5 shrink-0 relative z-10">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                        <h2 className="text-xs font-black text-foreground tracking-tight">Upcoming & Important</h2>
                        <p className="text-[9px] text-muted-foreground/70 leading-none mt-0.5">Action items & reminders</p>
                    </div>
                </div>
                {items.length > 0 && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">
                        {items.length}
                    </span>
                )}
            </div>

            {/* Body */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
            ) : items.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-2 relative z-10">
                    <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-2 shadow-sm">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-foreground">You're all caught up</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-0.5 max-w-[200px]">
                        No urgent tasks or pending deadlines right now.
                    </p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar relative z-10">
                    {items.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={item.onClick}
                                className="w-full text-left p-2.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/50 hover:border-border transition-all duration-200 flex items-start gap-2.5 group"
                            >
                                <div className={cn("p-1.5 rounded-lg shrink-0 mt-0.5", item.iconBg)}>
                                    <IconComponent className="w-3.5 h-3.5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-1.5 mb-0.5">
                                        <span className="text-[11px] font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                            {item.title}
                                        </span>
                                        <span className={cn("text-[8px] font-black px-1.5 py-0.5 rounded-md border uppercase tracking-wider shrink-0", item.badge.style)}>
                                            {item.badge.label}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {item.subtitle}
                                    </p>
                                    {item.extra && (
                                        <p className="text-[9px] text-muted-foreground/60 font-medium truncate mt-0.5">
                                            {item.extra}
                                        </p>
                                    )}
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 group-hover:text-foreground/70 transition-colors shrink-0 self-center" />
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
