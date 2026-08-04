import React, { useState, useRef } from 'react';
import { 
  ArrowRight, Check, CheckCircle2, MessageSquare, History, 
  FileText, PenTool, Type, Upload, AlertCircle, RefreshCw, Send
} from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/dashboardHelpers';

export const NegotiationWorkspace = ({ 
  renewal, 
  lease, 
  user,
  onCounter, 
  onApprove, 
  onSign, 
  onPostMessage,
  refresh
}) => {
  const [activeTab, setActiveTab] = useState('compare');
  const [proposedRent, setProposedRent] = useState('');
  const [duration, setDuration] = useState('12 months');
  const [message, setMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sigMode, setSigMode] = useState('draw');
  const [typedSig, setTypedSig] = useState('');
  const [sigImg, setSigImg] = useState(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);

  const isTenant = user?.role === 'tenant';

  // Compare active offer terms with original lease terms
  const currentRent = lease?.rentAmount || 0;
  const currentDuration = lease?.duration || '12 months';
  const currentDeposit = lease?.securityDeposit || 0;
  const currentNotice = lease?.noticePeriod || 30;

  const proposedRentVal = renewal?.proposedRent || currentRent;
  const proposedDuration = renewal?.duration || currentDuration;
  const proposedDeposit = renewal?.proposedDeposit || currentDeposit;
  const proposedNotice = renewal?.proposedNotice || 45;

  const rentChanged = proposedRentVal !== currentRent;
  const durationChanged = proposedDuration !== currentDuration;
  const depositChanged = proposedDeposit !== currentDeposit;
  const noticeChanged = proposedNotice !== currentNotice;

  // Timeline workflow tracker
  const steps = [
    { label: 'Requested', done: ['requested', 'under_review', 'counter_offer', 'approved', 'signed', 'completed'].includes(renewal?.status) },
    { label: 'Under Review', done: ['under_review', 'counter_offer', 'approved', 'signed', 'completed'].includes(renewal?.status) },
    { label: 'Counter Offer', done: ['counter_offer', 'approved', 'signed', 'completed'].includes(renewal?.status) },
    { label: 'Approved', done: ['approved', 'signed', 'completed'].includes(renewal?.status) },
    { label: 'Signed', done: ['signed', 'completed'].includes(renewal?.status) },
    { label: 'Completed', done: renewal?.status === 'completed' }
  ];

  const handlePostChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await onPostMessage(chatInput);
      setChatInput('');
    } catch (err) {
      alert(err.message || 'Failed to send message.');
    }
  };

  const handleCounterSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCounter({
        proposedRent: Number(proposedRent) || proposedRentVal,
        duration,
        message
      });
      setProposedRent('');
      setMessage('');
    } catch (err) {
      alert(err.message || 'Failed to submit counter.');
    } finally {
      setSubmitting(false);
    }
  };

  // Canvas drawing handlers
  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
    isDrawing.current = true;
  };

  const draw = (e) => {
    if (!isDrawing.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches[0].clientX) - rect.left;
    const y = (e.clientY || e.touches[0].clientY) - rect.top;
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawing.current = false;
    if (canvasRef.current) {
      setSigImg(canvasRef.current.toDataURL());
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSigImg(null);
  };

  const handleSignSubmit = async () => {
    let finalSig = sigImg;
    if (sigMode === 'type' && typedSig.trim()) {
      finalSig = `TYPED_SIGNATURE:${typedSig.trim()}`;
    }
    if (!finalSig) {
      alert('Please provide a signature first.');
      return;
    }
    try {
      await onSign(finalSig);
    } catch (err) {
      alert(err.message || 'Failed to apply signature.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-8">
      {/* Header & Status Indicator */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-50 dark:border-slate-850">
        <div>
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Renewal Center</span>
          <h3 className="text-xl font-bold text-slate-805 dark:text-slate-100 mt-1">Offer Negotiation Center</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Status:</span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            {renewal?.status}
          </span>
          <button onClick={refresh} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg bg-slate-50 dark:bg-slate-850 transition">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Timeline Stepper */}
      <div className="w-full">
        <div className="flex justify-between items-center gap-2 overflow-x-auto pb-2">
          {steps.map((st, i) => (
            <div key={st.label} className="flex items-center gap-2 shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                st.done 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
              }`}>
                {st.done ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-xs font-semibold ${st.done ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                {st.label}
              </span>
              {i < steps.length - 1 && (
                <div className={`w-6 h-0.5 ${st.done ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-150 dark:border-slate-800 pb-3 gap-6 text-sm font-semibold">
        <button 
          onClick={() => setActiveTab('compare')}
          className={`pb-3 relative transition ${activeTab === 'compare' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          Compare Offer
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`pb-3 relative transition flex items-center gap-2 ${activeTab === 'chat' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <MessageSquare size={16} />
          <span>Chat Messages ({renewal?.messages?.length || 0})</span>
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`pb-3 relative transition flex items-center gap-2 ${activeTab === 'audit' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <History size={16} />
          <span>Offers History ({renewal?.counterOffers?.length || 1})</span>
        </button>
        <button 
          onClick={() => setActiveTab('sign')}
          className={`pb-3 relative transition flex items-center gap-2 ${activeTab === 'sign' ? 'text-primary border-b-2 border-primary' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <FileText size={16} />
          <span>Agreement & Sign</span>
        </button>
      </div>

      {/* Content Area */}
      <div className="space-y-6">
        {/* TAB 1: COMPARE OFFER */}
        {activeTab === 'compare' && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    <th className="py-3 px-4">Field</th>
                    <th className="py-3 px-4">Current Lease</th>
                    <th className="py-3 px-4">Proposed Renewal</th>
                    <th className="py-3 px-4">State</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <tr className={`border-b border-slate-50 dark:border-slate-850/50 ${rentChanged ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                    <td className="py-3 px-4 font-bold">Monthly Rent</td>
                    <td className="py-3 px-4">{formatCurrency(currentRent)}</td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400 font-bold">{formatCurrency(proposedRentVal)}</td>
                    <td className="py-3 px-4">
                      {rentChanged ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">CHANGED</span>
                      ) : 'NO CHANGE'}
                    </td>
                  </tr>
                  <tr className={`border-b border-slate-50 dark:border-slate-850/50 ${durationChanged ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                    <td className="py-3 px-4 font-bold">Duration</td>
                    <td className="py-3 px-4">{currentDuration}</td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400">{proposedDuration}</td>
                    <td className="py-3 px-4">
                      {durationChanged ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">CHANGED</span>
                      ) : 'NO CHANGE'}
                    </td>
                  </tr>
                  <tr className={`border-b border-slate-50 dark:border-slate-850/50 ${depositChanged ? 'bg-indigo-50/20 dark:bg-indigo-950/10' : ''}`}>
                    <td className="py-3 px-4 font-bold">Security Deposit</td>
                    <td className="py-3 px-4">{formatCurrency(currentDeposit)}</td>
                    <td className="py-3 px-4 text-indigo-600 dark:text-indigo-400">{formatCurrency(proposedDeposit)}</td>
                    <td className="py-3 px-4">
                      {depositChanged ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold tracking-wide rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">CHANGED</span>
                      ) : 'NO CHANGE'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Counter Form */}
            {renewal?.status === 'counter_offer' || renewal?.status === 'requested' || renewal?.status === 'under_review' ? (
              <form onSubmit={handleCounterSubmit} className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Submit a Counter Offer</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Proposed Rent</label>
                    <input 
                      type="number"
                      placeholder={proposedRentVal.toString()}
                      value={proposedRent}
                      onChange={(e) => setProposedRent(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Proposed Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                    >
                      <option value="12 months">12 Months (Standard)</option>
                      <option value="6 months">6 Months (Short Term)</option>
                      <option value="24 months">24 Months (Long Term)</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wide">Optional Message</label>
                  <textarea 
                    placeholder="Provide context for your manager/tenant..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={2}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                  >
                    Submit Counter
                  </button>
                  {renewal?.status === 'under_review' && !isTenant && (
                    <button 
                      type="button"
                      onClick={onApprove}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Approve Offer
                    </button>
                  )}
                  {renewal?.status === 'counter_offer' && isTenant && (
                    <button 
                      type="button"
                      onClick={onApprove}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Accept Counter Offer
                    </button>
                  )}
                </div>
              </form>
            ) : null}
          </div>
        )}

        {/* TAB 2: MESSAGES CHAT PANEL */}
        {activeTab === 'chat' && (
          <div className="space-y-4">
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 h-64 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-slate-950/20">
              {(renewal?.messages || []).length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-12">No messages in this negotiation yet.</p>
              ) : (
                (renewal?.messages || []).map((msg, i) => (
                  <div key={i} className={`flex flex-col max-w-[80%] rounded-2xl p-3 text-xs leading-relaxed ${
                    msg.sender === user?.userId 
                      ? 'bg-primary text-white ml-auto' 
                      : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-850 text-slate-700 dark:text-slate-300mr-auto'
                  }`}>
                    <span className="font-bold block opacity-75">{msg.senderName}</span>
                    <span className="mt-1 font-semibold block">{msg.content}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handlePostChat} className="flex gap-2">
              <input 
                type="text"
                placeholder="Type your negotiation message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-850 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs focus:outline-none"
              />
              <button type="submit" className="p-2.5 rounded-xl bg-primary text-white hover:bg-primary-hover transition">
                <Send size={16} />
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: OFFERS VERSION HISTORY */}
        {activeTab === 'audit' && (
          <div className="space-y-4">
            <div className="space-y-3">
              {/* Original proposal */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-slate-50 dark:bg-slate-850 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">Version 1 (Initial Request)</span>
                  <span className="text-[10px] text-slate-450 dark:text-slate-500">{formatDate(renewal?.createdAt)}</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2">
                  <p>Rent: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(renewal?.proposedRent || 0)}</span></p>
                  <p>Duration: <span className="font-semibold text-slate-700 dark:text-slate-300">{renewal?.duration}</span></p>
                </div>
              </div>

              {/* Counters */}
              {(renewal?.counterOffers || []).map((ct, idx) => (
                <div key={idx} className="border border-slate-100 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Version {idx + 2} (Counter Offer)</span>
                    <span className="text-[10px] text-slate-450 dark:text-slate-500">{formatDate(ct.createdAt)}</span>
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 pt-2">
                    <p>Rent: <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(ct.proposedRent)}</span></p>
                    <p>Duration: <span className="font-semibold text-slate-700 dark:text-slate-300">{ct.duration}</span></p>
                    {ct.message && <p className="italic bg-slate-50 dark:bg-slate-850 p-2 rounded mt-2 text-[11px]">"{ct.message}"</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AGREEMENT PREVIEW & DIGITAL SIGNATURE */}
        {activeTab === 'sign' && (
          <div className="space-y-6">
            <div className="border border-slate-100 dark:border-slate-800 rounded-2xl p-6 bg-slate-50 dark:bg-slate-850 text-xs text-slate-600 dark:text-slate-400 space-y-4">
              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center uppercase tracking-wide">Residential Lease Renewal Agreement Extension</h4>
              <p className="text-center font-semibold text-[10px]">Document Reference: {renewal?.renewalNumber}</p>
              
              <div className="space-y-2 border-t border-b border-slate-200 dark:border-slate-750 py-4 font-medium leading-relaxed">
                <p><strong>Property Details:</strong> {lease?.property?.name || 'Sunrise Residency'}</p>
                <p><strong>Proposed Term:</strong> {proposedDuration} starting {formatDate(renewal?.requestedStartDate)}</p>
                <p><strong>Monthly Rent Locked:</strong> {formatCurrency(proposedRentVal)} per month</p>
              </div>

              <div className="leading-relaxed">
                <p className="font-bold text-slate-800 dark:text-slate-200">Covenants &amp; Declarations:</p>
                By signing this document, both parties acknowledge and agree that all conditions of the original lease dated {formatDate(lease?.startDate)} remain fully active, except where explicitly modified above.
              </div>
            </div>

            {/* Signature UI Card */}
            {renewal?.status === 'approved' ? (
              <div className="bg-slate-50 dark:bg-slate-850 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Apply Digital Signature</h4>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setSigMode('draw'); clearCanvas(); }} className={`px-3 py-1 rounded text-xs font-semibold ${sigMode === 'draw' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'}`}>Draw</button>
                    <button type="button" onClick={() => setSigMode('type')} className={`px-3 py-1 rounded text-xs font-semibold ${sigMode === 'type' ? 'bg-primary text-white' : 'bg-slate-200 text-slate-700'}`}>Type</button>
                  </div>
                </div>

                {sigMode === 'draw' ? (
                  <div className="space-y-3">
                    <div className="border border-slate-200 dark:border-slate-850 rounded-xl bg-white dark:bg-slate-900 p-2">
                      <canvas 
                        ref={canvasRef}
                        width={400}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-28 cursor-crosshair bg-slate-50 dark:bg-slate-950 rounded-lg"
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-slate-450 dark:text-slate-550">Draw signature inside block</span>
                      <button type="button" onClick={clearCanvas} className="text-[10px] text-rose-500 font-bold uppercase">Clear</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input 
                      type="text"
                      placeholder="Type your full legal name"
                      value={typedSig}
                      onChange={(e) => setTypedSig(e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-805 focus:outline-none"
                    />
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={handleSignSubmit}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition"
                >
                  Sign &amp; Execute Extension
                </button>
              </div>
            ) : (
              <div className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 p-4 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>Agreement will be unlocked for signature once terms are officially Approved.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NegotiationWorkspace;
