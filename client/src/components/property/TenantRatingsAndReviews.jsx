import React, { useState, useEffect } from 'react';
import {
    Star, ShieldCheck, MessageSquare, ThumbsUp, Wrench,
    Building2, CheckCircle2, Sparkles, AlertCircle
} from 'lucide-react';
import { feedbackService } from '../../services/api';
import { cn } from '../../utils/cn';

/**
 * Category metadata definitions matching Phase 1 rating breakdown schema
 */
const CATEGORY_META = [
    { key: 'propertyCondition', label: 'Property Condition' },
    { key: 'cleanliness', label: 'Cleanliness' },
    { key: 'maintenance', label: 'Maintenance & Repairs' },
    { key: 'location', label: 'Location & Accessibility' },
    { key: 'valueForMoney', label: 'Value for Money' },
    { key: 'safety', label: 'Safety & Security' },
    { key: 'management', label: 'Property Management' },
];

/**
 * Helper to render 5 fractional/filled/empty stars
 */
function StarDisplay({ rating = 0, size = 'md', className = '' }) {
    const sizeClasses = {
        sm: 'w-3.5 h-3.5',
        md: 'w-4 h-4',
        lg: 'w-5 h-5',
    };
    const iconSize = sizeClasses[size] || sizeClasses.md;

    return (
        <div className={cn("inline-flex items-center gap-0.5 text-amber-400", className)} aria-label={`${rating} out of 5 stars`}>
            {[1, 2, 3, 4, 5].map((star) => {
                const isFull = rating >= star;
                const isHalf = !isFull && rating >= star - 0.5;
                return (
                    <span key={star} className="relative inline-flex items-center justify-center">
                        {isFull ? (
                            <Star className={cn(iconSize, "fill-amber-400 text-amber-400")} />
                        ) : isHalf ? (
                            <span className={cn("relative inline-block", iconSize)}>
                                <Star className={cn(iconSize, "text-muted-foreground/25")} />
                                <span className="absolute inset-0 overflow-hidden w-1/2">
                                    <Star className={cn(iconSize, "fill-amber-400 text-amber-400")} />
                                </span>
                            </span>
                        ) : (
                            <Star className={cn(iconSize, "text-muted-foreground/25")} />
                        )}
                    </span>
                );
            })}
        </div>
    );
}

/**
 * TenantRatingsAndReviews component
 * Dedicated section for Property Details page displaying verified tenant ratings,
 * 7 category breakdowns, and anonymized published resident reviews.
 */
export default function TenantRatingsAndReviews({ property, propertyId }) {
    const activePropertyId = propertyId || property?._id;

    const [feedbackData, setFeedbackData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Fetch authoritative public feedback data whenever property ID changes
    useEffect(() => {
        let isMounted = true;
        if (!activePropertyId) {
            setFeedbackData(null);
            setLoading(false);
            return;
        }

        // Stale state prevention: clear previous property data immediately
        setFeedbackData(null);
        setLoading(true);
        setError(null);

        feedbackService.getPropertyFeedback(activePropertyId)
            .then((res) => {
                if (isMounted) {
                    setFeedbackData(res?.data || null);
                    setLoading(false);
                }
            })
            .catch((err) => {
                if (isMounted) {
                    console.error('[TenantRatingsAndReviews] Error fetching feedback:', err);
                    setError('Unable to load reviews at this time.');
                    setLoading(false);
                }
            });

        return () => {
            isMounted = false;
        };
    }, [activePropertyId]);

    // Authoritative rating and review counts from backend data
    const rating = Number(feedbackData?.propertyRating ?? property?.rating ?? 0);
    const verifiedReviewCount = Number(
        feedbackData?.verifiedReviewCount ?? property?.verifiedReviewCount ?? property?.reviewCount ?? 0
    );
    const ratingBreakdown = feedbackData?.ratingBreakdown ?? property?.ratingBreakdown ?? {};
    const reviews = Array.isArray(feedbackData?.reviews) ? feedbackData.reviews : [];

    const hasReviews = verifiedReviewCount > 0 && rating > 0;

    return (
        <section
            id="tenant-ratings-and-reviews"
            aria-label="Tenant Ratings & Verified Reviews"
            className="p-8 rounded-[2.5rem] bg-card border border-border shadow-sm space-y-8 transition-colors"
        >
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/20 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                            Verified Resident Feedback
                        </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                        Tenant Ratings & Verified Reviews
                    </h2>
                </div>

                {hasReviews && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span>100% Verified Tenant Submissions</span>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground/60">
                    <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <p className="text-xs font-semibold">Loading verified reviews...</p>
                </div>
            ) : !hasReviews ? (
                /* Empty State: Property has no reviews yet */
                <div className="py-12 px-6 rounded-3xl bg-muted/40 border border-border/60 text-center space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto text-muted-foreground/40 border border-border/60">
                        <MessageSquare className="w-7 h-7" />
                    </div>
                    <div className="space-y-1 max-w-md mx-auto">
                        <h3 className="text-base font-bold text-foreground">
                            No verified tenant reviews yet
                        </h3>
                        <p className="text-xs text-muted-foreground/75 leading-relaxed">
                            Reviews and ratings for this property will appear here once verified residents submit feedback during their active lease periods.
                        </p>
                    </div>
                </div>
            ) : (
                /* Verified Ratings & Review Breakdown */
                <div className="space-y-8">
                    {/* Overall Rating Hero Card */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-amber-500/5 via-muted/40 to-primary/5 border border-amber-500/20 shadow-sm">
                        <div className="md:col-span-5 flex flex-col justify-center items-center md:items-start text-center md:text-left space-y-2 md:border-r md:border-border/60 md:pr-6">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                Overall Property Score
                            </span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl sm:text-6xl font-black text-foreground tracking-tight">
                                    {rating.toFixed(1)}
                                </span>
                                <span className="text-2xl font-bold text-amber-400">★</span>
                            </div>
                            <StarDisplay rating={rating} size="lg" />
                            <p className="text-xs font-bold text-muted-foreground pt-1">
                                Based on <span className="text-foreground font-black">{verifiedReviewCount}</span> verified {verifiedReviewCount === 1 ? 'review' : 'reviews'}
                            </p>
                        </div>

                        {/* Verified Credibility Notice */}
                        <div className="md:col-span-7 flex flex-col justify-center space-y-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                <ShieldCheck className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                                <span>Authentic Resident Transparency</span>
                            </div>
                            <p className="leading-relaxed text-muted-foreground/80">
                                All ratings and reviews are collected exclusively from tenants with authorized, active leases. Every review is mathematically calculated into the property's overall score to provide reliable living condition insights.
                            </p>
                        </div>
                    </div>

                    {/* 7-Category Breakdown Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-black text-foreground uppercase tracking-wider text-xs">
                                Category Breakdown
                            </h3>
                            <span className="text-[11px] text-muted-foreground/60">
                                Rated by verified occupants
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {CATEGORY_META.map((cat) => {
                                const catRating = Number(ratingBreakdown[cat.key] || 0);
                                const hasCatRating = catRating > 0;
                                const pct = hasCatRating ? Math.min(100, Math.max(0, (catRating / 5) * 100)) : 0;

                                return (
                                    <div
                                        key={cat.key}
                                        className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex flex-col justify-between gap-2.5 transition-colors hover:bg-muted/60"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-bold text-foreground truncate">
                                                {cat.label}
                                            </span>
                                            {hasCatRating ? (
                                                <span className="text-xs font-black text-foreground flex items-center gap-1">
                                                    <span>{catRating.toFixed(1)}</span>
                                                    <span className="text-amber-400 text-xs">★</span>
                                                </span>
                                            ) : (
                                                <span className="text-[11px] font-semibold text-muted-foreground/40">
                                                    —
                                                </span>
                                            )}
                                        </div>

                                        {hasCatRating ? (
                                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-500"
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="text-[10px] text-muted-foreground/45">
                                                No ratings recorded yet
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Anonymized Public Feedback List */}
                    {reviews.length > 0 && (
                        <div className="space-y-4 pt-4 border-t border-border/60">
                            <div className="flex items-center justify-between">
                                <h3 className="text-base font-black text-foreground">
                                    Verified Resident Reviews ({reviews.length})
                                </h3>
                                <span className="text-xs text-muted-foreground/60">
                                    Identity protected
                                </span>
                            </div>

                            <div className="space-y-4">
                                {reviews.map((rev, idx) => {
                                    const revRating = Number(rev.overallRating || 0);
                                    const dateStr = rev.submittedAt
                                        ? new Date(rev.submittedAt).toLocaleDateString('en-IN', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        })
                                        : 'Recent';

                                    return (
                                        <div
                                            key={rev._id || idx}
                                            className="p-5 sm:p-6 rounded-2xl bg-card border border-border/70 shadow-xs space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-xs flex items-center justify-center">
                                                        VT
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-sm font-black text-foreground">
                                                                {rev.author || 'Verified Tenant'}
                                                            </span>
                                                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider border border-emerald-500/20">
                                                                <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                                                            </span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground/60">
                                                            {dateStr}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <StarDisplay rating={revRating} size="sm" />
                                                    <span className="text-xs font-black text-foreground">
                                                        {revRating.toFixed(1)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Written Feedback / Comments */}
                                            {rev.comments && (
                                                <p className="text-sm text-foreground/90 leading-relaxed pt-1">
                                                    "{rev.comments}"
                                                </p>
                                            )}

                                            {/* Specific Liked / Improvement Highlights */}
                                            {(rev.liked || rev.improvements) && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                                                    {rev.liked && (
                                                        <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15 text-xs space-y-1">
                                                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                                                                <ThumbsUp className="w-3 h-3" />
                                                                <span>Liked</span>
                                                            </div>
                                                            <p className="text-muted-foreground/80 leading-snug">
                                                                {rev.liked}
                                                            </p>
                                                        </div>
                                                    )}
                                                    {rev.improvements && (
                                                        <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-xs space-y-1">
                                                            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                                                                <Wrench className="w-3 h-3" />
                                                                <span>Could be improved</span>
                                                            </div>
                                                            <p className="text-muted-foreground/80 leading-snug">
                                                                {rev.improvements}
                                                            </p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
