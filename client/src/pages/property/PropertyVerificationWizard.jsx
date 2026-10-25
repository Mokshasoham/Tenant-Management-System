import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Building,
  Image as ImageIcon,
  Trash2,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import { useLanguage } from '../../context/LanguageContext';
import { verificationService } from '../../services/api';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
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
import apiClient from '../../services/apiClient';
import { getLocalizedStatus } from '../../utils/statusLocalization';

export default function PropertyVerificationWizard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, refresh } = useVerificationContext();

  const userId = user?.userId || user?._id || user?.id || 'demo';
  const propertyIdParam = searchParams.get('propertyId') || '';

  const [availableProperties, setAvailableProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(propertyIdParam);

  const DRAFT_STORAGE_KEY = `property_verification_draft_${userId}_${selectedPropertyId || 'general'}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Dynamic Translated Wizard Steps
  const wizardSteps = useMemo(
    () => [
      { stepNumber: 1, title: t('verification.stepPropDetails', 'Property Details') },
      { stepNumber: 2, title: t('verification.stepOwnershipDetails', 'Ownership Details') },
      { stepNumber: 3, title: t('verification.stepPropDocs', 'Property Documents') },
      { stepNumber: 4, title: t('verification.stepPropPhotos', 'Property Photos') },
      { stepNumber: 5, title: t('verification.stepPropReview', 'Review & Verify') },
      { stepNumber: 6, title: t('verification.stepPropSubmit', 'Submit Application') },
    ],
    [t]
  );

  // Form State
  const [formData, setFormData] = useState({
    propertyName: '',
    propertyType: 'Apartment',
    address: '',
    areaSqFt: '',
    yearBuilt: '',
    ownerName: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '',
    ownershipType: 'Individual Owner',
    registrationNumber: '',
    surveyNumber: '',
    khataNumber: '',
    municipality: '',
  });

  const [documents, setDocuments] = useState([]);
  const [photos, setPhotos] = useState([]);

  // Load available manager properties if propertyId was not in query
  useEffect(() => {
    async function fetchProperties() {
      try {
        const res = await apiClient.get('/properties');
        const list = res?.data?.data || res?.data || [];
        if (Array.isArray(list)) {
          setAvailableProperties(list);
          if (!selectedPropertyId && list.length > 0) {
            setSelectedPropertyId(list[0]._id || list[0].id);
          }
        }
      } catch (e) {
        // Fallback silently if properties request fails
      }
    }
    fetchProperties();
  }, [selectedPropertyId]);

  // Fetch real property details if selectedPropertyId is present
  useEffect(() => {
    async function loadPropertyDetails() {
      if (!selectedPropertyId) return;
      try {
        const res = await apiClient.get(`/properties/${selectedPropertyId}`);
        const prop = res?.data?.data || res?.data || res;
        if (prop) {
          setFormData((prev) => ({
            ...prev,
            propertyName: prop.name || prop.title || prev.propertyName,
            propertyType: prop.type || prev.propertyType,
            address: prop.address || prev.address,
            areaSqFt: prop.areaSqFt || prop.sqft ? String(prop.areaSqFt || prop.sqft) : prev.areaSqFt,
            yearBuilt: prop.yearBuilt ? String(prop.yearBuilt) : prev.yearBuilt,
          }));
        }
      } catch (err) {
        console.error('Failed to load property details:', err);
      }
    }
    loadPropertyDetails();
  }, [selectedPropertyId]);

  // Auto-restore Draft on Mount or Property Switch
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (Array.isArray(parsed.photos) && parsed.photos.length > 0) setPhotos(parsed.photos);
        if (Array.isArray(parsed.documents) && parsed.documents.length > 0) setDocuments(parsed.documents);
        if (parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= 6) {
          setCurrentStep(parsed.currentStep);
        }
        if (parsed.lastSaved) setLastAutoSave(parsed.lastSaved);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [DRAFT_STORAGE_KEY]);

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

  // Save Draft Helper
  const saveDraft = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setSaveStatus('saving');
        const nowStr = new Date().toLocaleTimeString();
        const draftPayload = {
          formData,
          photos,
          documents,
          currentStep,
          lastSaved: nowStr,
        };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftPayload));
        setLastAutoSave(nowStr);

        // Backend draft sync if active verification exists
        if (activeVerification?._id) {
          try {
            await verificationService.updateDraft(activeVerification._id, {
              propertyDetails: formData,
              currentStep,
            });
          } catch (e) {
            // LocalStorage guarantees persistence
          }
        }

        setSaveStatus('saved');
        setHasUnsavedChanges(false);
        trackEvent(VERIFICATION_EVENTS.DRAFT_SAVED, { currentStep });
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch (err) {
        setSaveStatus('idle');
      }
    },
    [formData, photos, documents, currentStep, DRAFT_STORAGE_KEY, activeVerification]
  );

  // 25-Second Autosave Interval
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft(true);
    }, 25000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  const updateForm = (fields) => {
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
        _id: `doc_prop_${Date.now()}`,
        documentType: docType,
        type: docType,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        category: docType === 'SALE_DEED' ? 'OWNERSHIP' : 'TAX',
      };
      setDocuments((prev) => [...prev.filter((d) => (d.documentType || d.type) !== docType), newDoc]);
      setHasUnsavedChanges(true);
      setFormError(null);
      trackEvent(VERIFICATION_EVENTS.PROPERTY_DOCUMENT, { docType, filename: file.name });
    } catch (err) {
      setFormError(t('verification.fileUploadError', 'Failed to process uploaded file'));
    }
  };

  const handlePhotoUpload = async (title, file) => {
    try {
      let processed = file;
      if (file.type.startsWith('image/')) {
        processed = await compressImage(file, 1920, 0.8);
      }
      const newPhoto = {
        id: `photo_${Date.now()}`,
        title,
        url: URL.createObjectURL(processed),
        category: 'PHOTOS',
        status: 'VERIFIED',
      };
      setPhotos((prev) => [...prev, newPhoto]);
      setHasUnsavedChanges(true);
      setFormError(null);
      trackEvent(VERIFICATION_EVENTS.PROPERTY_PHOTO, { title, filename: file.name });
    } catch (err) {
      setFormError(t('verification.fileUploadError', 'Failed to process photo upload'));
    }
  };

  const handleRemoveDoc = (docId) => {
    setDocuments((prev) => prev.filter((d) => (d._id || d.id) !== docId));
    setHasUnsavedChanges(true);
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setHasUnsavedChanges(true);
  };

  // Step Validation & Missing Requirements
  const hasPropDoc = useMemo(
    () =>
      documents.some(
        (d) =>
          (d.documentType || d.type) === 'SALE_DEED' ||
          (d.documentType || d.type) === 'TITLE_DEED' ||
          (d.documentType || d.type) === 'TAX_RECEIPT'
      ),
    [documents]
  );

  const missingRequirements = useMemo(() => {
    const missing = [];
    if (!formData.propertyName?.trim()) {
      missing.push(t('verification.validationPropName', 'Property Name is required'));
    }
    if (!formData.address?.trim()) {
      missing.push(t('verification.validationPropAddress', 'Registered Property Address is required'));
    }
    if (!formData.ownerName?.trim()) {
      missing.push(t('verification.validationOwnerName', 'Property Owner / Legal Entity Name is required'));
    }
    if (!hasPropDoc) {
      missing.push(
        t(
          'verification.validationPropDocRequired',
          'At least one ownership document (Sale Deed or Property Tax Receipt) is required.'
        )
      );
    }
    if (photos.length === 0) {
      missing.push(
        t('verification.validationPhotoRequired', 'Please upload at least one property photo before proceeding.')
      );
    }
    return missing;
  }, [formData, hasPropDoc, photos, t]);

  const handleNext = () => {
    setFormError(null);

    // Step 1: Property Physical Details
    if (currentStep === 1) {
      if (!formData.propertyName?.trim()) {
        setFormError(t('verification.validationPropName', 'Property Name is required'));
        return;
      }
      if (!formData.address?.trim()) {
        setFormError(t('verification.validationPropAddress', 'Registered Property Address is required'));
        return;
      }
      if (formData.areaSqFt && (isNaN(Number(formData.areaSqFt)) || Number(formData.areaSqFt) <= 0)) {
        setFormError(t('verification.validationAreaPositive', 'Area must be a valid positive number'));
        return;
      }
      if (
        formData.yearBuilt &&
        (isNaN(Number(formData.yearBuilt)) ||
          Number(formData.yearBuilt) < 1800 ||
          Number(formData.yearBuilt) > new Date().getFullYear() + 2)
      ) {
        setFormError(t('verification.validationYearValid', 'Construction year must be a valid year'));
        return;
      }
    }

    // Step 2: Ownership Details
    if (currentStep === 2) {
      if (!formData.ownerName?.trim()) {
        setFormError(t('verification.validationOwnerName', 'Property Owner / Legal Entity Name is required'));
        return;
      }
    }

    // Step 3: Documents Upload
    if (currentStep === 3) {
      if (!hasPropDoc) {
        setFormError(
          t(
            'verification.validationPropDocRequired',
            'At least one ownership document (Sale Deed or Property Tax Receipt) is required.'
          )
        );
        return;
      }
    }

    // Step 4: Photos Upload
    if (currentStep === 4) {
      if (photos.length === 0) {
        setFormError(
          t('verification.validationPhotoRequired', 'Please upload at least one property photo before proceeding.')
        );
        return;
      }
    }

    if (currentStep < 6) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveDraft(true);
      trackEvent(VERIFICATION_EVENTS.STEP_CHANGED, { from: currentStep, to: next });
    }
  };

  const handlePrev = () => {
    setFormError(null);
    if (currentStep > 1) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      trackEvent(VERIFICATION_EVENTS.STEP_CHANGED, { from: currentStep, to: prevStep });
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

      const targetPropId = selectedPropertyId || propertyIdParam;

      if (targetPropId) {
        let vrfId = activeVerification?._id;
        try {
          const initRes = await verificationService.initiateVerification({
            entityType: 'PROPERTY',
            entityId: targetPropId,
          });
          const initData = initRes?.data?.data !== undefined ? initRes.data.data : (initRes?.data !== undefined ? initRes.data : initRes);
          vrfId = initData?._id || vrfId;
        } catch (initErr) {
          // If already initiated, activeVerification will be used
        }

        if (vrfId) {
          // Sync documents to backend
          for (const doc of documents) {
            try {
              await verificationService.uploadDocument(vrfId, {
                documentType: doc.documentType || doc.type,
                filename: doc.filename,
                url: doc.url || `https://storage.placeholder.com/${doc.filename}`,
              });
            } catch (dErr) {
              // Non-blocking sync
            }
          }

          // Update draft details
          try {
            await verificationService.updateDraft(vrfId, {
              propertyDetails: formData,
              currentStep: 6,
            });
          } catch (upErr) {
            // Non-blocking draft update
          }

          // Submit application
          await verificationService.submitVerification(vrfId);
        }
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);
      trackEvent(VERIFICATION_EVENTS.PROPERTY_SUBMITTED);
      if (refresh) await refresh();
      navigate(
        selectedPropertyId
          ? `/property/verification?propertyId=${selectedPropertyId}`
          : '/property/verification'
      );
    } catch (err) {
      setFormError(
        err.message || t('verification.submissionError', 'Failed to submit property verification application.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 space-y-8 pb-24 sm:pb-10">
      <VerificationPageHeader
        title={t('verification.propWizardTitle', 'Property Verification Wizard')}
        subtitle={t(
          'verification.propWizardSubtitle',
          'Complete multi-step real estate verification to receive Gold Property certification'
        )}
        icon={ShieldCheck}
        breadcrumbs={[
          { label: t('verification.propOperations', 'Property Operations'), href: '/properties' },
          {
            label: t('nav.propertyVerification', 'Property Verification'),
            href: selectedPropertyId
              ? `/property/verification?propertyId=${selectedPropertyId}`
              : '/property/verification',
          },
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

      {/* Stepper Progress Bar */}
      <VerificationProgressStepper
        steps={wizardSteps}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step <= currentStep) setCurrentStep(step);
        }}
      />

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Property Physical Details */}
      {currentStep === 1 && (
        <VerificationSectionCard
          title={t('verification.step1PropTitle', 'Step 1: Property Details')}
          subtitle={t(
            'verification.step1PropSubtitle',
            'Basic physical specifications and municipality classification'
          )}
          icon={Building}
        >
          <div className="space-y-4 pt-2">
            {availableProperties.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t('verification.selectPropertyPrompt', 'Select a property to verify')}
                </label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => {
                    setSelectedPropertyId(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="">{t('verification.chooseProperty', 'Choose Property...')}</option>
                  {availableProperties.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.name || p.title || p.address} ({p.type || 'Property'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label={t('verification.propertyNameLabel', 'Property Name *')}
                placeholder={t('verification.propertyNamePlaceholder', 'e.g. Green Heights Villa #4')}
                value={formData.propertyName}
                onChange={(e) => updateForm({ propertyName: e.target.value })}
              />

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  {t('verification.propertyTypeLabel', 'Property Type')}
                </label>
                <select
                  value={formData.propertyType}
                  onChange={(e) => updateForm({ propertyType: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
                >
                  <option value="Apartment">{t('verification.propTypeApartment', 'Apartment')}</option>
                  <option value="Villa">{t('verification.propTypeVilla', 'Villa / Independent House')}</option>
                  <option value="Commercial">{t('verification.propTypeCommercial', 'Commercial / Office')}</option>
                  <option value="Plot">{t('verification.propTypePlot', 'Residential Plot')}</option>
                  <option value="Studio">{t('verification.propTypeStudio', 'Studio Apartment')}</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Input
                  label={t('verification.propertyAddressLabel', 'Registered Property Address *')}
                  placeholder={t(
                    'verification.propertyAddressPlaceholder',
                    'Full address according to municipality registration'
                  )}
                  value={formData.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                />
              </div>

              <Input
                label={t('verification.areaSqFtLabel', 'Total Built-up Area (Sq.Ft)')}
                placeholder={t('verification.areaSqFtPlaceholder', 'e.g. 1450')}
                value={formData.areaSqFt}
                onChange={(e) => updateForm({ areaSqFt: e.target.value })}
              />

              <Input
                label={t('verification.yearBuiltLabel', 'Construction Year')}
                placeholder={t('verification.yearBuiltPlaceholder', 'e.g. 2022')}
                value={formData.yearBuilt}
                onChange={(e) => updateForm({ yearBuilt: e.target.value })}
              />
            </div>
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Ownership Details */}
      {currentStep === 2 && (
        <VerificationSectionCard
          title={t('verification.step2PropTitle', 'Step 2: Legal & Ownership Identifiers')}
          subtitle={t(
            'verification.step2PropSubtitle',
            'Official survey, khata, and municipal jurisdiction records'
          )}
          icon={ShieldCheck}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label={t('verification.ownerNameLabel', 'Primary Owner / Legal Entity Name *')}
              placeholder={t('verification.ownerNamePlaceholder', 'Name as printed on original Sale Deed')}
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">
                {t('verification.ownershipStructureLabel', 'Ownership Structure')}
              </label>
              <select
                value={formData.ownershipType}
                onChange={(e) => updateForm({ ownershipType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="Individual Owner">
                  {t('verification.ownership_individual_owner', 'Individual Owner')}
                </option>
                <option value="Company">
                  {t('verification.ownership_company', 'Company')}
                </option>
                <option value="Builder">
                  {t('verification.ownership_builder', 'Builder')}
                </option>
                <option value="Housing Society">
                  {t('verification.ownership_housing_society', 'Housing Society')}
                </option>
                <option value="Property Management Company">
                  {t('verification.ownership_property_management_company', 'Property Management Company')}
                </option>
                <option value="Government">
                  {t('verification.ownership_government', 'Government')}
                </option>
                <option value="Trust">
                  {t('verification.ownership_trust', 'Trust')}
                </option>
                <option value="Inherited Property">
                  {t('verification.ownership_inherited_property', 'Inherited Property')}
                </option>
              </select>
            </div>

            <Input
              label={t('verification.registrationNumberLabel', 'Property Registration Number')}
              placeholder={t('verification.registrationNumberPlaceholder', 'e.g. REG-2022-XXXX')}
              value={formData.registrationNumber}
              onChange={(e) => updateForm({ registrationNumber: e.target.value })}
            />

            <Input
              label={t('verification.surveyNumberLabel', 'Survey / Plot Number')}
              placeholder={t('verification.surveyNumberPlaceholder', 'e.g. SURV-882/B')}
              value={formData.surveyNumber}
              onChange={(e) => updateForm({ surveyNumber: e.target.value })}
            />

            <Input
              label={t('verification.khataNumberLabel', 'Khata / PID Number')}
              placeholder={t('verification.khataNumberPlaceholder', 'e.g. KHATA-4410')}
              value={formData.khataNumber}
              onChange={(e) => updateForm({ khataNumber: e.target.value })}
            />

            <Input
              label={t('verification.municipalityLabel', 'Municipal Authority Jurisdiction')}
              placeholder={t(
                'verification.municipalityPlaceholder',
                'e.g. Greater Municipal Corporation'
              )}
              value={formData.municipality}
              onChange={(e) => updateForm({ municipality: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 3: Documents Upload */}
      {currentStep === 3 && (
        <VerificationSectionCard
          title={t('verification.step3PropTitle', 'Step 3: Upload Ownership & Compliance Documents')}
          subtitle={t(
            'verification.step3PropSubtitle',
            'Attach PDF or high-resolution photos of title deeds and tax receipts'
          )}
          icon={Upload}
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <p className="text-xs font-bold text-foreground">
                  {t('verification.titleDeedLabel', '1. Sale Deed / Title Deed *')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('verification.titleDeedDesc', 'Original registered deed proving ownership rights.')}
                </p>
                <FileUploader
                  onFileSelected={(file) => handleFileUpload('SALE_DEED', file)}
                  label={t('verification.uploadTitleDeed', 'Upload Title Deed')}
                />
              </div>

              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <p className="text-xs font-bold text-foreground">
                  {t('verification.taxReceiptLabel', '2. Property Tax Receipt (Current FY)')}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t('verification.taxReceiptDesc', 'Latest municipal property tax payment receipt.')}
                </p>
                <FileUploader
                  onFileSelected={(file) => handleFileUpload('TAX_RECEIPT', file)}
                  label={t('verification.uploadTaxReceipt', 'Upload Tax Receipt')}
                />
              </div>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('verification.uploadedDocumentsCount', 'Uploaded Documents ({{count}}):', {
                    count: documents.length,
                  })}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents.map((doc) => (
                    <div
                      key={doc._id || doc.id}
                      className="p-3 rounded-xl bg-card border border-border flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{doc.filename}</p>
                          <p className="text-[10px] text-muted-foreground">{getLocalizedStatus(doc.documentType || doc.type, t, 'documentType') || doc.documentType || doc.type}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc._id || doc.id)}
                        title={t('verification.removeFile', 'Remove File')}
                        className="text-muted-foreground hover:text-rose-500 p-1 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 4: Property Photos */}
      {currentStep === 4 && (
        <VerificationSectionCard
          title={t('verification.step4PropTitle', 'Step 4: Property Physical Inspection Photos')}
          subtitle={t(
            'verification.step4PropSubtitle',
            'Add exterior building elevation, living area, kitchen, and bathroom photos'
          )}
          icon={ImageIcon}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
              <p className="text-xs font-bold text-foreground">
                {t('verification.uploadPhotosTitle', 'Upload Real Estate Photos')}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {t(
                  'verification.uploadPhotosDesc',
                  'Geotagged high-resolution photos accelerate verification review.'
                )}
              </p>
              <FileUploader
                onFileSelected={(file) =>
                  handlePhotoUpload(t('verification.photoElevation', 'Exterior Elevation'), file)
                }
                label={t('verification.addPropertyPhoto', 'Add Property Photo')}
              />
            </div>

            {photos.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-muted-foreground">
                  {t('verification.photosCount', 'Uploaded Photos ({{count}})', { count: photos.length })}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted"
                    >
                      <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo.id)}
                          title={t('verification.removeFile', 'Remove File')}
                          className="p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review & Verify */}
      {currentStep === 5 && (
        <VerificationSectionCard
          title={t('verification.step5PropTitle', 'Step 5: Review Property Verification Application')}
          subtitle={t(
            'verification.step5PropSubtitle',
            'Verify all entered property attributes and attached documents before submission'
          )}
          icon={ShieldCheck}
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div>
                <span className="text-muted-foreground font-semibold">
                  {t('verification.propertyReviewLabel', 'Property:')}
                </span>
                <p className="font-bold text-foreground text-sm mt-0.5">
                  {formData.propertyName || t('verification.notEntered', 'Not Entered')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">
                  {t('verification.ownerReviewLabel', 'Owner:')}
                </span>
                <p className="font-bold text-foreground text-sm mt-0.5">
                  {formData.ownerName || t('verification.notEntered', 'Not Entered')} ({getLocalizedStatus(formData.ownershipType, t, 'ownershipType') || formData.ownershipType})
                </p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground font-semibold">
                  {t('verification.addressReview', 'Address:')}
                </span>
                <p className="font-medium text-foreground mt-0.5">
                  {formData.address || t('verification.notEntered', 'Not Entered')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">
                  {t('verification.registrationNumberLabel', 'Property Registration Number')} / Khata:
                </span>
                <p className="font-medium text-foreground mt-0.5">
                  {formData.registrationNumber || t('verification.notSpecified', 'Not Specified')} •{' '}
                  {formData.khataNumber || t('verification.notSpecified', 'Not Specified')}
                </p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">
                  {t('verification.attachedDocsPhotos', 'Attached Docs & Photos:')}
                </span>
                <p className="font-bold text-emerald-500 mt-0.5">
                  {t('verification.docsAndPhotosSummary', '{{docCount}} Document(s), {{photoCount}} Photo(s)', {
                    docCount: documents.length,
                    photoCount: photos.length,
                  })}
                </p>
              </div>
            </div>

            {/* Missing Requirements Alert */}
            {missingRequirements.length > 0 ? (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 space-y-2">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{t('verification.missingItemsAlert', 'Missing required items before submission:')}</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  {missingRequirements.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{t('verification.allRequirementsMet', 'All requirements met. Ready to submit.')}</span>
              </div>
            )}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 6: Submit */}
      {currentStep === 6 && (
        <VerificationSectionCard
          title={t('verification.step6PropTitle', 'Step 6: Submit Legal Verification Application')}
          subtitle={t(
            'verification.step6PropSubtitle',
            'Your application will be queued for municipal automated review and physical inspection'
          )}
          icon={CheckCircle2}
        >
          <div className="p-6 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                {t('verification.readyToSubmitApplication', 'Ready to Submit Application')}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t(
                  'verification.propSubmitDisclaimer',
                  'Upon submission, a verification record will be generated. You will receive real-time status updates on your dashboard.'
                )}
              </p>
            </div>

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
              className="w-full text-xs py-2.5 justify-center font-bold"
              onClick={handleSubmit}
              disabled={submitting || missingRequirements.length > 0}
            >
              {submitting
                ? t('verification.submittingPropApp', 'Submitting Application...')
                : t('verification.confirmAndSubmitVerification', 'Confirm & Submit Verification')}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Bottom Floating Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          type="button"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          {t('verification.previousStep', 'Previous Step')}
        </Button>

        {currentStep < 6 ? (
          <Button
            variant="primary"
            type="button"
            onClick={handleNext}
            className="text-xs"
          >
            {t('verification.nextStep', 'Next Step')}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            variant="primary"
            type="button"
            onClick={handleSubmit}
            disabled={submitting || missingRequirements.length > 0}
            className="text-xs"
          >
            {submitting
              ? t('verification.submittingPropApp', 'Submitting Application...')
              : t('verification.confirmAndSubmitVerification', 'Confirm & Submit Verification')}
          </Button>
        )}
      </div>
    </div>
  );
}
