import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { Star, MessageSquare, CheckCircle2 } from 'lucide-react';

export default function ExitFeedbackPage() {
  const navigate = useNavigate();
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Ratings (1-5)
  const [ratings, setRatings] = useState({
    propertyCondition: 5,
    cleanliness: 5,
    managerSupport: 5,
    maintenanceService: 5,
    security: 5,
    amenities: 5,
    overallExperience: 5,
  });

  const [recommend, setRecommend] = useState(true);
  const [rentSatisfied, setRentSatisfied] = useState(true);
  const [maintenanceSatisfied, setMaintenanceSatisfied] = useState(true);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const res = await apiClient.get('/leases/my-lease');
        setLease(res?.data || res);
      } catch (err) {
        console.error('Error fetching lease:', err);
        setError('Failed to fetch lease details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLease();
  }, []);

  const handleRatingChange = (key, val) => {
    setRatings(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lease) return;

    setSubmitting(true);
    setError('');
    try {
      await apiClient.post('/feedback/exit', {
        leaseId: lease._id,
        ratings,
        recommend,
        rentSatisfied,
        maintenanceSatisfied,
        comments,
        suggestions
      });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.message || err.response?.data?.message || (typeof err === 'string' ? err : 'Failed to submit feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (key) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          onClick={() => handleRatingChange(key, i)}
          className={`p-1 transition-all ${ratings[key] >= i ? 'text-amber-400' : 'text-muted-foreground/30 hover:text-amber-300'}`}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      );
    }
    return <div className="flex gap-1">{stars}</div>;
  };

  if (loading) {
    return <div className="text-center py-12">Loading exit feedback questionnaire...</div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card border border-border rounded-2xl space-y-4 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Feedback Submitted Successfully!</h2>
        <p className="text-muted-foreground text-sm">Thank you for sharing your experience. Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <form onSubmit={handleSubmit} className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-indigo-500" />
          <h2 className="text-lg font-bold text-foreground">Exit Feedback Form</h2>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <p className="text-xs text-muted-foreground">
          We want to hear about your experience staying in our property. Exit feedback is required to schedule inspection and process deposit settlements.
        </p>

        <div className="space-y-4 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Property Condition</span>
            {renderStars('propertyCondition')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Cleanliness</span>
            {renderStars('cleanliness')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Manager Support</span>
            {renderStars('managerSupport')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Maintenance Service</span>
            {renderStars('maintenanceService')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Security</span>
            {renderStars('security')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Amenities</span>
            {renderStars('amenities')}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Overall Experience</span>
            {renderStars('overallExperience')}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-border pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">Recommend this property?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRecommend(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${recommend ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setRecommend(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${!recommend ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                No
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">Rent was reasonable?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRentSatisfied(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${rentSatisfied ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setRentSatisfied(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${!rentSatisfied ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                No
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">Maintenance handled fast?</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMaintenanceSatisfied(true)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${maintenanceSatisfied ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setMaintenanceSatisfied(false)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all ${!maintenanceSatisfied ? 'bg-indigo-600/20 border-indigo-600 text-indigo-400' : 'border-border text-muted-foreground'}`}
              >
                No
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <label className="text-xs font-bold text-muted-foreground">General Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            placeholder="Share your general experience..."
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">Suggestions for Improvement</label>
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            rows={3}
            placeholder="What could we have done better?"
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Exit Feedback'}
        </button>
      </form>
    </div>
  );
}
