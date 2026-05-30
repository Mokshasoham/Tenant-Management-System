import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    CreditCard, CheckCircle2, XCircle, Clock, 
    AlertCircle, Search, Filter, ArrowUpRight,
    User, Building2, Calendar
} from 'lucide-react';
import { payoutService } from '../../services/api';
import { cn } from '../../utils/cn';

export default function AdminPayouts() {
    const [payouts, setPayouts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [processingId, setProcessingId] = useState(null);

    const fetchPayouts = async () => {
        setLoading(true);
        try {
            const res = await payoutService.getAllPayouts(filter === 'all' ? '' : filter);
            setPayouts(res.data);
        } catch (error) {
            console.error('Failed to fetch payouts:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayouts();
    }, [filter]);

    const handleAction = async (id, action) => {
        setProcessingId(id);
        try {
            if (action === 'approve') {
                await payoutService.approvePayout(id);
            } else {
                const reason = prompt('Reason for rejection:');
                if (!reason) {
                    setProcessingId(null);
                    return;
                }
                await payoutService.rejectPayout(id, reason);
            }
            fetchPayouts();
        } catch (error) {
            alert(error.response?.data?.message || `Failed to ${action} payout`);
        } finally {
            setProcessingId(null);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'completed': return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
            case 'approved': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'pending': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'rejected': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            default: return 'text-muted-foreground bg-muted border-border';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-muted/50 border border-border w-fit">
                    {['pending', 'approved', 'completed', 'rejected', 'all'].map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={cn(
                                "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all",
                                filter === f ? "bg-white text-violet-600 shadow-sm dark:bg-card dark:text-violet-400" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                        type="text"
                        placeholder="Search for owner or request ID..."
                        className="bg-white/5 border border-border rounded-xl py-2 pl-10 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-violet-500/50 w-full md:w-64"
                    />
                </div>
            </div>

            <div className="rounded-3xl border border-border bg-card/40 backdrop-blur-sm overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-border bg-muted/5">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Owner / Request ID</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Date Requested</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="5" className="px-6 py-4"><div className="h-12 bg-white/5 rounded-xl" /></td>
                                </tr>
                            ))
                        ) : payouts.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-20 text-center text-muted-foreground font-bold italic">
                                    No payout requests found in this category.
                                </td>
                            </tr>
                        ) : (
                            payouts.map((p) => (
                                <motion.tr 
                                    key={p._id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="border-b border-border/50 hover:bg-white/3 transition-colors group"
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-500 font-black text-[10px]">
                                                {p.owner?.firstName?.[0]}{p.owner?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground">{p.owner?.firstName} {p.owner?.lastName}</p>
                                                <p className="text-[10px] text-muted-foreground font-mono">ID: {p._id.slice(-8)}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-black text-foreground">₹{p.amount.toLocaleString('en-IN')}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[9px] font-black uppercase", getStatusStyle(p.status))}>
                                            {p.status === 'pending' && <Clock className="w-3 h-3" />}
                                            {p.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                            {p.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                                            {p.status === 'rejected' && <XCircle className="w-3 h-3" />}
                                            {p.status}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-muted-foreground font-medium">
                                            <Calendar className="w-3 h-3" />
                                            <span className="text-xs">{new Date(p.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        {p.status === 'pending' ? (
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button 
                                                    onClick={() => handleAction(p._id, 'approve')}
                                                    disabled={processingId === p._id}
                                                    className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                                                    title="Approve Payout"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handleAction(p._id, 'reject')}
                                                    disabled={processingId === p._id}
                                                    className="p-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                                    title="Reject Payout"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button className="p-2 rounded-lg bg-white/5 text-muted-foreground hover:bg-white/10 transition-all cursor-default">
                                                <Info className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 rounded-2xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-4">
                    <div className="p-2 rounded-xl bg-violet-500/20">
                        <ArrowUpRight className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                        <p className="text-xs font-black text-violet-500 uppercase tracking-widest mb-1">Stripe Connect</p>
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Approving a payout initiates a transfer via Stripe Connect. Ensure the owner has a connected account.
                        </p>
                    </div>
                </div>
                {/* Other info cards... */}
            </div>
        </div>
    );
}

function Info({ className }) {
    return <AlertCircle className={className} />;
}
