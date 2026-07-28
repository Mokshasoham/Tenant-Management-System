import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, MapPin, Bed, Bath, Maximize, Star, ArrowRight, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyService } from '../services/api';
import { useLanguage } from '../context/LanguageContext';
import { cn } from '../utils/cn';
import { getDisplayStatus } from '../utils/propertyHelper';

const shimmerCard = (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
        <div className="shimmer h-48 w-full" />
        <div className="p-4 space-y-3">
            <div className="shimmer h-5 w-3/4 rounded" />
            <div className="shimmer h-4 w-1/2 rounded" />
            <div className="shimmer h-6 w-1/3 rounded" />
        </div>
    </div>
);

const SavedPropertiesPage = () => {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState(null);

    const fetchSaved = useCallback(async () => {
        try {
            setLoading(true);
            const res = await propertyService.getAllProperties({ savedOnly: true, limit: 50 });
            setProperties(res.data?.data || res.data || []);
        } catch (e) {
            console.error('Error fetching saved properties:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSaved(); }, [fetchSaved]);

    const handleUnsave = async (propertyId) => {
        setRemovingId(propertyId);
        try {
            await propertyService.saveProperty(propertyId);
            setProperties(prev => prev.filter(p => p._id !== propertyId));
        } catch (e) {
            console.error('Error unsaving:', e);
        } finally {
            setRemovingId(null);
        }
    };

    return (
        <div className="min-h-screen p-6 bg-background">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg shadow-rose-500/20">
                        <Heart className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-foreground tracking-tight">
                            {t('nav.saved')}
                        </h1>
                        <p className="text-sm font-black text-muted-foreground/40 uppercase tracking-[0.2em] mt-1">{properties.length} properties saved</p>
                    </div>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <div key={i}>{shimmerCard}</div>)}
                    </div>
                ) : properties.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <motion.div
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                            className="text-7xl mb-6"
                        >
                            💔
                        </motion.div>
                        <h2 className="text-2xl font-black text-foreground">No Saved Properties</h2>
                        <p className="mb-6 text-muted-foreground font-medium">Browse properties and save the ones you love!</p>
                        <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={() => navigate('/browse')}
                            className="btn-glow px-6 py-3 rounded-xl font-bold text-white"
                            style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)' }}
                        >
                            Browse Properties
                        </motion.button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <AnimatePresence>
                            {properties.map((prop, idx) => (
                                <motion.div
                                    key={prop._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="rounded-2xl overflow-hidden glass hover:bg-white/80 dark:hover:bg-black/50 transition-all duration-300 border border-border shadow-lg"
                                >
                                    {/* Image */}
                                    <div className="relative h-48 overflow-hidden">
                                        <img
                                            src={prop.images?.[0] || 'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=400'}
                                            alt={prop.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                                        {/* Rating & Dynamic Status Badge */}
                                        <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
                                            {prop.rating > 0 && (
                                                <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: 'rgba(0,0,0,0.6)' }}>
                                                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                                    <span className="text-xs text-white font-bold">{prop.rating}</span>
                                                </div>
                                            )}
                                            {(() => {
                                                const displayStatus = getDisplayStatus(prop);
                                                return displayStatus && (
                                                    <div className={cn(
                                                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border backdrop-blur-sm shadow-md",
                                                        displayStatus === 'Available' ? "bg-emerald-500/90 border-emerald-400/20 text-white" :
                                                        displayStatus.startsWith('Available from') ? "bg-indigo-500/90 border-indigo-400/20 text-white" :
                                                        displayStatus === 'Under Maintenance' ? "bg-amber-500/90 border-amber-400/20 text-white" :
                                                        "bg-rose-500/90 border-rose-400/20 text-white"
                                                    )}>
                                                        {displayStatus}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        {/* Unsave button */}
                                        <motion.button
                                            whileTap={{ scale: 0.9 }}
                                            onClick={() => handleUnsave(prop._id)}
                                            disabled={removingId === prop._id}
                                            className="absolute top-3 right-3 p-2 rounded-xl text-white"
                                            style={{ background: 'rgba(239,68,68,0.8)' }}
                                        >
                                            {removingId === prop._id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </motion.button>
                                        <div className="absolute bottom-3 left-3">
                                            <span className="text-white font-black text-lg">₹{prop.rentAmount?.toLocaleString('en-IN')}</span>
                                            <span className="text-white/70 text-sm">/mo</span>
                                        </div>
                                    </div>

                                    {/* Details */}
                                    <div className="p-4">
                                        <h3 className="font-black text-base mb-1 truncate text-foreground">{prop.name}</h3>
                                        <div className="flex items-center gap-1 mb-3 text-muted-foreground/60">
                                            <MapPin className="w-3 h-3" />
                                            <span className="text-sm truncate">{prop.city}, {prop.state}</span>
                                        </div>
                                        <div className="flex gap-3 mb-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">
                                            {prop.bedrooms !== undefined && (
                                                <span className="flex items-center gap-1"><Bed className="w-3 h-3" />{prop.bedrooms}</span>
                                            )}
                                            {prop.bathrooms !== undefined && (
                                                <span className="flex items-center gap-1"><Bath className="w-3 h-3" />{prop.bathrooms}</span>
                                            )}
                                            {prop.squareFeet && (
                                                <span className="flex items-center gap-1"><Maximize className="w-3 h-3" />{prop.squareFeet} sqft</span>
                                            )}
                                        </div>
                                        <motion.button
                                            whileTap={{ scale: 0.97 }}
                                            onClick={() => navigate(`/properties/${prop._id}`)}
                                            className="w-full py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 btn-glow"
                                            style={{ background: 'linear-gradient(135deg, #ec4899, #f43f5e)', color: 'white' }}
                                        >
                                            View Property <ArrowRight className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default SavedPropertiesPage;
