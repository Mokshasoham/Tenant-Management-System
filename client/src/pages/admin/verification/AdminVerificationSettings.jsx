import React, { useState, useEffect } from 'react';
import { Settings, Sliders, Clock, FileText, Lock, Save, ShieldCheck } from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationSectionCard,
} from '../../../components/verification';

import getVerificationMapper from '../../../mappers/verificationMapperFactory';
import FeatureFlagService from '../../../services/FeatureFlagService';
import trackEvent, { VERIFICATION_EVENTS } from '../../../utils/verificationAnalytics';

export default function AdminVerificationSettings() {
  const mapper = getVerificationMapper('ADMIN');
  const [settings, setSettings] = useState(null);
  const [flags, setFlags] = useState({
    ADMIN_VERIFICATION_CENTER: true,
    OCR_VERIFICATION: false,
    AI_DOCUMENT_VALIDATION: false,
    FRAUD_ENGINE: false,
    AUTO_ASSIGN_REVIEWER: false,
    ADVANCED_ANALYTICS: true,
  });

  useEffect(() => {
    setSettings(mapper.mapSettings(null));
  }, []);

  const handleToggleFlag = (key) => {
    setFlags((prev) => ({ ...prev, [key]: !prev[key] }));
    trackEvent(VERIFICATION_EVENTS.ADMIN_SETTINGS_UPDATE, { flag: key });
  };

  const handleSaveSettings = () => {
    trackEvent(VERIFICATION_EVENTS.ADMIN_SETTINGS_UPDATE, { status: 'saved' });
    alert('Verification Engine Settings saved successfully.');
  };

  if (!settings) {
    return <div className="p-8 text-center text-slate-400">Loading Engine Settings...</div>;
  }

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <VerificationPageHeader
        title="Verification Platform Engine Settings"
        subtitle="Manage workflow stages, document templates, SLA targets, scoring weights, and production feature flags"
        icon={Settings}
        actionText="Save Settings"
        onAction={handleSaveSettings}
      />

      {/* Row 1: Workflow Configuration */}
      <VerificationSectionCard title="Active Verification Workflows" icon={Sliders}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="text-[11px] text-slate-400 uppercase bg-slate-950/60 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Workflow Name</th>
                <th className="py-2.5 px-3">Review Levels</th>
                <th className="py-2.5 px-3">SLA Target</th>
                <th className="py-2.5 px-3">Auto Approval</th>
                <th className="py-2.5 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {settings.workflows.map((wf) => (
                <tr key={wf.id} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-3 font-semibold text-slate-100">{wf.name}</td>
                  <td className="py-2.5 px-3">{wf.levels} Levels</td>
                  <td className="py-2.5 px-3">{wf.slaHours} Hours</td>
                  <td className="py-2.5 px-3 font-semibold text-emerald-400">{wf.autoApproval ? 'Enabled ✓' : 'Disabled'}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VerificationSectionCard>

      {/* Row 2: SLA Target Timers & Document Templates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <VerificationSectionCard title="SLA Target Timers & Breach Escalate" icon={Clock}>
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400 font-semibold">Level 1 (Automated Check Target)</span>
              <span className="text-slate-200 font-mono font-bold">{settings.sla.level1TargetHours} Hours</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400 font-semibold">Level 2 (Manager Audit Target)</span>
              <span className="text-slate-200 font-mono font-bold">{settings.sla.level2TargetHours} Hours</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-800">
              <span className="text-slate-400 font-semibold">Level 3 (Compliance Executive Target)</span>
              <span className="text-slate-200 font-mono font-bold">{settings.sla.level3TargetHours} Hours</span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-slate-400">Auto-Escalate on Breach</span>
              <span className="text-emerald-400 font-bold">Enabled ✓</span>
            </div>
          </div>
        </VerificationSectionCard>

        <VerificationSectionCard title="Required Document Templates" icon={FileText}>
          <div className="space-y-3 text-xs">
            {settings.templates.map((tmpl) => (
              <div key={tmpl.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-slate-200">{tmpl.name}</p>
                  <p className="text-[10px] text-indigo-400 mt-0.5">Required For: {tmpl.requiredFor.join(', ')}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">Template Active</span>
              </div>
            ))}
          </div>
        </VerificationSectionCard>
      </div>

      {/* Row 3: Feature Flag Toggles */}
      <VerificationSectionCard title="Production Verification Feature Toggles" icon={Lock}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(flags).map(([key, enabled]) => (
            <div key={key} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-200">{key}</p>
                <p className="text-[11px] text-slate-400">{enabled ? 'Active feature flag toggle' : 'Disabled demo toggle'}</p>
              </div>
              <button
                onClick={() => handleToggleFlag(key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          ))}
        </div>
      </VerificationSectionCard>
    </div>
  );
}
