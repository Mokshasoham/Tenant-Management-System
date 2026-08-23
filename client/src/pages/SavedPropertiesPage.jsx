import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Scale, ArrowLeft, ArrowRight, X, AlertCircle, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import useAuthStore from '../context/authStore';
import { GridCard, SkeletonCard } from '../components/property/TenantBrowseProperties';
import handleViewPropertyNavigation from '../utils/propertyNavigationHelper';

const SavedPropertiesPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const user = useAuthStore((state) => state.user);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [savedIds, setSavedIds] = useState(new Set());
    const [compareList, setCompareList] = useState([]);

    // Fetch saved properties strictly for authenticated tenant
    const fetchSaved = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await propertyService.getAllProperties({ savedOnly: true, limit: 100 });
            const rawList = res?.data?.data || res?.data || res || [];
            const list = Array.isArray(rawList) ? rawList : [];

            // Deduplicate strictly by unique property _id
            const uniqueProps = Array.from(
                new Map(list.filter(Boolean).map(p => [String(p._id || p.id), p])).values()
            );

            setProperties(uniqueProps);
            setSavedIds(new Set(uniqueProps.map(p => String(p._id || p.id))));
        } catch (e) {
            console.error('Error fetching saved properties:', e);
            setError('Unable to load saved properties. Please check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSaved();
    }, [fetchSaved]);

    // Handle Unsave: removes immediately from list, savedIds, and compareList
    const handleUnsave = async (propId) => {
        const strId = String(propId);
        setSavedIds(prev => {
            const next = new Set(prev);
            next.delete(strId);
            return next;
        });
        setProperties(prev => prev.filter(p => String(p._id || p.id) !== strId));
        setCompareList(prev => prev.filter(p => String(p._id || p.id) !== strId));

        try {
            await propertyService.saveProperty(propId);
        } catch (e) {
            console.error('Error unsaving property:', e);
            fetchSaved();
        }
    };

    // Toggle property selection for comparison (max 3)
    const toggleCompare = (prop) => {
        const pId = String(prop._id || prop.id);
        setCompareList(prev => {
            if (prev.some(p => String(p._id || p.id) === pId)) {
                return prev.filter(p => String(p._id || p.id) !== pId);
            }
            if (prev.length >= 3) return prev;
            return [...prev, prop];
        });
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8 bg-background pb-32">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="max-w-7xl mx-auto">

                {/* Back Button */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card border border-border/80 text-foreground/80 hover:text-foreground hover:bg-muted text-xs font-black uppercase tracking-wider transition-all shadow-sm group cursor-pointer"
                    >
                        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back</span>
                    </button>
                </div>

                {/* Header */}
                <div className="flex items-center gap-3.5 mb-8">
                    <div className="p-3.5 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 shadow-xl shadow-rose-500/25 flex items-center justify-center">
                        <Heart className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {t('nav.saved') || 'Saved Properties'}
                        </h1>
                        <p className="text-xs font-black text-muted-foreground/60 uppercase tracking-[0.2em] mt-1">
                            {properties.length === 1 ? '1 PROPERTY SAVED' : `${properties.length} PROPERTIES SAVED`}
                        </p>
                    </div>
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {Array(6).fill(0).map((_, i) => <SkeletonCard key={i} />)}
                    </div>
                ) : error ? (
                    /* Error State */
                    <div className="flex flex-col items-center justify-center py-20 text-center bg-card/50 border border-border rounded-3xl p-8 max-w-xl mx-auto">
                        <div className="p-4 rounded-2xl bg-rose-500/10 text-rose-500 mb-4">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h2 className="text-xl font-black text-foreground mb-2">Unable to Load Saved Properties</h2>
                        <p className="text-sm text-muted-foreground mb-6 font-medium">{error}</p>
                        <button
                            onClick={fetchSaved}
                            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all cursor-pointer"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Try Again
                        </button>
                    </div>
                ) : properties.length === 0 ? (
                    /* Empty State */
                    <div className="flex flex-col items-center justify-center py-24 text-center bg-card/30 border border-border/60 rounded-3xl p-8 max-w-lg mx-auto">
                        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 text-rose-500 shadow-inner">
                            <Heart className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-black text-foreground tracking-tight mb-2">No Saved Properties Yet</h2>
                        <p className="text-sm text-muted-foreground font-medium mb-8 max-w-xs leading-relaxed">
                            Save properties from Browse Properties and they will appear here for easy access and comparison.
                        </p>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/browse')}
                            className="px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-rose-500/25 hover:shadow-2xl hover:-translate-y-0.5 transition-all cursor-pointer"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                        >
                            Browse Properties
                        </motion.button>
                    </div>
                ) : (
                    /* Properties Grid: EXACT BROWSE PROPERTY CARD */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                        {properties.map((p, i) => (
                            <GridCard
                                key={p._id || p.id}
                                p={p}
                                index={i}
                                isSaved={savedIds.has(String(p._id || p.id))}
                                inCompare={compareList.some(c => String(c._id || c.id) === String(p._id || p.id))}
                                onSave={() => handleUnsave(p._id || p.id)}
                                onCompare={() => toggleCompare(p)}
                                onClick={() => handleViewPropertyNavigation({ navigate, property: p, role: user?.role })}
                            />
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Compare Tray (Floating sticky bar identical to Browse Properties) */}
            <AnimatePresence>
                {compareList.length > 0 && (
                    <motion.div
                        initial={{ y: 80, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 80, opacity: 0 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-4 px-6 py-3.5 rounded-[1.75rem] bg-primary shadow-2xl shadow-primary/40 border border-white/20"
                    >
                        <Scale className="w-5 h-5 text-white flex-shrink-0" />
                        <span className="text-white font-black text-sm whitespace-nowrap">
                            {compareList.length} propert{compareList.length > 1 ? 'ies' : 'y'} selected
                        </span>
                        <button
                            onClick={() => {
                                try {
                                    localStorage.setItem('tms_compare_properties', JSON.stringify(compareList));
                                } catch (e) {}
                                navigate('/compare', { state: { compareList } });
                            }}
                            className="px-5 py-2 rounded-xl bg-white text-primary font-black text-xs uppercase tracking-widest hover:bg-blue-50 transition-all shadow-md cursor-pointer"
                        >
                            Compare Now →
                        </button>
                        <button
                            onClick={() => setCompareList([])}
                            className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SavedPropertiesPage;
