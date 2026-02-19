import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Scale, Check, X, Star, MapPin, Bed, Bath, Maximize, ArrowLeft, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    const [selected, setSelected] = useState(compareList);

    const remove = (id) => {
        setSelected(prev => prev.filter(p => p._id !== id));
        if (onRemove) onRemove(id);
    };

    if (selected.length === 0) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-page)' }}>
                <div className="text-7xl mb-6">⚖️</div>
                <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Nothing to Compare</h2>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>Browse properties and click "Compare" to add them here.</p>
                <button
                    onClick={() => navigate('/browse')}
                    className="btn-glow px-6 py-3 rounded-xl font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                    Browse Properties
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6" style={{ background: 'var(--bg-page)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-xl"
                        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                            <Scale className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Compare Properties</h1>
                            <p style={{ color: 'var(--text-secondary)' }}>Side-by-side comparison of {selected.length} properties</p>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="overflow-x-auto rounded-2xl" style={{ border: '1px solid var(--border-color)' }}>
                    <table className="w-full">
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <th className="p-4 text-left w-40" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>Feature</th>
                                {selected.map((prop) => (
                                    <th key={prop._id} className="p-4 min-w-[220px]" style={{ background: 'var(--bg-card)' }}>
                                        <div className="relative">
                                            <button
                                                onClick={() => remove(prop._id)}
                                                className="absolute -top-1 -right-1 p-1 rounded-lg text-red-400 hover:bg-red-500/20"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                            <img
                                                src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=200'}
                                                alt={prop.name}
                                                className="w-full h-32 object-cover rounded-xl mb-3"
                                            />
                                            <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{prop.name}</p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{prop.city}</p>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {COMPARE_FEATURES.map((feat, idx) => {
                                const bestVal = getBestValue(feat.key, selected);
                                return (
                                    <tr
                                        key={feat.key}
                                        style={{
                                            background: idx % 2 === 0 ? 'var(--bg-card)' : 'var(--bg-page)',
                                            borderBottom: '1px solid var(--border-color)',
                                        }}
                                    >
                                        <td className="p-4 font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {feat.label}
                                        </td>
                                        {selected.map((prop) => {
                                            const val = prop[feat.key];
                                            const isGreen = bestVal !== null && val === bestVal;
                                            return (
                                                <td key={prop._id} className="p-4 text-center">
                                                    <span
                                                        className="inline-block px-3 py-1 rounded-lg text-sm font-semibold"
                                                        style={{
                                                            background: isGreen ? 'rgba(16,185,129,0.15)' : 'transparent',
                                                            color: isGreen ? '#10b981' : 'var(--text-primary)',
                                                        }}
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
                            <tr style={{ background: 'var(--bg-card)', borderBottom: '1px solid var(--border-color)' }}>
                                <td className="p-4 font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Amenities</td>
                                {selected.map(prop => (
                                    <td key={prop._id} className="p-4">
                                        <div className="flex flex-wrap gap-1 justify-center">
                                            {(prop.amenities || []).slice(0, 5).map(a => (
                                                <span key={a} className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.15)', color: '#6366f1' }}>
                                                    {a}
                                                </span>
                                            ))}
                                            {prop.amenities?.length > 5 && (
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{prop.amenities.length - 5} more</span>
                                            )}
                                        </div>
                                    </td>
                                ))}
                            </tr>

                            {/* CTA row */}
                            <tr style={{ background: 'var(--bg-page)' }}>
                                <td className="p-4" />
                                {selected.map(prop => (
                                    <td key={prop._id} className="p-4">
                                        <button
                                            onClick={() => navigate(`/properties/${prop._id}`)}
                                            className="w-full py-2 rounded-xl btn-glow font-bold text-white text-sm"
                                            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                                        >
                                            View & Book →
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
