import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { History, FileText, Download } from 'lucide-react';

export default function LeaseHistoryPage() {
  const [leases, setLeases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeases = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/leases', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setLeases(res.data.data || res.data || []);
      } catch (err) {
        console.error('Error fetching leases:', err);
        setError('Failed to fetch lease history.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeases();
  }, []);

  const handleDownloadExitReport = (leaseId) => {
    const token = localStorage.getItem('token');
    window.open(`/api/lease/${leaseId}/exit-report?token=${token}`, '_blank');
  };

  if (loading) {
    return <div className="text-center py-12">Loading lease histories...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <History className="w-6 h-6 text-indigo-500" />
          <h2 className="text-lg font-bold text-foreground">Lease Agreement History</h2>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <div className="space-y-4">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No prior lease agreements resolved.</p>
          ) : (
            leases.map((l) => (
              <div key={l._id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 mt-1">
                    <FileText className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-foreground">{l.leaseNumber}</p>
                      <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
                        V{l.leaseVersion || 1}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs font-bold text-indigo-400 mt-0.5">₹{l.rentAmount?.toLocaleString('en-IN')}/month</p>
                  </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                  {l.status === 'expired' && (
                    <button
                      onClick={() => handleDownloadExitReport(l._id)}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-1.5 text-xs font-bold rounded-lg border border-border hover:bg-muted transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Exit Report
                    </button>
                  )}
                  <span className={`px-3 py-1.5 text-xs font-bold rounded-lg capitalize border text-center ${l.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-muted border-border text-muted-foreground'}`}>
                    {l.status}
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
