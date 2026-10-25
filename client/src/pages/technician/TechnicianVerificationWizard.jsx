import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench,
  User,
  Briefcase,
  FileCheck,
  Image as ImageIcon,
  CheckCircle,
  Save,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import {
  VerificationPageHeader,
  VerificationProgressStepper,
  VerificationSectionCard,
  FileUploader,
} from '../../components/verification';
import { useLanguage } from '../../context/LanguageContext';

import useAuthStore from '../../context/authStore';
import trackEvent, { VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';

const FormField = ({ label, type = 'text', value, onChange, placeholder }) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-semibold text-slate-300">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
    />
  </div>
);

export default function TechnicianVerificationWizard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const draftKey = `technician_verification_draft_${user?.id || 'guest'}`;

  const stepLabels = [
    t('technicianWizard.step1Label', 'Personal Details'),
    t('technicianWizard.step2Label', 'Professional Details'),
    t('technicianWizard.step3Label', 'Professional Documents'),
    t('technicianWizard.step4Label', 'Skills & Portfolio'),
    t('technicianWizard.step5Label', 'Review Profile'),
    t('technicianWizard.step6Label', 'Submit Application'),
  ];

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('Idle');
  const [formData, setFormData] = useState({
    // Step 1: Personal
    fullName: user?.name || 'Marcus Vance',
    email: user?.email || 'marcus.vance@workforce.com',
    phone: '+1 (555) 234-5678',
    dob: '1992-05-14',
    address: '450 Industrial Parkway, North Metro Zone',

    // Step 2: Professional
    primarySkill: 'HVAC & Climate Control',
    secondarySkills: 'Electrical, Plumbing, Appliance Repair',
    yearsExperience: '8',
    workingHours: '08:00 AM - 08:00 PM',
    languages: 'English, Spanish',
    serviceArea: 'North & Central Metro Zone',

    // Step 3: Documents
    govtId: null,
    tradeLicense: null,
    itiCertificate: null,
    experienceLetter: null,
    insuranceCert: null,
    policeVerification: null,

    // Step 4: Portfolio
    portfolioImages: [
      { id: 'p1', title: 'Central HVAC Compressor Overhaul', size: '2.4 MB' },
      { id: 'p2', title: 'Smart Circuit Breaker Panel Installation', size: '3.1 MB' },
    ],
  });

  // Restore draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load draft:', e);
    }
  }, [draftKey]);

  // 25-second autosave
  useEffect(() => {
    const timer = setInterval(() => {
      setSaveStatus('Saving...');
      try {
        localStorage.setItem(draftKey, JSON.stringify(formData));
        setSaveStatus('Saved ✓');
        trackEvent(VERIFICATION_EVENTS.DRAFT_SAVED, { step: currentStep });
      } catch (e) {
        setSaveStatus('Error saving');
      }
    }, 25000);
    return () => clearInterval(timer);
  }, [formData, currentStep, draftKey]);

  // Unsaved changes warning
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
      trackEvent(VERIFICATION_EVENTS.STEP_CHANGED, { step: currentStep + 1 });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = () => {
    trackEvent(VERIFICATION_EVENTS.TECHNICIAN_SUBMITTED, { vrf: 'VRF-2026-T00712' });
    try {
      localStorage.removeItem(draftKey);
    } catch (e) {}
    navigate('/technician/verification');
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      {/* Header */}
      <VerificationPageHeader
        title={t('technicianWizard.title', 'Technician Verification Wizard')}
        subtitle={t('technicianWizard.subtitle', 'Complete the 6-step trade verification process to unlock dispatch assignments')}
        icon={Wrench}
      />

      {/* Stepper Header */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
            {t('technicianWizard.stepProgress', 'Step {{current}} of 6 — {{step}}', { current: currentStep, step: stepLabels[currentStep - 1] })}
          </span>
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
            <Save className="w-3.5 h-3.5 text-slate-500" />
            {saveStatus}
          </span>
        </div>
        <VerificationProgressStepper steps={stepLabels} currentStep={currentStep} />
      </div>

      {/* Wizard Form Body */}
      <div className="min-h-[400px]">
        {/* Step 1: Personal Details */}
        {currentStep === 1 && (
          <VerificationSectionCard title={t('technicianWizard.step1Title', 'Step 1: Personal Identification')} icon={User}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label={t('technicianWizard.fullName', 'Full Name')}
                value={formData.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder={t('technicianWizard.fullNamePlaceholder', 'Marcus Vance')}
              />
              <FormField
                label={t('technicianWizard.emailAddress', 'Email Address')}
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder={t('technicianWizard.emailPlaceholder', 'marcus.vance@workforce.com')}
              />
              <FormField
                label={t('technicianWizard.phoneNumber', 'Phone Number')}
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                placeholder="+1 (555) 234-5678"
              />
              <FormField
                label={t('technicianWizard.dob', 'Date of Birth')}
                type="date"
                value={formData.dob}
                onChange={(e) => handleChange('dob', e.target.value)}
              />
              <div className="md:col-span-2">
                <FormField
                  label={t('technicianWizard.address', 'Residential Address')}
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder={t('technicianWizard.addressPlaceholder', '450 Industrial Parkway, North Metro Zone')}
                />
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Step 2: Professional Details */}
        {currentStep === 2 && (
          <VerificationSectionCard title={t('technicianWizard.step2Title', 'Step 2: Professional Skills & Operating Hours')} icon={Briefcase}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                label={t('technicianWizard.primarySkill', 'Primary Trade Skill')}
                value={formData.primarySkill}
                onChange={(e) => handleChange('primarySkill', e.target.value)}
                placeholder={t('technicianWizard.primarySkillPlaceholder', 'HVAC & Climate Control')}
              />
              <FormField
                label={t('technicianWizard.secondarySkills', 'Secondary Skills (Comma Separated)')}
                value={formData.secondarySkills}
                onChange={(e) => handleChange('secondarySkills', e.target.value)}
                placeholder={t('technicianWizard.secondarySkillsPlaceholder', 'Electrical, Plumbing, Appliance Repair')}
              />
              <FormField
                label={t('technicianWizard.yearsExperience', 'Years of Experience')}
                type="number"
                value={formData.yearsExperience}
                onChange={(e) => handleChange('yearsExperience', e.target.value)}
                placeholder="8"
              />
              <FormField
                label={t('technicianWizard.workingHours', 'Working Hours / Shifts')}
                value={formData.workingHours}
                onChange={(e) => handleChange('workingHours', e.target.value)}
                placeholder={t('technicianWizard.workingHoursPlaceholder', '08:00 AM - 08:00 PM')}
              />
              <FormField
                label={t('technicianWizard.languages', 'Languages Spoken')}
                value={formData.languages}
                onChange={(e) => handleChange('languages', e.target.value)}
                placeholder={t('technicianWizard.languagesPlaceholder', 'English, Spanish')}
              />
              <FormField
                label={t('technicianWizard.serviceArea', 'Service Coverage Zone')}
                value={formData.serviceArea}
                onChange={(e) => handleChange('serviceArea', e.target.value)}
                placeholder={t('technicianWizard.serviceAreaPlaceholder', 'North & Central Metro Zone')}
              />
            </div>
          </VerificationSectionCard>
        )}

        {/* Step 3: Professional Documents */}
        {currentStep === 3 && (
          <VerificationSectionCard title={t('technicianWizard.step3Title', 'Step 3: Upload Professional Trade Licenses & Diplomas')} icon={FileCheck}>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {t('technicianWizard.govtId', 'Government Photo ID (Passport / Drivers License)')}
                </label>
                <FileUploader
                  onFileUpload={(file) => handleChange('govtId', file.name)}
                  accept=".pdf,.jpg,.png"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {t('technicianWizard.masterTradeLicense', 'Master Trade License (HVAC / Electrical / Plumbing)')}
                </label>
                <FileUploader
                  onFileUpload={(file) => handleChange('tradeLicense', file.name)}
                  accept=".pdf,.png"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {t('technicianWizard.itiCertificate', 'ITI / NSDC Skill Certification Diploma')}
                </label>
                <FileUploader
                  onFileUpload={(file) => handleChange('itiCertificate', file.name)}
                  accept=".pdf,.jpg,.png"
                />
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Step 4: Skills & Portfolio */}
        {currentStep === 4 && (
          <VerificationSectionCard title={t('technicianWizard.step4Title', 'Step 4: Completed Work Photos & Project Portfolio')} icon={ImageIcon}>
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  {t('technicianWizard.uploadJobPhotos', 'Upload Completed Job Photos (Compresses automatically)')}
                </label>
                <FileUploader
                  onFileUpload={(file) => {
                    const newImg = { id: `p_${Date.now()}`, title: file.name, size: `${(file.size / 1024 / 1024).toFixed(1)} MB` };
                    setFormData((prev) => ({ ...prev, portfolioImages: [...prev.portfolioImages, newImg] }));
                  }}
                  accept=".jpg,.png"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.portfolioImages.map((img) => (
                  <div key={img.id} className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-200">{img.title}</p>
                        <p className="text-[11px] text-slate-400">{img.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          portfolioImages: prev.portfolioImages.filter((p) => p.id !== img.id),
                        }))
                      }
                      className="text-rose-400 hover:text-rose-300 text-xs p-1 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Step 5: Review Profile */}
        {currentStep === 5 && (
          <VerificationSectionCard title={t('technicianWizard.step5Title', 'Step 5: Review Technician Verification Profile')} icon={CheckCircle}>
            <div className="space-y-6 text-xs">
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">{t('technicianWizard.summaryHeading', 'Personal & Trade Summary')}</h4>
                <div className="grid grid-cols-2 gap-2 text-slate-400">
                  <p>{t('common.name', 'Name')}: <span className="text-slate-200 font-semibold">{formData.fullName}</span></p>
                  <p>{t('technicianWizard.primarySkillLabel', 'Primary Skill')}: <span className="text-slate-200 font-semibold">{formData.primarySkill}</span></p>
                  <p>{t('technicianWizard.experienceLabel', 'Experience')}: <span className="text-slate-200 font-semibold">{formData.yearsExperience} {t('technicianWizard.years', 'Years')}</span></p>
                  <p>{t('technicianWizard.coverageLabel', 'Coverage')}: <span className="text-slate-200 font-semibold">{formData.serviceArea}</span></p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="font-bold text-slate-200 text-sm">{t('technicianWizard.attachedDocs', 'Attached Documents & Portfolio')}</h4>
                <p className="text-emerald-400 font-semibold">{t('technicianWizard.tradeLicensesAttached', '✓ 3 Trade Licenses & Diplomas Attached')}</p>
                <p className="text-emerald-400 font-semibold">{t('technicianWizard.portfolioPhotosUploaded', '✓ {{count}} Portfolio Photos Uploaded', { count: formData.portfolioImages.length })}</p>
              </div>
            </div>
          </VerificationSectionCard>
        )}

        {/* Step 6: Submit Application */}
        {currentStep === 6 && (
          <VerificationSectionCard title={t('technicianWizard.step6Title', 'Step 6: Submit Verification Application')} icon={Wrench}>
            <div className="text-center py-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('technicianWizard.readyTitle', 'Ready for Dispatch Verification')}</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                  {t('technicianWizard.readyDesc', 'Submitting will generate your VRF sequence code (VRF-2026-T00712) and send your trade license for supervisor audit.')}
                </p>
              </div>
              <button
                onClick={handleSubmit}
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer"
              >
                {t('technicianWizard.submitVerification', 'Submit Technician Verification')}
              </button>
            </div>
          </VerificationSectionCard>
        )}
      </div>

      {/* Sticky Mobile Footer Controls */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 sticky bottom-4 shadow-2xl">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-semibold text-xs transition-all flex items-center cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> {t('common.previous', 'Previous')}
        </button>

        <span className="text-xs text-slate-400 font-medium">
          {t('common.stepOf', 'Step {{current}} of {{total}}', { current: currentStep, total: 6 })}
        </span>

        {currentStep < 6 ? (
          <button
            onClick={handleNext}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center cursor-pointer"
          >
            {t('common.next', 'Next')} <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition-all flex items-center cursor-pointer"
          >
            {t('technicianWizard.submitApplication', 'Submit Application')}
          </button>
        )}
      </div>
    </div>
  );
}
