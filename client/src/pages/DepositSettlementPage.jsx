import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DollarSign, Trash2, Plus, CheckCircle2 } from 'lucide-react';

export default function DepositSettlementPage() {
  const { id } = useParams(); // lease ID
  const navigate = useNavigate();
  const [lease, setLease] = useState(null);
  const [deductions, setDeductions] = useState([]);
  const [newReason, setNewReason] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [reasonText, setReasonText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchLease = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/leases/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLease(res.data.data || res.data);
      } catch (err) {
        console.error('Error fetching lease details:', err);
        setError('Failed to fetch lease details.');
      } finally {
        setLoading(false);
      }
    };
    fetchLease();
  }, [id]);

  const handleAddDeduction = () => {
    if (!newReason || !newAmount) return;
    setDeductions(prev => [...prev, { reason: newReason, amount: Number(newAmount) }]);
    setNewReason('');
    setNewAmount('');
  };

  const handleRemoveDeduction = (idx) => {
    setDeductions(prev => prev.filter((_, i) => i !== idx));
  };

  const totalDeductions = deductions.reduce((acc, curr) => acc + curr.amount, 0);
  const refundAmount = Math.max(0, (lease?.depositAmount || 0) - totalDeductions);

  const handleSubmitRefund = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/deposit/refund', {
        leaseId: id,
        deductions,
        reason: reasonText
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => navigate('/leases'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit refund settlement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading deposit settlement sheet...</div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card border border-border rounded-2xl space-y-4 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Settlement Logged!</h2>
        <p className="text-muted-foreground text-sm">Deposit settlement processed successfully. Redirecting...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <DollarSign className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Deposit Refund Settlement</h2>
            <p className="text-xs text-muted-foreground">Lease Reference: {lease?.leaseNumber}</p>
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <div className="grid grid-cols-3 gap-4 bg-muted/20 p-4 rounded-xl text-center border border-border">
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Original Deposit</p>
            <p className="text-lg font-black text-foreground">₹{lease?.depositAmount?.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Total Deductions</p>
            <p className="text-lg font-black text-red-400">₹{totalDeductions.toLocaleString('en-IN')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Calculated Refund</p>
            <p className="text-lg font-black text-emerald-400">₹{refundAmount.toLocaleString('en-IN')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold text-foreground">Itemized Deductions</h3>

          <div className="space-y-2">
            {deductions.map((d, i) => (
              <div key={i} className="flex justify-between items-center bg-muted/25 px-4 py-3 rounded-xl border border-border">
                <span className="text-xs font-bold text-muted-foreground">{d.reason}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-red-400 font-bold">₹{d.amount}</span>
                  <button type="button" onClick={() => handleRemoveDeduction(i)} className="text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Deduction reason (e.g. Broken Lock)"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              className="flex-1 bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs focus:outline-none"
            />
            <input
              type="number"
              placeholder="Amount (₹)"
              value={newAmount}
              onChange={(e) => setNewAmount(e.target.value)}
              className="w-32 bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddDeduction}
              className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-all"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmitRefund} className="space-y-4 border-t border-border pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Deduction Description & Explanation</label>
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={3}
              placeholder="Provide a legal details summary regarding these deductions..."
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          >
            {submitting ? 'Processing Refund...' : 'Submit Deposit Refund Settlement'}
          </button>
        </form>
      </div>
    </div>
  );
}
