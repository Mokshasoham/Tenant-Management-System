import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Heart, MapPin, Bed, Bath, Maximize, Star, ArrowRight, 
    Trash2, Loader2, Scale, Check, X, ArrowLeft, Building2, 
    AlertCircle, RefreshCw 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../utils/cn';
import { getDisplayStatus } from '../utils/propertyHelper';

const DEFAULT_PROPERTY_IMAGE = 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&auto=format&fit=crop&q=80';

const ShimmerCard = () => (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/60 shadow-lg animate-pulse">
        <div className="h-52 w-full bg-muted/40" />
        <div className="p-5 space-y-4">
            <div className="h-6 w-1/3 bg-muted/50 rounded-lg" />
            <div className="h-5 w-3/4 bg-muted/40 rounded-lg" />
            <div className="h-4 w-1/2 bg-muted/30 rounded-lg" />
            <div className="h-4 w-2/3 bg-muted/20 rounded-lg" />
            <div className="h-11 w-full bg-muted/40 rounded-xl mt-4" />
        </div>
    </div>
);

const SavedPropertiesPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState(null);
    const [selectedForCompare, setSelectedForCompare] = useState([]);
    const [brokenImages, setBrokenImages] = useState({});

    // Fetch saved properties for authenticated tenant
    const fetchSaved = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await propertyService.getAllProperties({ savedOnly: true, limit: 100 });
            const rawList = res?.data?.data || res?.data || res || [];
            const list = Array.isArray(rawList) ? rawList : [];
            
            // Deduplicate strictly by property _id
            const uniqueProps = Array.from(
                new Map(list.filter(Boolean).map(p => [String(p._id || p.id), p])).values()
            );
            
            setProperties(uniqueProps);
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

    // Handle Unsave / Delete
    const handleUnsave = async (propertyId) => {
        setRemovingId(propertyId);
        try {
            await propertyService.saveProperty(propertyId);
            setProperties(prev => prev.filter(p => String(p._id) !== String(propertyId)));
            setSelectedForCompare(prev => prev.filter(p => String(p._id) !== String(propertyId)));
            setConfirmDeleteId(null);
        } catch (e) {
            console.error('Error unsaving property:', e);
        } finally {
            setRemovingId(null);
        }
    };

    // Toggle property selection for comparison (max 3)
    const toggleCompare = (property) => {
        const pId = String(property._id || property.id);
        const exists = selectedForCompare.some(p => String(p._id || p.id) === pId);
        
        if (exists) {
            setSelectedForCompare(prev => prev.filter(p => String(p._id || p.id) !== pId));
        } else {
            if (selectedForCompare.length >= 3) {
                // Max 3 reached — replace the oldest
                setSelectedForCompare(prev => [...prev.slice(1), property]);
            } else {
                setSelectedForCompare(prev => [...prev, property]);
            }
        }
    };

    // Handle navigate to existing Compare Properties page
    const handleProceedToCompare = () => {
        if (selectedForCompare.length < 2) return;
        try {
            localStorage.setItem('tms_compare_properties', JSON.stringify(selectedForCompare));
        } catch (e) {}
        navigate('/compare', { state: { compareList: selectedForCompare } });
    };

    const handleImageError = (id) => {
        setBrokenImages(prev => ({ ...prev, [id]: true }));
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3.5">
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

                    {/* Quick compare counter badge if any selected */}
                    {selectedForCompare.length > 0 && (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold self-start sm:self-auto">
                            <Scale className="w-4 h-4" />
                            <span>{selectedForCompare.length} selected for comparison</span>
                        </div>
                    )}
                </div>

                {/* Loading State */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <ShimmerCard key={i} />)}
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
                            Browse properties you like and click the heart icon to save them for easy access and comparison.
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
                    /* Properties Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {properties.map((prop, idx) => {
                                const propId = String(prop._id || prop.id);
                                const isSelected = selectedForCompare.some(p => String(p._id || p.id) === propId);
                                const isConfirmingDelete = confirmDeleteId === propId;
                                const isBroken = brokenImages[propId];
                                const imageUrl = (!isBroken && prop.images?.[0]) ? prop.images[0] : DEFAULT_PROPERTY_IMAGE;
                                const displayStatus = getDisplayStatus(prop);

                                return (
                                    <motion.div
                                        key={propId}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ delay: idx * 0.04 }}
                                        className={cn(
                                            "rounded-3xl overflow-hidden bg-card border transition-all duration-300 shadow-lg flex flex-col justify-between relative group",
                                            isSelected 
                                                ? "border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/[0.02] shadow-blue-500/10" 
                                                : "border-border/80 hover:border-border hover:shadow-xl"
                                        )}
                                    >
                                        {/* Top Image Section */}
                                        <div className="relative h-52 w-full overflow-hidden bg-muted">
                                            <img
                                                src={imageUrl}
                                                alt={prop.name || 'Property'}
                                                onError={() => handleImageError(propId)}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                            
                                            {/* Gradient Overlays */}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />

                                            {/* Badges (Top Left) */}
                                            <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap z-10">
                                                {displayStatus && (
                                                    <div className={cn(
                                                        "px-2.5 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border backdrop-blur-md shadow-md",
                                                        displayStatus === 'Available' 
                                                            ? "bg-emerald-500/90 border-emerald-400/30 text-white" 
                                                            : displayStatus.startsWith('Available from')
                                                                ? "bg-indigo-600/90 border-indigo-400/30 text-white" 
                                                                : displayStatus === 'Under Maintenance'
                                                                    ? "bg-amber-500/90 border-amber-400/30 text-white" 
                                                                    : "bg-rose-500/90 border-rose-400/30 text-white"
                                                    )}>
                                                        {displayStatus}
                                                    </div>
                                                )}
                                                {prop.rating > 0 && (
                                                    <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white">
                                                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                        <span className="text-[10px] font-black">{prop.rating}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Delete / Unsave Button (Top Right) */}
                                            <div className="absolute top-3 right-3 z-10">
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmDeleteId(isConfirmingDelete ? null : propId)}
                                                    disabled={removingId === propId}
                                                    aria-label="Remove saved property"
                                                    className="p-2 rounded-xl bg-rose-500/90 hover:bg-rose-600 text-white shadow-lg backdrop-blur-sm transition-transform active:scale-90 cursor-pointer"
                                                >
                                                    {removingId === propId ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </div>

                                            {/* Rent Amount (Bottom Left of Image) */}
                                            <div className="absolute bottom-3 left-4 z-10">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-white font-black text-xl tracking-tight">
                                                        ₹{Number(prop.rentAmount || 0).toLocaleString('en-IN')}
                                                    </span>
                                                    <span className="text-white/70 text-xs font-bold uppercase tracking-wider">
                                                        /mo
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Delete Confirmation Banner overlay */}
                                        <AnimatePresence>
                                            {isConfirmingDelete && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: -10 }}
                                                    className="p-3 bg-rose-500/10 border-b border-rose-500/20 text-foreground flex items-center justify-between gap-2 text-xs font-bold"
                                                >
                                                    <span className="text-rose-600 dark:text-rose-400">Remove from saved?</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <button
                                                            type="button"
                                                            onClick={() => setConfirmDeleteId(null)}
                                                            className="px-2.5 py-1 rounded-lg bg-card border border-border text-foreground hover:bg-muted text-[10px] font-black uppercase cursor-pointer"
                                                        >
                                                            Cancel
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnsave(propId)}
                                                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase cursor-pointer shadow-sm"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Card Body */}
                                        <div className="p-5 flex-1 flex flex-col justify-between">
                                            <div>
                                                {/* Property Name */}
                                                <h3 className="font-black text-base text-foreground tracking-tight truncate capitalize mb-1">
                                                    {prop.name || 'Untitled Property'}
                                                </h3>

                                                {/* Location */}
                                                <div className="flex items-center gap-1.5 text-muted-foreground/80 text-xs font-medium mb-4">
                                                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                                    <span className="truncate">{prop.city || 'City'}{prop.state ? `, ${prop.state}` : ''}</span>
                                                </div>

                                                {/* Specifications Row */}
                                                <div className="grid grid-cols-3 gap-2 py-3 px-3 rounded-2xl bg-muted/40 border border-border/40 text-[11px] font-black text-muted-foreground/80 mb-5">
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Bed className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                                                        <span>{prop.bedrooms ?? '—'} Beds</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Bath className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                                                        <span>{prop.bathrooms ?? '—'} Baths</span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 truncate">
                                                        <Maximize className="w-3.5 h-3.5 text-foreground/60 shrink-0" />
                                                        <span>{prop.squareFeet ? `${prop.squareFeet} SQFT` : '—'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons: Compare & View Property */}
                                            <div className="space-y-2 pt-2 border-t border-border/40">
                                                <div className="flex items-center gap-2">
                                                    {/* Compare Toggle Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleCompare(prop)}
                                                        className={cn(
                                                            "flex-1 py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 border transition-all cursor-pointer",
                                                            isSelected
                                                                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 ring-1 ring-blue-400/40"
                                                                : "bg-card hover:bg-muted/60 text-foreground/80 border-border hover:border-border/80"
                                                        )}
                                                    >
                                                        {isSelected ? (
                                                            <>
                                                                <Check className="w-3.5 h-3.5" />
                                                                <span>Selected</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Scale className="w-3.5 h-3.5 text-blue-500" />
                                                                <span>Compare</span>
                                                            </>
                                                        )}
                                                    </button>

                                                    {/* View Property Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => navigate(`/properties/${propId}`)}
                                                        className="flex-[1.4] py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 text-white shadow-lg shadow-rose-500/20 hover:shadow-rose-500/30 hover:opacity-95 transition-all cursor-pointer"
                                                        style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                                                    >
                                                        <span>View Property</span>
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Sticky Floating Comparison Bar */}
            <AnimatePresence>
                {selectedForCompare.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 50 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-3xl"
                    >
                        <div className="bg-card/95 dark:bg-card/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-4 sm:p-5 shadow-2xl shadow-blue-500/20 ring-1 ring-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                            
                            {/* Left: Selection info & thumbnails */}
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-md shadow-blue-600/30 shrink-0">
                                    <Scale className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-black uppercase tracking-wider text-foreground">
                                            {selectedForCompare.length} {selectedForCompare.length === 1 ? 'property' : 'properties'} selected
                                        </p>
                                        <span className="text-[10px] font-bold text-muted-foreground/60">(Max 3)</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-1 overflow-x-auto py-0.5">
                                        {selectedForCompare.map(p => (
                                            <span 
                                                key={p._id || p.id} 
                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-muted text-[10px] font-bold text-foreground truncate max-w-[120px]"
                                            >
                                                <span className="truncate">{p.name}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCompare(p)}
                                                    className="text-muted-foreground hover:text-foreground cursor-pointer"
                                                >
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Actions */}
                            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedForCompare([])}
                                    className="px-4 py-2.5 rounded-xl border border-border text-foreground/80 hover:text-foreground hover:bg-muted text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                >
                                    Clear
                                </button>
                                <button
                                    type="button"
                                    onClick={handleProceedToCompare}
                                    disabled={selectedForCompare.length < 2}
                                    className={cn(
                                        "px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg",
                                        selectedForCompare.length >= 2
                                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-blue-600/30 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:scale-95"
                                            : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                                    )}
                                >
                                    <span>Compare Properties</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SavedPropertiesPage;
