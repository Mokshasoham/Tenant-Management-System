import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function InspectionPage() {
  const { id } = useParams(); // inspection ID
  const navigate = useNavigate();
  const [inspection, setInspection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [checklist, setChecklist] = useState({
    walls: false,
    paint: false,
    furniture: false,
    kitchen: false,
    bathroom: false,
    plumbing: false,
    electrical: false,
    windows: false,
    doors: false,
    parking: false,
    keysReturned: false,
    waterReading: '',
    electricityReading: '',
  });

  const [inspectionResult, setInspectionResult] = useState('passed');
  const [notes, setNotes] = useState('');
  const [estimatedRepairCost, setEstimatedRepairCost] = useState(0);
  const [actualRepairCost, setActualRepairCost] = useState(0);

  useEffect(() => {
    console.log('[InspectionPage] Destination page loaded', { inspectionId: id });
    const fetchInspection = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/inspection/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const insp = res.data.data || res.data;
        setInspection(insp);
        if (insp.checklist) {
          setChecklist(prev => ({ ...prev, ...insp.checklist }));
        }
        if (insp.inspectionResult) {
          setInspectionResult(insp.inspectionResult);
        }
        if (insp.notes) {
          setNotes(insp.notes);
        }
      } catch (err) {
        console.error('Error fetching inspection:', err);
        setError('Failed to fetch inspection details.');
      } finally {
        setLoading(false);
      }
    };
    fetchInspection();
  }, [id]);

  const handleChecklistChange = (key, val) => {
    setChecklist(prev => ({ ...prev, [key]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/inspection/${id}`, {
        checklist,
        inspectionResult,
        notes,
        estimatedRepairCost,
        actualRepairCost,
        refundAmount: Math.max(0, (inspection?.lease?.depositAmount || 0) - actualRepairCost)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(true);
      setTimeout(() => navigate('/leases'), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to complete inspection report.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading property inspection sheet...</div>;
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto my-12 text-center p-8 bg-card border border-border rounded-2xl space-y-4 shadow-xl">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h2 className="text-xl font-bold">Inspection Finished!</h2>
        <p className="text-muted-foreground text-sm">Report submitted successfully. Redirecting to leases panel...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <form onSubmit={handleSubmit} className="bg-card/40 border border-border backdrop-blur-md rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Eye className="w-6 h-6 text-indigo-500" />
          <div>
            <h2 className="text-lg font-bold text-foreground">Property Inspection Report</h2>
            <p className="text-xs text-muted-foreground">Lease Reference: {inspection?.lease?.leaseNumber}</p>
          </div>
        </div>

        {error && <div className="text-xs text-red-400 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">Checklist Audit</h3>
            <div className="grid grid-cols-2 gap-3">
              {['walls', 'paint', 'furniture', 'kitchen', 'bathroom', 'plumbing', 'electrical', 'windows', 'doors', 'parking', 'keysReturned'].map((item) => (
                <label key={item} className="flex items-center gap-3 text-xs text-muted-foreground capitalize select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={checklist[item]}
                    onChange={(e) => handleChecklistChange(item, e.target.checked)}
                    className="rounded border-border bg-muted text-indigo-600 focus:ring-0 w-4 h-4"
                  />
                  {item.replace(/([A-Z])/g, ' $1')}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-foreground border-b border-border pb-1">Meter Readings</h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">Water Meter Reading</label>
                <input
                  type="text"
                  value={checklist.waterReading}
                  onChange={(e) => handleChecklistChange('waterReading', e.target.value)}
                  placeholder="e.g. 4832 KL"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground block">Electricity Meter Reading</label>
                <input
                  type="text"
                  value={checklist.electricityReading}
                  onChange={(e) => handleChecklistChange('electricityReading', e.target.value)}
                  placeholder="e.g. 9845 kWh"
                  className="w-full bg-muted/30 border border-border rounded-xl px-4 py-2 text-xs focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Inspection Result</label>
            <select
              value={inspectionResult}
              onChange={(e) => setInspectionResult(e.target.value)}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            >
              <option value="passed">Passed (No damage charges)</option>
              <option value="minor_damage">Minor Damage</option>
              <option value="major_damage">Major Damage</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Estimated Repair Cost (₹)</label>
            <input
              type="number"
              value={estimatedRepairCost}
              onChange={(e) => setEstimatedRepairCost(Number(e.target.value))}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground">Actual Repair Cost (₹)</label>
            <input
              type="number"
              value={actualRepairCost}
              onChange={(e) => setActualRepairCost(Number(e.target.value))}
              className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-muted-foreground block">Calculated Refundable Amount</label>
            <div className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm text-foreground font-black">
              ₹{Math.max(0, (inspection?.lease?.depositAmount || 0) - actualRepairCost).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <label className="text-xs font-bold text-muted-foreground">Inspection Observations & Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Document any structural anomalies, cleaning required, or general damage notes..."
            className="w-full bg-muted/30 border border-border rounded-xl px-4 py-3 text-sm focus:outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all disabled:opacity-50"
        >
          {submitting ? 'Submitting Report...' : 'Submit Completed Inspection Report'}
        </button>
      </form>
    </div>
  );
}
