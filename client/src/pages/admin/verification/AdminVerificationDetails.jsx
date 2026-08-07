import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User,
  FileCheck,
  Award,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  Download,
  UserPlus,
  MessageSquare,
  ChevronLeft,
  Clock,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  TrustScoreBadge,
  RiskFlagBadge,
  ReviewLevelBadge,
  CircularProgress,
  ApprovalDialog,
  RejectDialog,
  VerificationTimeline,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import { MOCK_REVIEWERS } from '../../../mocks/adminVerificationMock';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

const TABS = [
  { key: 'OVERVIEW', label: 'Overview' },
  { key: 'DOCUMENTS', label: 'Uploaded Documents' },
  { key: 'TRUST_SCORE', label: 'Trust Score Analytics' },
  { key: 'TIMELINE', label: '12-Stage Timeline' },
  { key: 'RISK_ANALYSIS', label: 'Risk & Fraud Analysis' },
  { key: 'REVIEW_HISTORY', label: 'Review History' },
  { key: 'CASE_NOTES', label: 'Actions & Internal Case Notes' },
];

export default function AdminVerificationDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const mapper = getVerificationMapper('ADMIN');

  const [activeTab, setActiveTab] = useState('OVERVIEW');
  const [record, setRecord] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [trust, setTrust] = useState(null);
  const [caseNotes, setCaseNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  // Dialog States
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  useEffect(() => {
    const details = mapper.mapDetails(id, null);
    const docs = mapper.mapDocuments(null);
    const ts = mapper.mapTrust(null);
    const notes = mapper.mapCaseNotes(null);

    setRecord(details);
    setDocuments(docs);
    setTrust(ts);
    setCaseNotes(notes);

    trackEvent(VERIFICATION_EVENTS.ADMIN_DETAILS_OPEN, { vrf: details.verificationNumber });
  }, [id]);

  if (!record || !trust) {
    return <div className="p-8 text-center text-slate-400">Loading 360° Review Workspace...</div>;
  }

  const handleAssignReviewer = (revName) => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_ASSIGN, { reviewer: revName, id: record.id });
    setRecord((prev) => ({ ...prev, assignedReviewer: revName }));
    alert(`Assigned review to ${revName}`);
  };

  const handleAddCaseNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const noteObj = {
      id: `cn_${Date.now()}`,
      author: 'Alex Mercer',
      role: 'Senior Compliance Lead',
      timestamp: new Date().toISOString(),
      content: newNote.trim(),
    };
    setCaseNotes((prev) => [noteObj, ...prev]);
    setNewNote('');
    alert('Internal case note added to audit trail.');
  };

  const handleDownloadReport = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_EXPORT, { reportType: 'PDF_AUDIT', vrf: record.verificationNumber });
    alert(`Generated Enterprise Verification Audit Report PDF for ${record.verificationNumber}.`);
  };

  const handleApproveConfirm = (remarks) => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_APPROVE, { id: record.id, remarks });
    setRecord((prev) => ({ ...prev, status: 'APPROVED', currentReviewLevel: 3 }));
    setApprovalOpen(false);
    alert(`Verification ${record.verificationNumber} APPROVED!`);
  };

  const handleRejectConfirm = (reason, remarks) => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_REJECT, { id: record.id, reason, remarks });
    setRecord((prev) => ({ ...prev, status: 'REJECTED' }));
    setRejectOpen(false);
    alert(`Verification ${record.verificationNumber} REJECTED for: ${reason}`);
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin/verification/queue')}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium mb-2"
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Queue
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{record.entityName}</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              {record.entityType}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-1">
            VRF Code: {record.verificationNumber} · Submitted: {new Date(record.submittedAt).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleDownloadReport}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shadow-md transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-indigo-400" /> Download Report PDF
          </button>

          {/* Assign Reviewer Dropdown */}
          <select
            value={record.assignedReviewer}
            onChange={(e) => handleAssignReviewer(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 text-xs font-semibold"
          >
            <option value="Unassigned">Assign Reviewer...</option>
            {MOCK_REVIEWERS.map((r) => (
              <option key={r.id} value={r.name}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero Overview Status Strip */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <VerificationStatusBadge status={record.status} />
          <ReviewLevelBadge level={record.currentReviewLevel} />
          <RiskFlagBadge risk={record.riskLevel} />
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[11px] text-slate-400">Assigned Compliance Officer</p>
            <p className="text-xs font-bold text-slate-200">{record.assignedReviewer}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-slate-400">SLA Status</p>
            <p className="text-xs font-extrabold text-emerald-400">{record.slaStatus}</p>
          </div>
        </div>
      </div>

      {/* Modular Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <div className="min-h-[400px]">
        {/* Tab 1: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VerificationSectionCard title="Applicant & Entity Profile" icon={User}>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Entity Name</span>
                  <span className="text-slate-200 font-bold">{record.entityName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Applicant / Authorized Lead</span>
                  <span className="text-slate-200 font-semibold">{record.applicantName}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Email Address</span>
                  <span className="text-slate-200 font-mono">{record.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Phone Number</span>
                  <span className="text-slate-200 font-mono">{record.phone}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Entity Domain Type</span>
                  <span className="text-indigo-400 font-bold">{record.entityType}</span>
                </div>
              </div>
            </VerificationSectionCard>

            <VerificationSectionCard title="Verification Metadata & SLA" icon={Clock}>
              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">VRF Sequence Number</span>
                  <span className="text-slate-200 font-mono font-bold">{record.verificationNumber}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Current Review Stage</span>
                  <ReviewLevelBadge level={record.currentReviewLevel} />
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">SLA Target Timer</span>
                  <span className="text-slate-200 font-semibold">{record.slaTargetHours} Hours</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">Risk Assessment</span>
                  <RiskFlagBadge risk={record.riskLevel} />
                </div>
              </div>
            </VerificationSectionCard>
          </div>
        )}

        {/* Tab 2: Documents */}
        {activeTab === 'DOCUMENTS' && (
          <VerificationSectionCard title="Submitted Proof Documents" icon={FileCheck}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <FileText className="w-5 h-5 text-indigo-400" />
                    <VerificationStatusBadge status={doc.status} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-200 truncate">{doc.filename}</p>
                    <p className="text-[10px] text-indigo-400 font-semibold mt-0.5">{doc.category}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                    <button
                      onClick={() => alert(`Previewing ${doc.filename}`)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button
                      onClick={() => alert(`Request re-upload for ${doc.filename}`)}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Request Re-upload
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </VerificationSectionCard>
        )}

        {/* Tab 3: Trust Score */}
        {activeTab === 'TRUST_SCORE' && (
          <VerificationSectionCard title="Enterprise Trust Score Breakdown" icon={Award}>
            <div className="flex items-center gap-8 py-4">
              <CircularProgress value={trust.score} max={100} size={110} strokeWidth={9} color="#10B981" />
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-white">{trust.score} / 100</h3>
                <p className="text-xs text-emerald-400 font-semibold">{trust.percentileText}</p>
                <TrustScoreBadge score={trust.score} />
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Tab 4: Timeline */}
        {activeTab === 'TIMELINE' && (
          <VerificationSectionCard title="12-Stage Verification Lifecycle Timeline" icon={Activity}>
            <VerificationTimeline
              events={[
                { action: 'Submission Draft Created', timestamp: record.submittedAt, colorType: 'info', remarks: 'Initiated by applicant' },
                { action: 'Documents Format Validated', timestamp: record.submittedAt, colorType: 'info', remarks: 'Automated OCR format check' },
                { action: 'Promoted to Level 2 Manager Audit', timestamp: record.submittedAt, colorType: 'pending', remarks: 'Under compliance officer review' },
              ]}
            />
          </VerificationSectionCard>
        )}

        {/* Tab 5: Risk Analysis */}
        {activeTab === 'RISK_ANALYSIS' && (
          <VerificationSectionCard title="Risk & Fraud Engine Analysis" icon={AlertTriangle}>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">Flagged Risk Rating</p>
                  <p className="text-[11px] text-slate-400">Assessed by Enterprise Compliance Engine</p>
                </div>
                <RiskFlagBadge risk={record.riskLevel} />
              </div>
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
                <p className="text-xs font-bold text-amber-400">Automated Inspection Flags</p>
                <p className="text-xs text-slate-300">✓ Name matches government photo ID registry.</p>
                <p className="text-xs text-slate-300">✓ Zero criminal background flags detected.</p>
                <p className="text-xs text-slate-300">⚠ Tax registration TIN requires manual cross-check.</p>
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Tab 6: Review History */}
        {activeTab === 'REVIEW_HISTORY' && (
          <VerificationSectionCard title="Multi-Level Approval Review History" icon={ShieldCheck}>
            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="font-bold text-slate-200">Level 1 — Format & Document Check</p>
                <p className="text-emerald-400 font-semibold mt-0.5">PASSED ✓ (Automated Engine)</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="font-bold text-slate-200">Level 2 — Manager & Field Audit</p>
                <p className="text-amber-400 font-semibold mt-0.5">UNDER REVIEW (Assigned to {record.assignedReviewer})</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="font-bold text-slate-200">Level 3 — Executive Compliance Sign-Off</p>
                <p className="text-slate-400 mt-0.5">Pending Level 2 completion</p>
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Tab 7: Actions & Case Notes */}
        {activeTab === 'CASE_NOTES' && (
          <div className="space-y-6">
            {/* Interactive Review Action Bar */}
            <VerificationSectionCard title="Interactive Review Actions" icon={CheckCircle}>
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={() => setApprovalOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" /> Approve Request
                </button>

                <button
                  onClick={() => setRejectOpen(true)}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" /> Reject Request
                </button>

                <button
                  onClick={() => alert('Escalated request to Level 3 Compliance Officer.')}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
                >
                  Escalate to Level 3
                </button>
              </div>
            </VerificationSectionCard>

            {/* Internal Case Notes Log (Hidden from Applicant) */}
            <VerificationSectionCard title="Internal Case Notes (Hidden from Applicant)" icon={MessageSquare}>
              <div className="space-y-4">
                <form onSubmit={handleAddCaseNote} className="flex gap-2">
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add internal case note (e.g. 'Called applicant to re-verify TIN copy')..."
                    className="flex-1 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Add Note
                  </button>
                </form>

                <div className="space-y-3 pt-2">
                  {caseNotes.map((note) => (
                    <div key={note.id} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                      <div className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-slate-200">{note.author} · <span className="text-indigo-400 font-normal">{note.role}</span></span>
                        <span className="text-slate-500">{new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-xs text-slate-300">{note.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </VerificationSectionCard>
          </div>
        )}
      </div>

      {/* Approval Dialog */}
      <ApprovalDialog
        isOpen={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        onConfirm={handleApproveConfirm}
        verificationNumber={record.verificationNumber}
      />

      {/* Reject Dialog */}
      <RejectDialog
        isOpen={rejectOpen}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleRejectConfirm}
        verificationNumber={record.verificationNumber}
      />
    </div>
  );
}
