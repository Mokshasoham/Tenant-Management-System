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
import { useLanguage } from '../../context/LanguageContext';
import getVerificationMapper from '../../mappers/verificationMapperFactory';
import FeatureFlagService from '../../services/FeatureFlagService';

export default function TechnicianVerificationPage() {
  const { t } = useLanguage();
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
        {t('technicianVerification.loadingWorkspace', 'Loading Technician Verification Workspace...')}
      </div>
    );
  }

  // 1. Header
  const headerComponent = (
    <VerificationPageHeader
      title={t('technicianVerification.portalTitle', 'Technician Verification Portal')}
      subtitle={t('technicianVerification.portalSubtitle', 'Verify your identity, trade licenses, ITI certifications, skills, and service availability for dispatch')}
      icon={Wrench}
      actionText={t('technicianVerification.startWizard', 'Start Verification Wizard')}
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
                <p className="font-semibold text-sm">{t('technicianVerification.requiredTitle', 'Technician Verification Required')}</p>
                <p className="text-xs opacity-90">{t('technicianVerification.requiredDesc', 'Complete identity & trade license verification to start accepting maintenance jobs.')}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/technician/verification/wizard')}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
            >
              {t('common.verifyNow', 'Verify Now')}
            </button>
          </div>
        );
      case 'APPROVED':
        return (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">{t('technicianVerification.certifiedTitle', 'Certified & Verified Service Technician')}</p>
                <p className="text-xs opacity-90">{t('technicianVerification.certifiedDesc', 'You hold Gold Technician status and full workforce dispatch eligibility.')}</p>
              </div>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-emerald-500/20 border border-emerald-500/40">
              {t('technicianVerification.vrf', 'VRF')}: {verification.verificationNumber}
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
      <VerificationSectionCard title={t('technicianVerification.statusTitle', 'Technician Status')} icon={ShieldCheck}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('technicianVerification.verificationVrf', 'Verification VRF')}</span>
            <span className="text-xs font-mono text-slate-200">{verification.verificationNumber}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('common.status', 'Status')}</span>
            <VerificationStatusBadge status={verification.status} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('technicianVerification.level', 'Technician Level')}</span>
            <span className="text-xs font-semibold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
              {verification.technicianLevel}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">{t('technicianVerification.trustBadge', 'Trust Badge')}</span>
            <VerificationBadge badge={verification.badge} />
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">{t('technicianVerification.dispatchStatus', 'Dispatch Status')}</span>
            <span className="text-xs font-medium text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {t('technicianVerification.activeAvailable', 'Active & Available')}
            </span>
          </div>
        </div>
      </VerificationSectionCard>

      {/* Technician Trust Hero */}
      <VerificationSectionCard title={t('technicianVerification.trustScoreTitle', 'Technician Trust Score')} icon={Award}>
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
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
            >
              {t('technicianVerification.scoreDetails', 'Score Details')} <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </VerificationSectionCard>

      {/* Technician Professional Summary Card */}
      <VerificationSectionCard title={t('technicianVerification.summaryTitle', 'Professional Summary')} icon={Briefcase}>
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{t('technicianVerification.primarySkill', 'Primary Skill')}</span>
            <span className="text-slate-200 font-semibold">{summary.primarySkill}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{t('technicianVerification.experience', 'Experience')}</span>
            <span className="text-slate-200 font-semibold">{summary.yearsExperience}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{t('technicianVerification.completedJobs', 'Completed Jobs')}</span>
            <span className="text-emerald-400 font-bold">{summary.completedJobs} {t('technicianVerification.jobs', 'Jobs')}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{t('technicianVerification.averageRating', 'Average Rating')}</span>
            <span className="text-amber-400 font-semibold flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {summary.averageRating}
            </span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">{t('technicianVerification.responseTime', 'Response Time')}</span>
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
          <h3 className="text-base font-bold text-white">{t('technicianVerification.readinessTitle', 'Technician Verification Readiness')}</h3>
          <p className="text-xs text-slate-400">{t('technicianVerification.readinessDesc', 'All mandatory trade documents & ITI diplomas are verified.')}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 w-full md:w-auto justify-end">
        <div className="text-right">
          <p className="text-xs text-slate-400">{t('technicianVerification.readiness', 'Verification Readiness')}</p>
          <p className="text-lg font-extrabold text-emerald-400">{t('technicianVerification.completePercent', '100% Complete')}</p>
        </div>
        <button
          onClick={() => navigate('/technician/verification/wizard')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          {t('technicianVerification.updateVerification', 'Update Verification')}
        </button>
      </div>
    </div>
  );

  // 5. Quick Actions Grid
  const actionsComponent = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <button
        onClick={() => navigate('/technician/verification/documents')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
      >
        <FileCheck className="w-5 h-5 text-indigo-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">{t('technicianVerification.tradeDocs', 'Trade Documents')}</h4>
        <p className="text-[11px] text-slate-400">{t('technicianVerification.verifiedFiles', '5 Verified Files')}</p>
      </button>

      <button
        onClick={() => navigate('/technician/trust-score')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
      >
        <Star className="w-5 h-5 text-emerald-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">{t('technicianVerification.trustScore', 'Trust Score')}</h4>
        <p className="text-[11px] text-slate-400">{t('technicianVerification.scoreDisplay', '91 / 100 Score')}</p>
      </button>

      <button
        onClick={() => navigate('/technician/verification/timeline')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-purple-500/50 hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
      >
        <Activity className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">{t('technicianVerification.auditTrail', 'Audit Trail')}</h4>
        <p className="text-[11px] text-slate-400">{t('technicianVerification.eventsLogged', '10 Events Logged')}</p>
      </button>

      <button
        onClick={() => navigate('/technician/verification/wizard')}
        className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/50 transition-all text-left group cursor-pointer"
      >
        <Wrench className="w-5 h-5 text-amber-400 mb-2 group-hover:scale-110 transition-transform" />
        <h4 className="text-xs font-bold text-slate-200">{t('technicianVerification.editSkills', 'Edit Skills')}</h4>
        <p className="text-[11px] text-slate-400">{t('technicianVerification.updateTradeCerts', 'Update Trade Certs')}</p>
      </button>
    </div>
  );

  // 6. Content Grid
  const contentComponent = (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Professional Skills */}
        <VerificationSectionCard title={t('technicianVerification.skillsTitle', 'Professional Skills & Competency')} icon={Wrench}>
          <div className="space-y-3">
            {skills.map((skill) => (
              <div key={skill.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-200">{skill.name}</p>
                  <p className="text-[11px] text-slate-400">{skill.years} {t('technicianVerification.yearsExperience', 'Years Experience')}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {skill.level}
                  </span>
                  {skill.certified && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {t('technicianVerification.certified', 'Certified')}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </VerificationSectionCard>

        {/* Right: Certification Summary */}
        <VerificationSectionCard title={t('technicianVerification.clearanceTitle', 'Certification & Trade Clearance')} icon={FileCheck}>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">{t('technicianVerification.masterTradeLicense', 'Master Trade License')}</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">{t('technicianVerification.verifiedMark', 'Verified ✓')}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">{t('technicianVerification.itiDiploma', 'ITI / NSDC Diploma')}</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">{t('technicianVerification.verifiedMark', 'Verified ✓')}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">{t('technicianVerification.liabilityInsurance', 'Liability Insurance')}</p>
              <p className="text-xs font-bold text-emerald-400 mt-1">{t('technicianVerification.activeInsurance', 'Active ($1M)')}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">{t('technicianVerification.policeClearance', 'Police Clearance')}</p>
              <p className="text-xs font-bold text-amber-400 mt-1">{t('technicianVerification.pendingAudit', 'Pending Audit')}</p>
            </div>
          </div>
        </VerificationSectionCard>
      </div>

      {/* Row 2: Renewal Lifecycle & Service Attributes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSectionCard title={t('technicianVerification.renewalLifecycle', 'Certification Renewal Lifecycle')} icon={RefreshCw}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[11px] text-slate-400">{t('technicianVerification.certExpiry', 'Certification Expiry')}</p>
                <p className="text-sm font-bold text-slate-200 mt-0.5">{renewal.expiresOn}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                <p className="text-[11px] text-slate-400">{t('technicianVerification.daysRemaining', 'Days Remaining')}</p>
                <p className="text-sm font-bold text-emerald-400 mt-0.5">{renewal.daysRemaining} {t('technicianVerification.days', 'Days')}</p>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80">
              <p className="text-xs font-semibold text-slate-300 mb-2">{t('technicianVerification.renewalHistory', 'Renewal History')}</p>
              {renewal.renewalHistory.map((rh, idx) => (
                <div key={idx} className="text-xs space-y-1">
                  <div className="flex justify-between text-slate-400">
                    <span>{t('technicianVerification.renewed', 'Renewed')}: {rh.renewedAt}</span>
                    <span>{t('technicianVerification.by', 'By')}: {rh.renewedBy}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">{rh.remarks}</p>
                </div>
              ))}
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title={t('technicianVerification.serviceAttrsTitle', 'Service Attributes & Operating Hours')} icon={Clock}>
          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('technicianVerification.employeeId', 'Employee ID')}</span>
              <span className="text-slate-200 font-mono font-semibold">{summary.employeeId}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('technicianVerification.coverageArea', 'Service Coverage Area')}</span>
              <span className="text-slate-200 font-semibold">{summary.serviceArea}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800">
              <span className="text-slate-400">{t('technicianVerification.operatingHours', 'Operating Hours')}</span>
              <span className="text-slate-200 font-semibold">{summary.workingHours}</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-slate-400">{t('technicianVerification.employmentType', 'Employment Type')}</span>
              <span className="text-emerald-400 font-semibold">{summary.employmentType}</span>
            </div>
          </div>
        </VerificationSectionCard>
      </div>
    </div>
  );

  // 7. Future Integrations
  const integrationsComponent = (
    <VerificationSectionCard title={t('technicianVerification.futureIntegrations', 'Future Production Integrations')} icon={Lock}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { name: 'NSDC Skill API', flag: 'NSDC_VERIFICATION' },
          { name: 'Police Clearance DB', flag: 'POLICE_VERIFICATION' },
          { name: 'Liability Insurance API', flag: 'INSURANCE_VERIFICATION' },
          { name: 'Trade License Portal', flag: 'SKILL_CERTIFICATION' },
        ].map((item, idx) => (
          <div key={idx} className="p-3 rounded-lg bg-slate-950/40 border border-slate-800/80 flex items-center justify-between opacity-60">
            <span className="text-xs text-slate-300 font-medium">{item.name}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{t('common.disabled', 'Disabled')}</span>
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
