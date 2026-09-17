import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Star, CheckCircle2, AlertCircle, Loader2, Sparkles,
    Shield, Wrench, Building2, ThumbsUp, MessageSquare
} from 'lucide-react';
import { feedbackService } from '../../services/api';
import { cn } from '../../utils/cn';

/**
 * StarRating component supporting 1-5 interactive rating
 */
function StarRating({ value = 0, onChange, size = 'md', disabled = false }) {
    const [hoverValue, setHoverValue] = useState(0);

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
    };

    return (
        <div className="flex items-center gap-1.5" onMouseLeave={() => setHoverValue(0)}>
            {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverValue || value) >= star;
                return (
                    <button
                        type="button"
                        key={star}
                        disabled={disabled}
                        onClick={() => onChange?.(star)}
                        onMouseEnter={() => setHoverValue(star)}
                        className={cn(
                            "p-1 rounded-lg transition-transform focus:outline-none",
                            disabled ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95"
                        )}
                        aria-label={`${star} star`}
                    >
                        <Star
                            className={cn(
                                sizeClasses[size] || sizeClasses.md,
                                "transition-colors duration-150",
                                isFilled
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-muted-foreground/30 hover:text-amber-400/50"
                            )}
                        />
                    </button>
                );
            })}
        </div>
    );
}

const CATEGORY_DEFINITIONS = [
    { key: 'propertyCondition', label: 'Property Condition', hint: 'Overall condition, fixtures & structural upkeep' },
    { key: 'cleanliness', label: 'Cleanliness', hint: 'Premises hygiene, pest control & common area maintenance' },
    { key: 'maintenance', label: 'Maintenance & Repairs', hint: 'Timeliness and effectiveness of resolving issues' },
    { key: 'location', label: 'Location & Accessibility', hint: 'Neighborhood convenience, transit & surroundings' },
    { key: 'valueForMoney', label: 'Value for Money', hint: 'Rental cost compared to facilities and quality' },
    { key: 'safety', label: 'Safety & Security', hint: 'Locks, CCTV, lighting and neighborhood security' },
    { key: 'management', label: 'Property Management', hint: 'Manager responsiveness, communication & professionalism' },
];

const MAINTENANCE_RESPONSE_OPTIONS = [
    { value: 'very_slow', label: 'Very Slow' },
    { value: 'slow', label: 'Slow' },
    { value: 'average', label: 'Average' },
    { value: 'fast', label: 'Fast' },
    { value: 'very_fast', label: 'Very Fast' },
];

const REPAIR_QUALITY_OPTIONS = [
    { value: 'very_unsatisfied', label: 'Very Unsatisfied' },
    { value: 'unsatisfied', label: 'Unsatisfied' },
    { value: 'neutral', label: 'Neutral' },
    { value: 'satisfied', label: 'Satisfied' },
    { value: 'very_satisfied', label: 'Very Satisfied' },
];

const COMMUNICATION_OPTIONS = [
    { value: 'yes', label: 'Yes, clear & timely' },
    { value: 'mostly', label: 'Mostly' },
    { value: 'no', label: 'No, lacked clarity' },
];

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return '';
    }
}

export default function TenantFeedbackModal({
    isOpen,
    onClose,
    lease,
    eligibility,
    onSuccess,
}) {
    const [overallRating, setOverallRating] = useState(5);
    const [categoryRatings, setCategoryRatings] = useState({
        propertyCondition: 5,
        cleanliness: 5,
        maintenance: 5,
        location: 5,
        valueForMoney: 5,
        safety: 5,
        management: 5,
    });

    const [maintenanceFeedback, setMaintenanceFeedback] = useState({
        responseRating: 'fast',
        repairQuality: 'satisfied',
        communication: 'yes',
    });

    const [propertyTypeAnswers, setPropertyTypeAnswers] = useState({
        waterSupply: 5,
        parking: 5,
        security: 5,
        commonAreas: 5,
        neighborhood: 5,
        accessibility: 5,
        visibility: 5,
        powerSupply: 5,
        spaceUsability: 5,
    });

    const [amenitiesRatings, setAmenitiesRatings] = useState({});
    const [liked, setLiked] = useState('');
    const [improvements, setImprovements] = useState('');
    const [comments, setComments] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const propertyType = eligibility?.propertyType || lease?.property?.type || 'apartment';
    const hasMaintenance = Boolean(eligibility?.hasMaintenance);
    const amenitiesList = Array.isArray(eligibility?.propertyAmenities) ? eligibility.propertyAmenities : [];

    const handleCategoryChange = (key, val) => {
        setCategoryRatings(prev => ({ ...prev, [key]: val }));
    };

    const handlePropertyTypeAnswerChange = (key, val) => {
        setPropertyTypeAnswers(prev => ({ ...prev, [key]: val }));
    };

    const handleAmenityRatingChange = (amenity, val) => {
        setAmenitiesRatings(prev => ({ ...prev, [amenity]: val }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!overallRating || overallRating < 1 || overallRating > 5) {
            setError('Please provide an overall rating (1–5 stars).');
            return;
        }

        if (!lease?._id) {
            setError('Lease reference is missing. Please refresh and try again.');
            return;
        }

        setSubmitting(true);

        try {
            const payload = {
                leaseId: lease._id,
                overallRating,
                categoryRatings,
                maintenanceFeedback: hasMaintenance ? maintenanceFeedback : undefined,
                propertyType,
                propertyTypeAnswers,
                amenitiesRatings,
                liked: liked.trim(),
                improvements: improvements.trim(),
                comments: comments.trim(),
            };

            await feedbackService.submitFeedback(payload);
            setSuccess(true);

            // Notify parent to refresh eligibility from backend
            onSuccess?.();

            setTimeout(() => {
                setSuccess(false);
                onClose?.();
            }, 1600);
        } catch (err) {
            console.error('Failed to submit feedback:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to submit feedback. Please try again.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const periodStartFormatted = formatDate(eligibility?.periodStart);
    const periodEndFormatted = formatDate(eligibility?.periodEnd);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-black/70 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ duration: 0.2 }}
                    className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-card border border-border shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-start justify-between p-6 border-b border-border/80 bg-muted/30">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                    Verified Resident Review
                                </span>
                                {eligibility?.periodIndex && (
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                                        Period #{eligibility.periodIndex}
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-black text-foreground mt-2">
                                Rate Your Tenancy Experience
                            </h2>
                            <p className="text-xs text-muted-foreground font-medium mt-1">
                                {periodStartFormatted && periodEndFormatted
                                    ? `Feedback for current period: ${periodStartFormatted} – ${periodEndFormatted}`
                                    : 'Share your verified feedback for this active lease period.'}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Modal Content */}
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                        {error && (
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-3">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success ? (
                            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                                    <CheckCircle2 className="w-8 h-8" />
                                </div>
                                <h3 className="text-lg font-black text-foreground">Feedback Recorded!</h3>
                                <p className="text-xs text-muted-foreground max-w-sm">
                                    Thank you for contributing to transparent, verified resident ratings. Your ratings have been recorded for this lease period.
                                </p>
                            </div>
                        ) : (
                            <>
                                {/* Section 1: Overall Rating (Required) */}
                                <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                                Overall Experience <span className="text-rose-500">*</span>
                                            </span>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                How would you rate your overall experience with this property?
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-2xl font-black text-amber-500">
                                                {overallRating.toFixed(1)}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground"> / 5.0</span>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex items-center justify-center">
                                        <StarRating
                                            value={overallRating}
                                            onChange={setOverallRating}
                                            size="lg"
                                            disabled={submitting}
                                        />
                                    </div>
                                </div>

                                {/* Section 2: Core Category Ratings */}
                                <div className="space-y-4">
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                            Category Ratings
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground">
                                            Rate each aspect from 1 to 5 stars.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {CATEGORY_DEFINITIONS.map(cat => (
                                            <div
                                                key={cat.key}
                                                className="p-3.5 rounded-2xl bg-card border border-border/70 flex items-center justify-between gap-4"
                                            >
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-black text-foreground truncate">
                                                        {cat.label}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {cat.hint}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <StarRating
                                                        value={categoryRatings[cat.key] || 5}
                                                        onChange={(val) => handleCategoryChange(cat.key, val)}
                                                        size="sm"
                                                        disabled={submitting}
                                                    />
                                                    <span className="text-xs font-bold text-muted-foreground w-6 text-right">
                                                        {categoryRatings[cat.key] || 5}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Section 3: Conditional Maintenance Questions */}
                                {hasMaintenance && (
                                    <div className="p-5 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-4">
                                        <div className="flex items-center gap-2">
                                            <Wrench className="w-4 h-4 text-blue-500" />
                                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                                Maintenance &amp; Repairs Feedback
                                            </h4>
                                        </div>

                                        {/* Response Speed */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-foreground">
                                                When you reported an issue, how quickly was it addressed?
                                            </label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {MAINTENANCE_RESPONSE_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        disabled={submitting}
                                                        onClick={() => setMaintenanceFeedback(prev => ({ ...prev, responseRating: opt.value }))}
                                                        className={cn(
                                                            "py-2 px-1 text-[10px] font-bold rounded-xl border transition-all text-center",
                                                            maintenanceFeedback.responseRating === opt.value
                                                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Repair Quality */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-foreground">
                                                How satisfied were you with the quality of repairs?
                                            </label>
                                            <div className="grid grid-cols-5 gap-1.5">
                                                {REPAIR_QUALITY_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        disabled={submitting}
                                                        onClick={() => setMaintenanceFeedback(prev => ({ ...prev, repairQuality: opt.value }))}
                                                        className={cn(
                                                            "py-2 px-1 text-[10px] font-bold rounded-xl border transition-all text-center",
                                                            maintenanceFeedback.repairQuality === opt.value
                                                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Communication */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold text-foreground">
                                                Was communication about maintenance clear and timely?
                                            </label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {COMMUNICATION_OPTIONS.map(opt => (
                                                    <button
                                                        type="button"
                                                        key={opt.value}
                                                        disabled={submitting}
                                                        onClick={() => setMaintenanceFeedback(prev => ({ ...prev, communication: opt.value }))}
                                                        className={cn(
                                                            "py-2 px-2 text-[10px] font-bold rounded-xl border transition-all text-center",
                                                            maintenanceFeedback.communication === opt.value
                                                                ? "bg-blue-500 text-white border-blue-500 shadow-sm"
                                                                : "bg-card border-border text-muted-foreground hover:bg-muted"
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Section 4: Property-Type Specific Questions */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-emerald-500" />
                                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                            {propertyType.toUpperCase()} Features
                                        </h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {propertyType === 'house' ? (
                                            <>
                                                {[
                                                    { key: 'neighborhood', label: 'Neighborhood' },
                                                    { key: 'parking', label: 'Parking Space' },
                                                    { key: 'waterSupply', label: 'Water Supply' },
                                                    { key: 'security', label: 'Premises Security' },
                                                ].map(q => (
                                                    <div key={q.key} className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-foreground">{q.label}</span>
                                                        <StarRating
                                                            value={propertyTypeAnswers[q.key] || 5}
                                                            onChange={(val) => handlePropertyTypeAnswerChange(q.key, val)}
                                                            size="sm"
                                                            disabled={submitting}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        ) : propertyType === 'commercial' || propertyType === 'shop' ? (
                                            <>
                                                {[
                                                    { key: 'accessibility', label: 'Accessibility' },
                                                    { key: 'visibility', label: 'Visibility / Footfall' },
                                                    { key: 'parking', label: 'Customer Parking' },
                                                    { key: 'powerSupply', label: 'Power Supply' },
                                                    { key: 'spaceUsability', label: 'Space Usability' },
                                                ].map(q => (
                                                    <div key={q.key} className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-foreground">{q.label}</span>
                                                        <StarRating
                                                            value={propertyTypeAnswers[q.key] || 5}
                                                            onChange={(val) => handlePropertyTypeAnswerChange(q.key, val)}
                                                            size="sm"
                                                            disabled={submitting}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        ) : (
                                            /* Default: Apartment */
                                            <>
                                                {[
                                                    { key: 'waterSupply', label: 'Water Supply' },
                                                    { key: 'parking', label: 'Assigned Parking' },
                                                    { key: 'security', label: 'Building Security' },
                                                    { key: 'commonAreas', label: 'Common Areas / Lift' },
                                                ].map(q => (
                                                    <div key={q.key} className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between">
                                                        <span className="text-xs font-bold text-foreground">{q.label}</span>
                                                        <StarRating
                                                            value={propertyTypeAnswers[q.key] || 5}
                                                            onChange={(val) => handlePropertyTypeAnswerChange(q.key, val)}
                                                            size="sm"
                                                            disabled={submitting}
                                                        />
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Section 5: Dynamic Amenities Satisfaction */}
                                {amenitiesList.length > 0 && (
                                    <div className="space-y-3">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                            Included Amenities Satisfaction
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {amenitiesList.map(amenity => (
                                                <div
                                                    key={amenity}
                                                    className="p-3 rounded-xl bg-card border border-border/70 flex items-center justify-between"
                                                >
                                                    <span className="text-xs font-bold text-foreground capitalize">
                                                        {amenity}
                                                    </span>
                                                    <StarRating
                                                        value={amenitiesRatings[amenity] || 5}
                                                        onChange={(val) => handleAmenityRatingChange(amenity, val)}
                                                        size="sm"
                                                        disabled={submitting}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Section 6: Open-Ended Written Feedback */}
                                <div className="space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                        Comments &amp; Suggestions
                                    </h4>

                                    {/* What did you like */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold text-foreground">
                                            <label htmlFor="feedback-liked">What did you like?</label>
                                            <span className="text-muted-foreground">{liked.length}/1000</span>
                                        </div>
                                        <textarea
                                            id="feedback-liked"
                                            rows={2}
                                            maxLength={1000}
                                            disabled={submitting}
                                            value={liked}
                                            onChange={(e) => setLiked(e.target.value)}
                                            placeholder="Tell us what you appreciated about this property..."
                                            className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>

                                    {/* What could be improved */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold text-foreground">
                                            <label htmlFor="feedback-improvements">What could be improved?</label>
                                            <span className="text-muted-foreground">{improvements.length}/1000</span>
                                        </div>
                                        <textarea
                                            id="feedback-improvements"
                                            rows={2}
                                            maxLength={1000}
                                            disabled={submitting}
                                            value={improvements}
                                            onChange={(e) => setImprovements(e.target.value)}
                                            placeholder="Suggest improvements for the property manager..."
                                            className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>

                                    {/* Additional comments */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-[11px] font-bold text-foreground">
                                            <label htmlFor="feedback-comments">Additional comments (optional)</label>
                                            <span className="text-muted-foreground">{comments.length}/1000</span>
                                        </div>
                                        <textarea
                                            id="feedback-comments"
                                            rows={2}
                                            maxLength={1000}
                                            disabled={submitting}
                                            value={comments}
                                            onChange={(e) => setComments(e.target.value)}
                                            placeholder="Any other thoughts about your stay..."
                                            className="w-full p-3 rounded-xl bg-muted/40 border border-border text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none"
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Modal Footer */}
                        {!success && (
                            <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={submitting}
                                    className="px-5 py-2.5 rounded-xl border border-border text-xs font-bold text-foreground hover:bg-muted transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting || !overallRating}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md hover:shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <span>{submitting ? 'Submitting...' : 'Submit Feedback'}</span>
                                </button>
                            </div>
                        )}
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
