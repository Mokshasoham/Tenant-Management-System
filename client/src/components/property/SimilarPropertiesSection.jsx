import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Sparkles, ArrowRight, RefreshCw, AlertTriangle
} from 'lucide-react';

import { propertyService } from '../../services/api';
import { PropertyCard, SkeletonCard } from './PropertyCard';

export default function SimilarPropertiesSection({
    property,
    onSaveProperty,
    savedPropertyIds = new Set(),
    onToggleCompare,
    comparePropertyIds = new Set()
}) {
    const navigate = useNavigate();

    const [similarList, setSimilarList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchSimilar = async () => {
        if (!property?._id) return;
        setLoading(true);
        setError(null);
        try {
            const res = await propertyService.getSimilarProperties(property._id, { limit: 6 });
            const data = res?.data?.data || res?.data || [];
            const list = Array.isArray(data) ? data : [];
            setSimilarList(list);
        } catch (err) {
            console.error('[SimilarPropertiesSection] Error fetching similar properties:', err);
            setError('Recommendations could not be loaded. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSimilar();
    }, [property?._id]);

    const handleViewProperty = (propId) => {
        if (!propId) return;
        navigate(`/properties/${propId}`);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <section className="space-y-6 pt-10 border-t border-border/60">
            {/* Header: Curated For You & You May Also Like */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-widest border border-emerald-500/20 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-emerald-500" /> Curated For You
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        You May Also Like
                    </h2>
                    <p className="text-xs text-muted-foreground font-medium max-w-xl">
                        Properties similar to this one based on price, layout, size and location.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => {
                        navigate('/browse');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="self-start sm:self-auto text-xs font-black text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 flex items-center gap-1.5 uppercase tracking-wider transition-colors cursor-pointer group"
                >
                    <span>View all listings</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Error State */}
            {error && !loading && (
                <div className="p-5 rounded-3xl bg-destructive/5 border border-destructive/20 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
                        <div>
                            <p className="text-xs font-black text-destructive uppercase tracking-wider">Unable to load recommendations</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={fetchSimilar}
                        className="px-4 py-2 rounded-xl bg-card border border-border text-foreground hover:bg-muted font-bold text-xs flex items-center gap-2 cursor-pointer shadow-sm transition-all"
                    >
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                    </button>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && similarList.length === 0 && (
                <div className="py-7 px-6 sm:px-8 rounded-3xl bg-card/70 border border-border/80 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <div className="flex items-center gap-4 text-center sm:text-left">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center text-xl shrink-0 shadow-inner">
                            ✦
                        </div>
                        <div className="space-y-0.5">
                            <h3 className="text-sm font-black text-foreground">No similar properties found</h3>
                            <p className="text-xs text-muted-foreground font-medium">
                                We couldn't find close matches with identical layouts at the moment.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => navigate('/browse')}
                        className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md shadow-emerald-900/20 flex items-center gap-2 cursor-pointer shrink-0"
                    >
                        <span>Browse all listings</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Same Browse Properties Grid & Card Design */}
            {!loading && !error && similarList.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {similarList.map((p, index) => {
                        const matchTag = p.matchScore >= 75
                            ? 'Strong match'
                            : p.matchScore >= 50
                                ? 'Good match'
                                : null;

                        return (
                            <PropertyCard
                                key={p._id || p.id}
                                p={p}
                                index={index}
                                isSaved={savedPropertyIds?.has(String(p._id || p.id))}
                                inCompare={comparePropertyIds?.has(String(p._id || p.id))}
                                onSave={() => onSaveProperty?.(p._id || p.id)}
                                onCompare={() => onToggleCompare?.(p)}
                                onClick={() => handleViewProperty(p._id || p.id)}
                                matchTag={matchTag}
                                matchReasons={p.matchReasons || []}
                            />
                        );
                    })}
                </div>
            )}
        </section>
    );
}
