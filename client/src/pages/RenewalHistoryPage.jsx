import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, FileText, Download } from 'lucide-react';

export default function RenewalHistoryPage() {
  const [renewals, setRenewals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRenewals = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/renewals/my', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRenewals(res.data.data || res.data || []);
      } catch (err) {
        console.error('Error fetching renewals:', err);
        setError('Failed to fetch lease renewals list.');
      } finally {
        setLoading(false);
      }
    };
    fetchRenewals();
  }, []);

  const handleDownloadRenewalReport = (renewalId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/renewals/${renewalId}/renewal-report?token=${token}`, '_blank');
  };

  if (loading) {
    return <div className="text-center py-12">Loading lease renewals history...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <History className="w-6 h-6 text-indigo-500" />
          <h2 className="text-lg font-bold text-foreground">Lease Renewals & Offers</h2>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <div className="space-y-4">
          {renewals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No prior renewal requests or offers found.</p>
          ) : (
            renewals.map((r) => (
              <div key={r._id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 mt-1">
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{r.property?.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${r.type === 'manager_offer' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                        {r.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Proposed Period: {new Date(r.requestedStartDate).toLocaleDateString()} - {new Date(r.requestedEndDate).toLocaleDateString()} ({r.duration})
                    </p>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">Proposed Rent: ₹{r.proposedRent?.toLocaleString('en-IN')}/month</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  {r.status === 'approved' && (
                    <button
                      onClick={() => handleDownloadRenewalReport(r._id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-border hover:bg-muted transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Renewal Sheet
                    </button>
                  )}
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize border text-center ${r.status === 'approved' || r.status === 'accepted' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : r.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-muted border-border text-muted-foreground'}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
