import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Star, Check, UserCheck, Wrench, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { maintenanceService } from '../../services/api';
import { cn } from '../../utils/cn';

const FEEDBACK_TAGS = [
  'Professional',
  'On Time',
  'Quality Work',
  'Polite',
  'Quick Resolution',
  'Explained the Problem',
  'Clean Work'
];

const RATING_LABELS = {
  1: 'Poor',
  2: 'Needs Improvement',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
};

export default function TechnicianFeedbackModal({ ticket, onClose, onSuccess, theme }) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['Professional', 'On Time', 'Quality Work']);
  const [comment, setComment] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!ticket) return null;

  const techName = ticket.assignedTo
    ? `${ticket.assignedTo.firstName || ''} ${ticket.assignedTo.lastName || ''}`.trim()
    : 'Field Technician';
  const resolvedDateStr = ticket.updatedAt || ticket.createdAt
    ? new Date(ticket.updatedAt || ticket.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Aug 10, 2026';

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const payload = {
      rating,
      score: rating,
      comment: comment.trim(),
      feedback: comment.trim(),
      tags: selectedTags,
      wouldRecommend
    };

    try {
      const res = await maintenanceService.submitFeedback(ticket._id, payload);
      if (onSuccess) {
        onSuccess(res?.data?.data || res?.data || res);
      }
      onClose();
    } catch (err) {
      console.error('Feedback submit error:', err);
      setError(err?.response?.data?.message || err?.message || 'Unable to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeScore = hoverRating || rating;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md transition-opacity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className={cn(
          "w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh]",
          theme === 'light' ? "bg-white border-slate-200 text-slate-900" : "bg-[#0d0e17] border-white/10 text-slate-100"
        )}
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-border/50 flex items-start justify-between gap-3 bg-muted/20">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              ✓ Maintenance Completed
            </span>
            <h2 className="text-lg font-black mt-1.5 text-foreground">How was the service?</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Your feedback helps us improve maintenance and gives the technician credit for their work.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold">
              {error}
            </div>
          )}

          {/* Maintenance Request Summary Card */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-foreground capitalize flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-emerald-400" />
                {ticket.title}
              </span>
              <span className="font-mono text-[11px] font-bold text-muted-foreground">
                REQ-{String(ticket._id).substring(0, 8)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium pt-1 border-t border-border/40">
              <span>Category: <strong className="text-foreground capitalize">{ticket.category || 'Plumbing'}</strong></span>
              <span>Resolved: <strong className="text-emerald-400">{resolvedDateStr}</strong></span>
            </div>
          </div>

          {/* Technician Info */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-md">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">Assigned Technician</span>
              <h4 className="text-sm font-black text-foreground">🔧 {techName}</h4>
              <span className="text-[11px] text-indigo-400 font-bold block mt-0.5">Field Technician</span>
            </div>
          </div>

          {/* 1. Star Rating */}
          <div className="space-y-3 text-center p-4 rounded-2xl bg-muted/30 border border-border/50">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
              How would you rate the technician?
            </label>
            
            <div className="flex items-center justify-center gap-2 py-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-2xl transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= activeScore
                        ? "fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        : "text-slate-500/40"
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="flex justify-between items-center px-4 text-[10px] text-muted-foreground font-bold border-t border-border/40 pt-2">
              <span>1 ★ Poor</span>
              <span>2 ★ Needs Imp.</span>
              <span>3 ★ Good</span>
              <span>4 ★ Very Good</span>
              <span>5 ★ Excellent</span>
            </div>

            <div className="text-center pt-1">
              <span className="px-4 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-black">
                {'★'.repeat(activeScore)} {RATING_LABELS[activeScore]}
              </span>
            </div>
          </div>

          {/* 2. Feedback Categories (Tags) */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-muted-foreground block">
              What did you like about the service?
            </label>
            <div className="flex flex-wrap gap-2">
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      "px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all border flex items-center gap-1.5 cursor-pointer",
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/20"
                        : "bg-muted/50 text-muted-foreground border-border/60 hover:border-indigo-500/40 hover:text-foreground"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Written Feedback (Comments) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-muted-foreground">
              <span>Additional comments</span>
              <span className="text-[10px] font-mono text-muted-foreground/70">{comment.length} / 500 characters</span>
            </div>
            <textarea
              rows={3}
              maxLength={500}
              placeholder="Tell us about your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={cn(
                "w-full p-3.5 rounded-2xl border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all resize-none",
                theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-[#09090f] border-white/10"
              )}
            />
          </div>

          {/* 4. Recommendation Question */}
          <div className="p-4 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-foreground">Would you recommend this technician?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer",
                  wouldRecommend
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <ThumbsUp className="w-3.5 h-3.5" /> Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer",
                  !wouldRecommend
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                )}
              >
                <ThumbsDown className="w-3.5 h-3.5" /> No
              </button>
            </div>
          </div>

          {/* Pre-submit Review Summary Banner */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300 font-medium">
            <span className="font-bold block text-indigo-400 text-[10px] uppercase tracking-wider">You are reviewing:</span>
            Maintenance Request: <strong>REQ-{String(ticket._id).substring(0, 8)}</strong> • Technician: <strong>{techName}</strong> • Rating: <strong className="text-amber-400">{'★'.repeat(rating)} ({rating}/5)</strong>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold text-xs uppercase tracking-wider transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting Feedback...
              </>
            ) : (
              'Submit Feedback'
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
