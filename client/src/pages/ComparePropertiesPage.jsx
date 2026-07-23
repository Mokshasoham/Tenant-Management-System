import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Check, X, Star, MapPin, Bed, Bath, Maximize, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../utils/cn';

const COMPARE_FEATURES = [
    { label: 'Type', key: 'type', format: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : '—' },
    { label: 'City', key: 'city', format: v => v || '—' },
    { label: 'Rent/Month', key: 'rentAmount', format: v => v ? `₹${v.toLocaleString('en-IN')}` : '—' },
    { label: 'Deposit', key: 'depositAmount', format: v => v ? `₹${v.toLocaleString('en-IN')}` : '—' },
    { label: 'Bedrooms', key: 'bedrooms', format: v => v ?? '—' },
    { label: 'Bathrooms', key: 'bathrooms', format: v => v ?? '—' },
    { label: 'Area (sqft)', key: 'squareFeet', format: v => v ? `${v.toLocaleString()} ft²` : '—' },
    { label: 'Furnishing', key: 'furnishing', format: v => v ? v.replace('-', ' ') : '—' },
    { label: 'Floor', key: 'floor', format: v => v ?? '—' },
    { label: 'Rating', key: 'rating', format: v => v > 0 ? `⭐ ${v}/5` : 'Not rated' },
    { label: 'Status', key: 'status', format: v => v || '—' },
    { label: 'Verified', key: 'verifiedBadge', format: v => v ? '✅ Yes' : '❌ No' },
];

// Compare utility: finds best value per row
const getBestValue = (key, properties) => {
    if (key === 'rentAmount' || key === 'depositAmount') {
        const vals = properties.map(p => p[key] || Infinity);
        return Math.min(...vals);
    }
    if (key === 'rating' || key === 'bedrooms' || key === 'bathrooms' || key === 'squareFeet') {
        const vals = properties.map(p => p[key] || -Infinity);
        return Math.max(...vals);
    }
    return null;
};

const ComparePropertiesPage = ({ compareList = [], onRemove }) => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Read compareList from navigation state, fallback to props, then fallback to empty array
    const initialList = location.state?.compareList || compareList || [];
    const [selected, setSelected] = useState(initialList);

    const remove = (id) => {
        setSelected(prev => prev.filter(p => p._id !== id));
        if (onRemove) onRemove(id);
    };

    if (selected.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
                <div className="text-7xl mb-6 grayscale opacity-40">⚖️</div>
                <h2 className="text-3xl font-black text-foreground tracking-tight mb-2">Nothing to Compare</h2>
                <p className="mb-8 text-muted-foreground/60 text-sm font-medium tracking-wide">Browse properties and click "Compare" to add them here.</p>
                <button
                    onClick={() => navigate('/browse')}
                    className="px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] text-white bg-gradient-to-r from-blue-600 to-indigo-600 shadow-xl shadow-blue-600/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
                >
                    Browse Properties
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6 bg-background">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-6 mb-10">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-3 rounded-2xl bg-card border border-border text-foreground hover:bg-muted transition-all shadow-sm group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-4 rounded-[1.5rem] bg-gradient-to-br from-blue-600 to-indigo-700 shadow-xl shadow-blue-600/20">
                            <Scale className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-foreground tracking-tight">Compare Properties</h1>
                            <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-1">Side-by-side comparison of {selected.length} properties</p>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto rounded-[2.5rem] border border-border bg-card shadow-xl">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="p-6 text-left w-48 bg-muted/30 text-muted-foreground text-[11px] font-black uppercase tracking-[0.2em]">Comparison Points</th>
                                {selected.map((prop) => (
                                    <th key={prop._id} className="p-6 min-w-[280px] bg-card">
                                        <div className="relative group">
                                            <button
                                                onClick={() => remove(prop._id)}
                                                className="absolute -top-2 -right-2 p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                            <div className="overflow-hidden rounded-[1.5rem] mb-4 shadow-lg border border-border/50">
                                                <img
                                                    src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=400'}
                                                    alt={prop.name}
                                                    className="w-full h-40 object-cover transform group-hover:scale-110 transition-transform duration-500"
                                                />
                                            </div>
                                            <p className="font-black text-base text-foreground tracking-tight truncate mb-1">{prop.name}</p>
                                            <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em]">{prop.city}</p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {COMPARE_FEATURES.map((feat, idx) => {
                                const bestVal = getBestValue(feat.key, selected);
                                return (
                                    <tr
                                        key={feat.key}
                                        className={idx % 2 === 0 ? 'bg-muted/10' : 'bg-card'}
                                    >
                                        <td className="p-6 font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">
                                            {feat.label}
                                        </td>
                                        {selected.map((prop) => {
                                            const val = prop[feat.key];
                                            const isGreen = bestVal !== null && val === bestVal;
                                            return (
                                                <td key={prop._id} className="p-6 text-center">
                                                    <span
                                                        className={cn(
                                                            "inline-block px-4 py-1.5 rounded-xl text-xs font-black tracking-wide shadow-sm border transition-all",
                                                            isGreen
                                                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                                : 'bg-muted/50 border-transparent text-foreground'
                                                        )}
                                                    >
                                                        {feat.format(val)}
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}

                            {/* Amenities row */}
                            <tr className="bg-muted/20">
                                <td className="p-6 font-black text-[10px] uppercase tracking-[0.15em] text-muted-foreground/40">Included Amenities</td>
                                {selected.map(prop => (
                                    <td key={prop._id} className="p-6">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {(prop.amenities || []).slice(0, 5).map(a => (
                                                <span key={a} className="text-[9px] font-black uppercase tracking-widest px-2.5 py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors">
                                                    {a}
                                                </span>
                                            ))}
                                            {prop.amenities?.length > 5 && (
                                                <span className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest self-center ml-1">+{prop.amenities.length - 5}</span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* CTA row */}
                            <tr className="bg-card">
                                <td className="p-6" />
                                {selected.map(prop => (
                                    <td key={prop._id} className="p-6">
                                        <button
                                            onClick={() => navigate(`/properties/${prop._id}`)}
                                            className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-600/20 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95"
                                        >
                                            View & Book Property
                                        </button>
                                    </td>
                                ))}
                            </tr>
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </div>
    );
};

export default ComparePropertiesPage;
