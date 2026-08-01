import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, MessageSquare, Info, CheckCircle2 } from 'lucide-react';

export default function LeaseRenewalPage() {
  const navigate = useNavigate();
  const [duration, setDuration] = useState('12 Months');
  const [customEndDate, setCustomEndDate] = useState('');
  const [message, setMessage] = useState('');
  const [lease, setLease] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    console.log('[LeaseRenewalPage] Destination page loaded');
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        // Fetch current tenant lease
        const leaseRes = await axios.get('/api/leases/my-lease', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentLease = leaseRes.data.data || leaseRes.data;
        setLease(currentLease);

        // Fetch tenant's own renewals/offers
        const renewalRes = await axios.get('/api/renewals/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const renewals = renewalRes.data.data || [];
        const offer = renewals.find(r => r.lease?._id === currentLease?._id && r.status === 'offered');
        setPendingOffer(offer);
      } catch (err) {
        console.error('Error fetching lease details:', err);
        setError('Failed to load active lease details.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!lease) return;

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const requestedStartDate = new Date(lease.endDate);
      const requestedEndDate = new Date(lease.endDate);
      
      if (duration === '3 Months') {
        requestedEndDate.setMonth(requestedEndDate.getMonth() + 3);
      } else if (duration === '6 Months') {
        requestedEndDate.setMonth(requestedEndDate.getMonth() + 6);
      } else if (duration === '12 Months') {
        requestedEndDate.setMonth(requestedEndDate.getMonth() + 12);
      } else {
        requestedEndDate.setTime(new Date(customEndDate).getTime());
      }

      await axios.post('/api/renewals/request', {
        leaseId: lease._id,
        duration,
        message,
        requestedStartDate: requestedStartDate.toISOString(),
        requestedEndDate: requestedEndDate.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit renewal request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRespondOffer = async (action) => {
    if (!pendingOffer) return;
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`/api/renewals/${pendingOffer._id}/respond`, { action }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading renewal parameters...</div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card border border-border rounded-2xl space-y-4">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Action Completed Successfully!</h2>
        <p className="text-muted-foreground text-sm">Redirecting you to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {pendingOffer ? (
        <div className="bg-card/40 border border-indigo-500/20 backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <Info className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-bold text-foreground">Lease Renewal Offer Pending</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Your property manager has offered a lease renewal. Review the terms below:
          </p>
          <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl text-sm border border-border">
            <div>
              <p className="text-muted-foreground">Renewal Period:</p>
              <p className="font-bold">{pendingOffer.duration}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Proposed Monthly Rent:</p>
              <p className="font-bold text-indigo-400">₹{pendingOffer.proposedRent?.toLocaleString('en-IN')}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Manager Notes:</p>
              <p className="italic text-muted-foreground">{pendingOffer.message || 'No additional message'}</p>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => handleRespondOffer('accept')}
              className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all"
            >
              Accept Offer
            </button>
            <button
              onClick={() => handleRespondOffer('reject')}
              className="flex-1 py-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground font-bold transition-all"
            >
              Decline Offer
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmitRequest} className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-indigo-500" />
            <h2 className="text-lg font-bold text-foreground">Request Lease Renewal</h2>
          </div>

          {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Extension Period</label>
            <select
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            >
              <option value="3 Months">3 Months</option>
              <option value="6 Months">6 Months</option>
              <option value="12 Months">12 Months</option>
              <option value="Custom">Custom Date</option>
            </select>
          </div>

          {duration === 'Custom' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground">Custom End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Message to Manager</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Provide context or details about your request..."
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Renewal Request'}
          </button>
        </form>
      )}
    </div>
  );
}
