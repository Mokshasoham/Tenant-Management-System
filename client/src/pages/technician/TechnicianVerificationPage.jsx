import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Award,
  Clock,
  Briefcase,
  Wrench,
  FileCheck,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  FileText,
  Star,
  Activity,
  UserCheck,
  ChevronRight,
  ExternalLink,
  Lock,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationStatusBadge,
  VerificationBadge,
  TrustScoreBadge,
  CircularProgress,
  VerificationPortalLayout,
} from '../../components/verification';

import { useVerificationContext } from '../../context/VerificationContext';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import FeatureFlagService from '../../services/FeatureFlagService';

export default function TechnicianVerificationPage() {
  const navigate = useNavigate();
  const mapper = getVerificationMapper('TECHNICIAN');
  const { activeVerification, loading: contextLoading } = useVerificationContext();

  const [verification, setVerification] = useState(null);
  const [trustScore, setTrustScore] = useState(null);
  const [summary, setSummary] = useState(null);
  const [skills, setSkills] = useState([]);
  const [renewal, setRenewal] = useState(null);
  const [levels, setLevels] = useState(null);

  useEffect(() => {
    const v = mapper.mapVerification(activeVerification);
    const ts = mapper.mapTrustScore(null);
    const sum = mapper.mapProfessionalSummary(null);
    const sk = mapper.mapSkills(null);
    const ren = mapper.mapRenewalStatus(null);
    const lvl = mapper.mapVerificationLevels(null);

    setVerification(v);
    setTrustScore(ts);
    setSummary(sum);
    setSkills(sk);
    setRenewal(ren);
    setLevels(lvl);
  }, [activeVerification]);

  if (!verification || !trustScore || !summary) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading Technician Verification Workspace...
      </div>
    );
  }

  // 1. Header
  const headerComponent = (
    <VerificationPageHeader
      title="Technician Verification Portal"
      subtitle="Verify your identity, trade licenses, ITI certifications, skills, and service availability for dispatch"
      icon={Wrench}
      actionText="Start Verification Wizard"
      onAction={() => navigate('/technician/verification/wizard')}
    />
  );

  // 2. State-driven Notification Banner
  const renderNotificationBanner = () => {
    switch (verification.status) {
      case 'UNVERIFIED':
        return (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-400">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Technician Verification Required</p>
                <p className="text-xs opacity-90">Complete identity & trade license verification to start accepting maintenance jobs.</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/technician/verification/wizard')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              Verify Now
            </button>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Certified & Verified Service Technician</p>
                <p className="text-xs opacity-90">You hold Gold Technician status and full workforce dispatch eligibility.</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40">
              VRF: {verification.verificationNumber}
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  // 3. Hero Grid
  const heroComponent = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Technician Verification Status Card */}
      <VerificationSectionCard title="Technician Status" icon={ShieldCheck}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Verification VRF</span>
            <span className="text-xs font-mono text-slate-200">{verification.verificationNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Status</span>
            <VerificationStatusBadge status={verification.status} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Technician Level</span>
            <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {verification.technicianLevel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Trust Badge</span>
            <VerificationBadge badge={verification.badge} />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">Dispatch Status</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active & Available
            </span>
          </div>
        </div>
      </VerificationSectionCard>

      {/* Technician Trust Hero */}
      <VerificationSectionCard title="Technician Trust Score" icon={Award}>
        <div className="flex items-center justify-around py-2">
          <CircularProgress value={trustScore.score} max={100} size={110} strokeWidth={9} color="#10B981" />
          <div className="space-y-2 text-left">
            <div>
              <p className="text-2xl font-extrabold text-white">{trustScore.score} <span className="text-xs text-slate-400 font-normal">/ 100</span></p>
              <p className="text-xs text-emerald-400 font-semibold">{trustScore.percentileText}</p>
            </div>
            <TrustScoreBadge score={trustScore.score} />
            <button
              onClick={() => navigate('/technician/trust-score')}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors"
            >
              Score Details <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </VerificationSectionCard>

      {/* Technician Professional Summary Card */}
      <VerificationSectionCard title="Professional Summary" icon={Briefcase}>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Primary Skill</span>
            <span className="text-slate-200 font-semibold">{summary.primarySkill}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Experience</span>
            <span className="text-slate-200 font-semibold">{summary.yearsExperience}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Completed Jobs</span>
            <span className="text-emerald-400 font-bold">{summary.completedJobs} Jobs</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Average Rating</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {summary.averageRating}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Response Time</span>
            <span className="text-slate-200 font-semibold">{summary.responseTime}</span>
          </div>
        </div>
      </VerificationSectionCard>
    </div>
  );

  // 4. Verification Widget
  const widgetComponent = (
    <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <UserCheck className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Technician Verification Readiness</h3>
          <p className="text-xs text-slate-400">All mandatory trade documents & ITI diplomas are verified.</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        <div className="text-right">
          <p className="text-xs text-slate-400">Verification Readiness</p>
          <p className="text-lg font-extrabold text-emerald-400">100% Complete</p>
        </div>
        <button
          onClick={() => navigate('/technician/verification/wizard')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all"
        >
          Update Verification
        </button>
      </div>
    </div>
  );

  // 5. Quick Actions Grid
  const actionsComponent = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        onClick={() => navigate('/technician/verification/documents')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <FileCheck className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Trade Documents</h4>
        <p className="text-[11px] text-slate-400">5 Verified Files</p>
      </button>

      <button
        onClick={() => navigate('/technician/trust-score')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <Star className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Trust Score</h4>
        <p className="text-[11px] text-slate-400">91 / 100 Score</p>
      </button>

      <button
        onClick={() => navigate('/technician/verification/timeline')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <Activity className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Audit Trail</h4>
        <p className="text-[11px] text-slate-400">10 Events Logged</p>
      </button>

      <button
        onClick={() => navigate('/technician/verification/wizard')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-left group"
      >
        <Wrench className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">Edit Skills</h4>
        <p className="text-[11px] text-slate-400">Update Trade Certs</p>
      </button>
    </div>
  );

  // 6. Content Grid
  const contentComponent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Professional Skills */}
        <VerificationSectionCard title="Professional Skills & Competency" icon={Wrench}>
          <div className="space-y-3">
            {skills.map((skill) => (
              <div key={skill.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">{skill.name}</p>
                  <p className="text-[11px] text-slate-400">{skill.years} Years Experience</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {skill.level}
                  </span>
                  {skill.certified && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Certified
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </VerificationSectionCard>

        {/* Right: Certification Summary */}
        <VerificationSectionCard title="Certification & Trade Clearance" icon={FileCheck}>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">Master Trade License</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">Verified ✓</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">ITI / NSDC Diploma</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">Verified ✓</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">Liability Insurance</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">Active ($1M)</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">Police Clearance</p>
              <p className="text-xs font-bold text-amber-400 mt-1">Pending Audit</p>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Row 2: Renewal Lifecycle & Service Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSectionCard title="Certification Renewal Lifecycle" icon={RefreshCw}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[11px] text-slate-400">Certification Expiry</p>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{renewal.expiresOn}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[11px] text-slate-400">Days Remaining</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{renewal.daysRemaining} Days</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <p className="text-xs font-semibold text-slate-300 mb-2">Renewal History</p>
              {renewal.renewalHistory.map((rh, idx) => (
                <div key={idx} className="text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>Renewed: {rh.renewedAt}</span>
                    <span>By: {rh.renewedBy}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">{rh.remarks}</p>
                </div>
              ))}
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Service Attributes & Operating Hours" icon={Clock}>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Employee ID</span>
              <span className="text-slate-200 font-mono font-semibold">{summary.employeeId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Service Coverage Area</span>
              <span className="text-slate-200 font-semibold">{summary.serviceArea}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">Operating Hours</span>
              <span className="text-slate-200 font-semibold">{summary.workingHours}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">Employment Type</span>
              <span className="text-emerald-400 font-semibold">{summary.employmentType}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );

  // 7. Future Integrations
  const integrationsComponent = (
    <VerificationSectionCard title="Future Production Integrations" icon={Lock}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'NSDC Skill API', flag: 'NSDC_VERIFICATION' },
          { name: 'Police Clearance DB', flag: 'POLICE_VERIFICATION' },
          { name: 'Liability Insurance API', flag: 'INSURANCE_VERIFICATION' },
          { name: 'Trade License Portal', flag: 'SKILL_CERTIFICATION' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between opacity-60">
            <span className="text-xs text-slate-300 font-medium">{item.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Disabled</span>
          </div>
        ))}
      </div>
    </VerificationSectionCard>
  );

  return (
    <VerificationPortalLayout
      header={headerComponent}
      notification={renderNotificationBanner()}
      hero={heroComponent}
      widget={widgetComponent}
      actions={actionsComponent}
      content={contentComponent}
      integrations={integrationsComponent}
    />
  );
}
