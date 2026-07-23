import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Send, Trash2, MessageSquare, ThumbsUp, BadgeCheck, Reply } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import apiClient from '../services/apiClient';
import useAuthStore from '../context/authStore';

const StarRating = ({ value, onChange, readonly = false, size = 6 }) => (
    <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
            <button
                key={star}
                type="button"
                disabled={readonly}
                onClick={() => onChange && onChange(star)}
                className={`transition-transform ${!readonly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
            >
                <Star
                    className={`w-${size} h-${size} ${star <= value ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`}
                />
            </button>
        ))}
    </div>
);

const ReviewsPage = () => {
    const { propertyId } = useParams();
    const navigate = useNavigate();
    const { t } = useLanguage();
    const user = useAuthStore((state) => state.user);

    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [propertyName, setPropertyName] = useState('');

    const [form, setForm] = useState({
        rating: 0,
        comment: '',
        cleanliness: 0,
        location: 0,
        value: 0,
        communication: 0,
    });

    const fetchReviews = useCallback(async () => {
        try {
            setLoading(true);
            const res = await apiClient.get(`/reviews/property/${propertyId}`);
            setReviews(res.data?.data || res.data || []);
        } catch (e) {
            console.error('Fetch reviews error:', e);
        } finally {
            setLoading(false);
        }
    }, [propertyId]);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);

    const averageRating = reviews.length
        ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (form.rating === 0) return;
        try {
            setSubmitting(true);
            await apiClient.post('/reviews', { ...form, propertyId });
            setForm({ rating: 0, comment: '', cleanliness: 0, location: 0, value: 0, communication: 0 });
            await fetchReviews();
        } catch (e) {
            console.error('Submit review error:', e);
        } finally {
            setSubmitting(false);
        }
    };

    const handleReply = async (reviewId) => {
        try {
            await apiClient.put(`/reviews/${reviewId}/reply`, { text: replyText });
            setReplyingId(null);
            setReplyText('');
            await fetchReviews();
        } catch (e) {
            console.error('Reply error:', e);
        }
    };

    const handleHelpful = async (reviewId) => {
        try {
            await apiClient.post(`/reviews/${reviewId}/helpful`);
            await fetchReviews();
        } catch (e) {
            console.error('Helpful error:', e);
        }
    };

    const handleDelete = async (reviewId) => {
        try {
            await apiClient.delete(`/reviews/${reviewId}`);
            await fetchReviews();
        } catch (e) {
            console.error('Delete error:', e);
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ background: 'var(--bg-page)' }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 rounded-xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                        <Star className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>Reviews & Ratings</h1>
                        {reviews.length > 0 && (
                            <div className="flex items-center gap-2">
                                <StarRating value={Math.round(averageRating)} readonly size={4} />
                                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{averageRating}</span>
                                <span style={{ color: 'var(--text-secondary)' }}>({reviews.length} reviews)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Write Review Form */}
                {user && (user.role === 'tenant' || user.role === 'user') && (
                    <motion.form
                        onSubmit={handleSubmit}
                        className="p-6 rounded-2xl mb-8 glass-card"
                        style={{ border: '1px solid var(--border-color)' }}
                    >
                        <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Write a Review</h2>
                        <div className="mb-4">
                            <p className="text-sm mb-2 font-semibold" style={{ color: 'var(--text-secondary)' }}>Overall Rating *</p>
                            <StarRating value={form.rating} onChange={v => setForm(f => ({ ...f, rating: v }))} size={8} />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            {[['cleanliness', 'Cleanliness'], ['location', 'Location'], ['value', 'Value for Money'], ['communication', 'Communication']].map(([key, label]) => (
                                <div key={key}>
                                    <p className="text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                    <StarRating value={form[key]} onChange={v => setForm(f => ({ ...f, [key]: v }))} size={4} />
                                </div>
                            ))}
                        </div>
                        <textarea
                            value={form.comment}
                            onChange={e => setForm(f => ({ ...f, comment: e.target.value }))}
                            placeholder="Share your experience with this property..."
                            rows={4}
                            className="w-full px-4 py-3 rounded-xl resize-none text-sm mb-4"
                            style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                        />
                        <motion.button
                            type="submit"
                            disabled={submitting || form.rating === 0}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white btn-glow disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}
                        >
                            <Send className="w-4 h-4" />
                            {submitting ? 'Submitting...' : 'Submit Review'}
                        </motion.button>
                    </motion.form>
                )}

                {/* Reviews List */}
                {loading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-6 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                                <div className="flex gap-4 mb-4">
                                    <div className="shimmer w-10 h-10 rounded-full" />
                                    <div className="flex-1 space-y-2">
                                        <div className="shimmer h-4 w-32 rounded" />
                                        <div className="shimmer h-3 w-20 rounded" />
                                    </div>
                                </div>
                                <div className="shimmer h-12 w-full rounded" />
                            </div>
                        ))}
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">💬</div>
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>No reviews yet</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Be the first to review this property!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <AnimatePresence>
                            {reviews.map((review, idx) => (
                                <motion.div
                                    key={review._id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="p-6 rounded-2xl"
                                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-card)' }}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                                                style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)' }}>
                                                {review.author?.firstName?.[0]}{review.author?.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {review.author?.firstName} {review.author?.lastName}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <StarRating value={review.rating} readonly size={3} />
                                                    {review.verifiedStay && (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                                                            <BadgeCheck className="w-3 h-3" /> Verified Stay
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            {user?._id === review.author?._id && (
                                                <button onClick={() => handleDelete(review._id)} className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/20">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                {new Date(review.createdAt).toLocaleDateString('en-IN')}
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{review.comment}</p>

                                    {/* Breakdown */}
                                    {(review.cleanliness || review.value) && (
                                        <div className="grid grid-cols-2 gap-2 mb-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {[['Cleanliness', review.cleanliness], ['Location', review.location], ['Value', review.value], ['Communication', review.communication]].map(([label, val]) => val ? (
                                                <div key={label} className="flex items-center justify-between px-3 py-1.5 rounded-lg" style={{ background: 'var(--bg-page)' }}>
                                                    <span>{label}</span>
                                                    <StarRating value={val} readonly size={3} />
                                                </div>
                                            ) : null)}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleHelpful(review._id)}
                                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                                            style={{ background: 'var(--bg-page)', color: 'var(--text-secondary)' }}
                                        >
                                            <ThumbsUp className="w-3 h-3" />
                                            Helpful ({review.helpfulCount || 0})
                                        </button>
                                        {(user?.role === 'manager' || user?.role === 'admin') && (
                                            <button
                                                onClick={() => setReplyingId(replyingId === review._id ? null : review._id)}
                                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors"
                                                style={{ background: 'var(--bg-page)', color: '#6366f1' }}
                                            >
                                                <Reply className="w-3 h-3" />
                                                Reply
                                            </button>
                                        )}
                                    </div>

                                    {/* Manager Reply */}
                                    {review.managerReply?.text && (
                                        <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(99,102,241,0.08)', borderLeft: '3px solid #6366f1' }}>
                                            <p className="text-xs font-bold text-indigo-400 mb-1">Manager Response</p>
                                            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{review.managerReply.text}</p>
                                        </div>
                                    )}

                                    {/* Reply form */}
                                    <AnimatePresence>
                                        {replyingId === review._id && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="mt-4 flex gap-2"
                                            >
                                                <input
                                                    type="text"
                                                    placeholder="Write your reply..."
                                                    value={replyText}
                                                    onChange={e => setReplyText(e.target.value)}
                                                    className="flex-1 px-3 py-2 rounded-xl text-sm"
                                                    style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
                                                />
                                                <button
                                                    onClick={() => handleReply(review._id)}
                                                    className="px-4 py-2 rounded-xl text-white text-sm font-bold"
                                                    style={{ background: '#6366f1' }}
                                                >
                                                    <Send className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>
        </div>
    );
};

export default ReviewsPage;
