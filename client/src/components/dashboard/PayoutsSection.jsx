import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Wallet, ArrowDownToLine, History, TrendingUp, 
    CheckCircle2, Clock, XCircle, AlertCircle, Info,
    CreditCard
} from 'lucide-react';
import { payoutService } from '../../services/api';
import { cn } from '../../utils/cn';

export default function PayoutsSection() {
    const [stats, setStats] = useState({ available: 0, totalEarned: 0, pending: 0 });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [requestAmount, setRequestAmount] = useState('');
    const [requesting, setRequesting] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            // In a real app, these would come from specialized endpoints 
            // but for now we aggregate from payout history or a balance endpoint.
            const res = await payoutService.getAllPayouts();
            setHistory(res.data);
            
            // Calculate mock stats based on history for UI demo
            const pending = res.data.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
            const completed = res.data.filter(p => p.status === 'completed' || p.status === 'approved').reduce((s, p) => s + p.amount, 0);
            
            // We'll set a mock available balance for demo if history is empty, 
            // or use logic from backend if we had a dedicated /balance route.
            setStats({
                available: 45000 - pending - completed, // Simulated total earnings pool
                totalEarned: 45000,
                pending: pending
            });
        } catch (error) {
            console.error('Failed to fetch payout data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRequestPayout = async (e) => {
        e.preventDefault();
        if (!requestAmount || parseFloat(requestAmount) <= 0) return;
        
        setRequesting(true);
        setMessage(null);
        try {
            await payoutService.requestPayout({ amount: parseFloat(requestAmount) });
            setMessage({ type: 'success', text: 'Payout request submitted! Awaiting admin approval.' });
            setRequestAmount('');
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit request' });
        } finally {
            setRequesting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case 'approved': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
            case 'pending': return <Clock className="w-4 h-4 text-amber-500" />;
            case 'rejected': return <XCircle className="w-4 h-4 text-rose-500" />;
            default: return <Info className="w-4 h-4 text-muted-foreground" />;
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Balance & Request */}
            <div className="lg:col-span-1 space-y-6">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white shadow-xl"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Wallet size={120} />
                    </div>
                    
                    <p className="text-xs font-black uppercase tracking-widest opacity-70 mb-1">Available to Withdraw</p>
                    <h2 className="text-5xl font-black mb-8">₹{stats.available.toLocaleString('en-IN')}</h2>
                    
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase opacity-60">Total Earned</p>
                            <p className="text-lg font-black">₹{stats.totalEarned.toLocaleString('en-IN')}</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-[10px] font-bold uppercase opacity-60">Pending</p>
                            <p className="text-lg font-black">₹{stats.pending.toLocaleString('en-IN')}</p>
                        </div>
                    </div>
                </motion.div>

                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6">
                    <h3 className="text-sm font-black text-foreground mb-4 flex items-center gap-2">
                        <ArrowDownToLine className="w-4 h-4 text-blue-500" /> Request Payout
                    </h3>
                    
                    <form onSubmit={handleRequestPayout} className="space-y-4">
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-black">₹</span>
                            <input 
                                type="number"
                                value={requestAmount}
                                onChange={(e) => setRequestAmount(e.target.value)}
                                placeholder="Min. ₹500"
                                className="w-full bg-white/5 border border-border rounded-xl py-3 pl-8 pr-4 text-foreground font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                            />
                        </div>
                        
                        <button 
                            disabled={requesting || !requestAmount}
                            className="w-full py-3 rounded-xl bg-blue-500 text-white font-black text-sm hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                        >
                            {requesting ? 'Processing...' : 'Withdraw to Bank'}
                        </button>
                    </form>

                    <AnimatePresence>
                        {message && (
                            <motion.div 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className={cn(
                                    "mt-4 p-3 rounded-lg text-xs font-bold flex items-center gap-2",
                                    message.type === 'success' ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
                                )}
                            >
                                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {message.text}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="mt-6 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />
                        <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Funds are typically transferred to your connected Stripe bank account within 2-3 business days after approval.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right: History */}
            <div className="lg:col-span-2 space-y-4">
                <div className="rounded-2xl border border-border bg-card/40 backdrop-blur-sm p-6 flex flex-col h-full">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                            <History className="w-4 h-4 text-blue-500" /> Withdrawal History
                        </h3>
                    </div>

                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
                            ))
                        ) : history.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                                <History className="w-12 h-12 opacity-20 mb-2" />
                                <p className="text-sm font-bold italic">No payouts requested yet.</p>
                            </div>
                        ) : (
                            history.map((item, i) => (
                                <motion.div 
                                    key={item._id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-transparent hover:border-white/5 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-lg bg-white/5">
                                            <CreditCard className="w-4 h-4 text-muted-foreground group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">₹{item.amount.toLocaleString('en-IN')}</p>
                                            <p className="text-[10px] text-muted-foreground font-medium">Requested on {new Date(item.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/5 border border-white/5">
                                            {getStatusIcon(item.status)}
                                            <span className="text-[9px] font-black uppercase text-foreground/70">{item.status}</span>
                                        </div>
                                        {item.processedAt && (
                                            <p className="text-[8px] text-muted-foreground italic">Processed {new Date(item.processedAt).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
