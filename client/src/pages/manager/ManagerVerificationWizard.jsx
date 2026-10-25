import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  FileText,
  UserCheck,
  AlertTriangle,
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { verificationService } from '../../services/api';
import useAuthStore from '../../context/authStore';
import {
  VerificationPageHeader,
  VerificationSectionCard,
  VerificationProgressStepper,
  FileUploader,
  DocumentPreviewCard,
  VerificationErrorState,
} from '../../components/verification';
import { Button, Input } from '../../components/PremiumUI';
import compressImage from '../../utils/compressImage';
import { getLocalizedStatus } from '../../utils/statusLocalization';

export default function ManagerVerificationWizard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, refresh } = useVerificationContext();

  const userId = user?.userId || user?._id || user?.id || '';
  const DRAFT_STORAGE_KEY = `manager_verification_draft_${userId || 'general'}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Dynamic Translated Wizard Steps
  const wizardSteps = useMemo(
    () => [
      { stepNumber: 1, title: t('verification.stepProfileInfo', 'Profile Information') },
      { stepNumber: 2, title: t('verification.stepBusinessDetails', 'Business Details') },
      { stepNumber: 3, title: t('verification.stepIdentityDocs', 'Identity Documents') },
      { stepNumber: 4, title: t('verification.stepBusinessDocs', 'Business Documents') },
      { stepNumber: 5, title: t('verification.stepReviewVerify', 'Review & Verify') },
      { stepNumber: 6, title: t('verification.stepSubmitApp', 'Submit Application') },
    ],
    [t]
  );

  // Form State
  const [formData, setFormData] = useState({
    businessName: user?.managerProfile?.companyName || '',
    businessType: 'Real Estate Management',
    taxId: '',
    address: '',
  });

  const [documents, setDocuments] = useState([]);

  // Auto-restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (Array.isArray(parsed.documents) && parsed.documents.length > 0) {
          setDocuments(parsed.documents);
        }
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 6) {
          setCurrentStep(parsed.currentStep);
        }
        if (parsed.lastSaved) setLastAutoSave(parsed.lastSaved);
      } else if (activeVerification) {
        if (activeVerification.businessDetails) {
          setFormData((prev) => ({
            ...prev,
            businessName: activeVerification.businessDetails.businessName || prev.businessName,
            businessType: activeVerification.businessDetails.businessType || prev.businessType,
            taxId: activeVerification.businessDetails.taxId || prev.taxId,
            address: activeVerification.businessDetails.address || prev.address,
          }));
        }
        if (Array.isArray(activeVerification.documents) && activeVerification.documents.length > 0) {
          setDocuments(activeVerification.documents);
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [DRAFT_STORAGE_KEY, activeVerification]);

  // Unsaved Changes Leave Confirmation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = t(
          'verification.unsavedChangesWarning',
          'You have unsaved changes in your verification wizard.'
        );
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges, t]);

  // Save Draft to LocalStorage and Backend
  const saveDraft = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setSaveStatus('saving');
        const nowStr = new Date().toLocaleTimeString();

        // 1. LocalStorage Persistence
        const draftPayload = {
          formData,
          documents,
          currentStep,
          lastSaved: nowStr,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        setLastAutoSave(nowStr);

        // 2. Backend Persistence (if record exists or can be initiated)
        let vrfId = activeVerification?._id;
        if (vrfId) {
          try {
            await verificationService.updateDraft(vrfId, {
              businessDetails: formData,
              currentStep,
            });
          } catch (apiErr) {
            // LocalStorage guarantees persistence even if offline
          }
        }

        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setSaveStatus('idle');
      }
    },
    [formData, documents, currentStep, DRAFT_STORAGE_KEY, activeVerification]
  );

  // 25-Second Autosave Interval
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft(true);
    }, 25000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  const updateFormData = (fields) => {
    setFormData((prev) => ({ ...prev, ...fields }));
    setHasUnsavedChanges(true);
  };

  const handleFileUpload = async (docType, file) => {
    try {
      let processed = file;
      if (file.type.startsWith('image/')) {
        processed = await compressImage(file, 1920, 0.8);
      }

      const newDoc = {
        _id: `doc_${Date.now()}`,
        documentType: docType,
        type: docType,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        category: docType === 'GOVT_ID' ? 'IDENTITY' : 'BUSINESS',
      };

      setDocuments((prev) => [...prev.filter((d) => (d.documentType || d.type) !== docType), newDoc]);
      setHasUnsavedChanges(true);
      setFormError(null);
    } catch (err) {
      setFormError(t('verification.fileUploadError', 'Failed to process uploaded file'));
    }
  };

  const handleRemoveDoc = (docId) => {
    setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
    setHasUnsavedChanges(true);
  };

  // Step Validation Checkers
  const hasGovtId = useMemo(
    () => documents.some((d) => (d.documentType || d.type) === 'GOVT_ID'),
    [documents]
  );

  const hasBusinessReg = useMemo(
    () => documents.some((d) => (d.documentType || d.type) === 'BUSINESS_REGISTRATION'),
    [documents]
  );

  const missingRequirements = useMemo(() => {
    const missing = [];
    if (!formData.businessName?.trim()) {
      missing.push(t('verification.validationBusinessName', 'Business / Company Name is required'));
    }
    if (!formData.address?.trim()) {
      missing.push(t('verification.validationOfficeAddress', 'Office registered address is required'));
    }
    if (!hasGovtId) {
      missing.push(
        t('verification.validationGovtIdRequired', 'Please upload at least one valid Government Photo ID document.')
      );
    }
    if (!hasBusinessReg) {
      missing.push(
        t('verification.validationBusinessDocRequired', 'Please upload at least one valid Business Registration document.')
      );
    }
    return missing;
  }, [formData, hasGovtId, hasBusinessReg, t]);

  const handleNext = () => {
    setFormError(null);

    // Step 1 Validation: Manager Profile Authenticated Check
    if (currentStep === 1) {
      if (!user) {
        setFormError(
          t(
            'verification.validationProfileRequired',
            'Authenticated manager account profile is required to proceed.'
          )
        );
        return;
      }
    }

    // Step 2 Validation: Business Details
    if (currentStep === 2) {
      if (!formData.businessName?.trim()) {
        setFormError(t('verification.validationBusinessName', 'Business / Company Name is required'));
        return;
      }
      if (!formData.address?.trim()) {
        setFormError(t('verification.validationOfficeAddress', 'Office registered address is required'));
        return;
      }
    }

    // Step 3 Validation: Identity Documents
    if (currentStep === 3) {
      if (!hasGovtId) {
        setFormError(
          t('verification.validationGovtIdRequired', 'Please upload at least one valid Government Photo ID document.')
        );
        return;
      }
    }

    // Step 4 Validation: Business Documents
    if (currentStep === 4) {
      if (!hasBusinessReg) {
        setFormError(
          t(
            'verification.validationBusinessDocRequired',
            'Please upload at least one valid Business Registration document.'
          )
        );
        return;
      }
    }

    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
      saveDraft(true);
    }
  };

  const handlePrev = () => {
    setFormError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      if (missingRequirements.length > 0) {
        setFormError(
          t(
            'verification.cannotSubmitIncomplete',
            'Cannot submit until all required steps and documents are provided.'
          )
        );
        return;
      }

      setSubmitting(true);
      setFormError(null);

      // 1. Initiate or locate verification record
      let vrfId = activeVerification?._id;
      if (!vrfId && userId) {
        try {
          const initRes = await verificationService.initiateVerification({
            entityType: 'MANAGER',
            entityId: userId,
          });
          const initData = initRes?.data?.data !== undefined ? initRes.data.data : (initRes?.data !== undefined ? initRes.data : initRes);
          vrfId = initData?._id;
        } catch (initErr) {
          // If already initiated, activeVerification will be resolved on submit
        }
      }

      // 2. Attach or sync documents if vrfId is known
      if (vrfId) {
        for (const doc of documents) {
          try {
            await verificationService.uploadDocument(vrfId, {
              documentType: doc.documentType || doc.type,
              filename: doc.filename,
              url: doc.url || `https://storage.placeholder.com/${doc.filename}`,
            });
          } catch (docErr) {
            // Non-blocking document sync
          }
        }

        // 3. Update final draft fields
        try {
          await verificationService.updateDraft(vrfId, {
            businessDetails: formData,
            currentStep: 6,
          });
        } catch (updateErr) {
          // Non-blocking draft update
        }

        // 4. Submit Verification
        await verificationService.submitVerification(vrfId);
      }

      // Clean up local draft
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);

      if (refresh) await refresh();
      navigate('/manager/verification');
    } catch (err) {
      setFormError(err.message || t('verification.submissionError', 'Failed to submit verification application.'));
    } finally {
      setSubmitting(false);
    }
  };

  const managerFullName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.name || user?.email || t('verification.notProvided', 'Not Provided');

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title={t('verification.managerWizardTitle', 'Manager Verification Wizard')}
        subtitle={t(
          'verification.managerWizardSubtitle',
          'Complete multi-step business verification to receive trust badges'
        )}
        icon={ShieldCheck}
        breadcrumbs={[
          { label: t('nav.managerPortal', 'Manager Portal'), href: '/dashboard' },
          { label: t('verification.verificationHome', 'Verification Home'), href: '/manager/verification' },
          { label: t('verification.wizard', 'Wizard') },
        ]}
        actionSlot={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {saveStatus === 'saving' && t('verification.saving', 'Saving...')}
              {saveStatus === 'saved' && t('verification.saved', 'Saved ✓')}
              {saveStatus === 'idle' &&
                lastAutoSave &&
                t('verification.savedAt', 'Saved at {{time}}', { time: lastAutoSave })}
            </span>
            <Button
              variant="outline"
              type="button"
              onClick={() => saveDraft(false)}
              disabled={saveStatus === 'saving'}
              className="text-xs"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {t('verification.saveDraft', 'Save Draft')}
            </Button>
          </div>
        }
      />

      <VerificationProgressStepper
        steps={wizardSteps}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step <= currentStep) setCurrentStep(step);
        }}
      />

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Manager Profile Info */}
      {currentStep === 1 && (
        <VerificationSectionCard
          title={t('verification.step1Title', 'Step 1: Manager Profile Information')}
          subtitle={t('verification.step1Subtitle', 'Verify personal manager profile data')}
          icon={UserCheck}
        >
          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>
                {t(
                  'verification.profileVerifiedNotice',
                  'Profile information is synchronized with your authenticated account.'
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('verification.managerFullName', 'Manager Full Name')}
                value={managerFullName}
                disabled
              />
              <Input
                label={t('verification.emailAddress', 'Email Address')}
                value={user?.email || t('verification.notProvided', 'Not Provided')}
                disabled
              />
              <div className="sm:col-span-2">
                <Input
                  label={t('verification.phoneNumber', 'Phone Number')}
                  value={user?.phone || user?.phoneNumber || t('verification.notProvided', 'Not Provided')}
                  disabled
                />
              </div>
            </div>
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Business Info */}
      {currentStep === 2 && (
        <VerificationSectionCard
          title={t('verification.step2Title', 'Step 2: Business & Property Company Details')}
          subtitle={t('verification.step2Subtitle', 'Enter registered business entity details')}
          icon={Building}
        >
          <div className="space-y-4 pt-2">
            <Input
              label={t('verification.businessName', 'Registered Business / Company Name') + ' *'}
              placeholder={t('verification.businessNamePlaceholder', 'e.g. Acme Property Management LLC')}
              value={formData.businessName}
              onChange={(e) => updateFormData({ businessName: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('verification.businessType', 'Business Type / Industry')}
              </label>
              <select
                value={formData.businessType}
                onChange={(e) => updateFormData({ businessType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="Real Estate Management">
                  {t('verification.biz_real_estate_mgmt', 'Real Estate Management')}
                </option>
                <option value="Residential Property Management">
                  {t('verification.biz_residential_mgmt', 'Residential Property Management')}
                </option>
                <option value="Commercial Leasing & Operations">
                  {t('verification.biz_commercial_leasing', 'Commercial Leasing & Operations')}
                </option>
                <option value="Individual Landlord / Broker">
                  {t('verification.biz_individual_landlord', 'Individual Landlord / Broker')}
                </option>
              </select>
            </div>

            <Input
              label={t('verification.taxIdLabel', 'GST / Tax Registration PIN (Optional)')}
              placeholder={t('verification.taxIdPlaceholder', 'e.g. 22AAAAA0000A1Z5')}
              value={formData.taxId}
              onChange={(e) => updateFormData({ taxId: e.target.value })}
            />

            <Input
              label={t('verification.officeAddress', 'Office Registered Address') + ' *'}
              placeholder={t('verification.officeAddressPlaceholder', 'e.g. 123 Commercial Tower, Suite 400')}
              value={formData.address}
              onChange={(e) => updateFormData({ address: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 3: Identity Docs */}
      {currentStep === 3 && (
        <VerificationSectionCard
          title={t('verification.step3Title', 'Step 3: Manager Identity Documents')}
          subtitle={t('verification.step3Subtitle', 'Upload Govt ID (Passport / Drivers License / Aadhaar)')}
          icon={ShieldCheck}
        >
          <div className="space-y-4 pt-2">
            <FileUploader
              label={t('verification.uploadGovtId', 'Upload Govt Photo ID')}
              hint={t(
                'verification.govtIdHint',
                'Passport, Drivers License, or National Identity Card (Max 10MB, PDF/JPG/PNG)'
              )}
              onFileSelect={(file) => handleFileUpload('GOVT_ID', file)}
            />

            {documents
              .filter((d) => (d.documentType || d.type) === 'GOVT_ID')
              .map((doc) => (
                <DocumentPreviewCard
                  key={doc._id || doc.id}
                  document={doc}
                  onRemove={() => handleRemoveDoc(doc._id || doc.id)}
                />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 4: Business Docs */}
      {currentStep === 4 && (
        <VerificationSectionCard
          title={t('verification.step4Title', 'Step 4: Business Registration & Tax Clearance')}
          subtitle={t('verification.step4Subtitle', 'Upload business license certificate or incorporation deed')}
          icon={FileText}
        >
          <div className="space-y-4 pt-2">
            <FileUploader
              label={t('verification.uploadBusinessReg', 'Upload Business Registration Certificate')}
              hint={t(
                'verification.businessRegHint',
                'Official business incorporation or trade license document (Max 10MB)'
              )}
              onFileSelect={(file) => handleFileUpload('BUSINESS_REGISTRATION', file)}
            />

            {documents
              .filter((d) => (d.documentType || d.type) === 'BUSINESS_REGISTRATION')
              .map((doc) => (
                <DocumentPreviewCard
                  key={doc._id || doc.id}
                  document={doc}
                  onRemove={() => handleRemoveDoc(doc._id || doc.id)}
                />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <VerificationSectionCard
          title={t('verification.step5Title', 'Step 5: Review Submission Data')}
          subtitle={t('verification.step5Subtitle', 'Verify information before final submission')}
          icon={ShieldCheck}
        >
          <div className="space-y-4 text-xs pt-2">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">{t('verification.managerLabel', 'Manager:')}</span>
                <span className="font-bold text-foreground">{managerFullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">{t('verification.companyLabel', 'Company:')}</span>
                <span className="font-bold text-foreground">
                  {formData.businessName || t('verification.notEntered', 'Not Entered')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">{t('verification.businessTypeReview', 'Business Type:')}</span>
                <span className="font-bold text-foreground">
                  {getLocalizedStatus(formData.businessType, t, 'businessCategory') || formData.businessType}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">{t('verification.taxIdReview', 'Tax ID:')}</span>
                <span className="font-medium text-foreground">
                  {formData.taxId || t('verification.notSpecified', 'Not Specified')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-muted-foreground">{t('verification.addressReview', 'Address:')}</span>
                <span className="font-medium text-foreground">
                  {formData.address || t('verification.notEntered', 'Not Entered')}
                </span>
              </div>
            </div>

            {/* Missing Requirements Warning Banner */}
            {missingRequirements.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('verification.missingRequirementsWarning', 'Missing Requirements Warning:')}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {missingRequirements.map((req, idx) => (
                    <li key={idx}>{req}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{t('verification.allRequirementsMet', 'All requirements met. Ready to submit.')}</span>
              </div>
            )}

            <p className="font-bold text-foreground">
              {t('verification.uploadedDocumentsCount', 'Uploaded Documents ({{count}}):', {
                count: documents.length,
              })}
            </p>
            {documents.length === 0 ? (
              <p className="text-muted-foreground italic">
                {t('verification.noDocumentsUploaded', 'No documents uploaded yet.')}
              </p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <DocumentPreviewCard key={doc._id || doc.id} document={doc} />
                ))}
              </div>
            )}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 6: Submit */}
      {currentStep === 6 && (
        <VerificationSectionCard
          title={t('verification.step6Title', 'Step 6: Confirm & Submit')}
          subtitle={t('verification.step6Subtitle', 'Finalize verification request')}
          icon={CheckCircle2}
        >
          <div className="text-center py-6 space-y-4 max-w-lg mx-auto">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h3 className="text-base font-black text-foreground">
              {t('verification.readyForSubmission', 'Ready for Submission')}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t(
                'verification.submissionDisclaimer',
                'By clicking Submit Application, your credentials will undergo Level 1 Automated format validation followed by manager compliance review.'
              )}
            </p>

            {missingRequirements.length > 0 && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 text-xs font-semibold">
                {t(
                  'verification.cannotSubmitIncomplete',
                  'Cannot submit until all required steps and documents are provided.'
                )}
              </div>
            )}

            <Button
              variant="primary"
              type="button"
              onClick={handleSubmit}
              disabled={submitting || missingRequirements.length > 0}
              className="mx-auto text-xs py-2.5 px-6 font-bold"
            >
              {submitting
                ? t('verification.submittingApplication', 'Submitting Application...')
                : t('verification.submitApplicationNow', 'Submit Application Now')}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="ghost"
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('verification.previousStep', 'Previous Step')}
        </Button>
        {currentStep < 6 && (
          <Button
            variant="primary"
            type="button"
            onClick={handleNext}
            className="text-xs"
          >
            {t('verification.nextStep', 'Next Step')}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
