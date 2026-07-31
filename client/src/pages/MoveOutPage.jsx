import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogOut, CheckCircle2 } from 'lucide-react';

export default function MoveOutPage() {
  const navigate = useNavigate();
  const [expectedMoveOutDate, setExpectedMoveOutDate] = useState('');
  const [reason, setReason] = useState('Job Relocation');
  const [comments, setComments] = useState('');
  const [lease, setLease] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/leases/my-lease', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const currentLease = res.data.data || res.data;
        setLease(currentLease);
        if (currentLease?.endDate) {
          setExpectedMoveOutDate(new Date(currentLease.endDate).toISOString().split('T')[0]);
        }
      } catch (err) {
        console.error('Error fetching lease:', err);
        setError('Failed to fetch lease details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLease();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!lease) return;

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/lease/moveout', {
        leaseId: lease._id,
        expectedMoveOutDate,
        reason,
        comments
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => navigate('/exit-feedback'), 2000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit move-out notice.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading parameters...</div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card border border-border rounded-2xl space-y-4 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Notice Logged Successfully!</h2>
        <p className="text-muted-foreground text-sm">Redirecting to mandatory exit feedback...</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <form onSubmit={handleSubmit} className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3">
          <LogOut className="w-6 h-6 text-amber-500" />
          <h2 className="text-lg font-bold text-foreground">Submit Move-Out Notice</h2>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">Expected Move-Out Date</label>
          <input
            type="date"
            value={expectedMoveOutDate}
            onChange={(e) => setExpectedMoveOutDate(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">Primary Reason for Moving Out</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
          >
            <option value="Job Relocation">Job Relocation</option>
            <option value="Buying Home">Buying Home</option>
            <option value="Family Reasons">Family Reasons</option>
            <option value="High Rent">High Rent</option>
            <option value="Poor Maintenance">Poor Maintenance</option>
            <option value="Better Property">Better Property</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-muted-foreground">Additional Comments</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={4}
            placeholder="Please share any other details about your move-out schedule..."
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : 'Submit Move-Out Notice'}
        </button>
      </form>
    </div>
  );
}
