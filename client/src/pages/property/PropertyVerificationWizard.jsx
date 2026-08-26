import React, { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import { MOCK_OWNERSHIP_TYPES } from '../../mocks/propertyVerificationMock';
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

const WIZARD_STEPS = [
  { stepNumber: 1, title: 'Property Details' },
  { stepNumber: 2, title: 'Ownership Details' },
  { stepNumber: 3, title: 'Property Documents' },
  { stepNumber: 4, title: 'Property Photos' },
  { stepNumber: 5, title: 'Review & Verify' },
  { stepNumber: 6, title: 'Submit Application' },
];

export default function PropertyVerificationWizard() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, refresh } = useVerificationContext();

  const userId = user?.userId || user?._id || user?.id || 'demo';
  const propertyIdParam = searchParams.get('propertyId') || '';
  const DRAFT_STORAGE_KEY = `property_verification_draft_${userId}_${propertyIdParam || 'general'}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

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

  // Fetch real property details if propertyId provided
  useEffect(() => {
    async function loadPropertyDetails() {
      if (!propertyIdParam) return;
      try {
        const res = await apiClient.get(`/properties/${propertyIdParam}`);
        const prop = res?.data?.data || res?.data || res;
        if (prop) {
          setFormData((prev) => ({
            ...prev,
            propertyName: prop.name || prev.propertyName,
            propertyType: prop.type || prev.propertyType,
            address: prop.address || prev.address,
            areaSqFt: prop.areaSqFt || prop.sqft ? String(prop.areaSqFt || prop.sqft) : prev.areaSqFt,
            yearBuilt: prop.yearBuilt ? String(prop.yearBuilt) : prev.yearBuilt,
          }));
        }
      } catch (err) {
        console.error('Failed to load property for verification wizard:', err);
      }
    }
    loadPropertyDetails();
  }, [propertyIdParam]);

  // Auto-restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData((prev) => ({ ...prev, ...parsed.formData }));
        if (parsed.photos && parsed.photos.length > 0) setPhotos(parsed.photos);
        if (parsed.documents && parsed.documents.length > 0) setDocuments(parsed.documents);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        setLastAutoSave(parsed.lastSaved || null);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [DRAFT_STORAGE_KEY]);

  // Unsaved Changes Leave Confirmation (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your property verification wizard.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Save Draft Helper
  const saveDraft = useCallback(async () => {
    try {
      setSaveStatus('saving');
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
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      trackEvent(VERIFICATION_EVENTS.DRAFT_SAVED, { currentStep });
      setTimeout(() => setSaveStatus('idle'), 2500);
    } catch (err) {
      setSaveStatus('idle');
    }
  }, [formData, photos, documents, currentStep, DRAFT_STORAGE_KEY]);

  // 25-Second Autosave Interval
  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft();
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
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        category: docType === 'SALE_DEED' ? 'OWNERSHIP' : 'TAX',
      };
      setDocuments((prev) => [...prev.filter((d) => d.documentType !== docType), newDoc]);
      setHasUnsavedChanges(true);
      trackEvent(VERIFICATION_EVENTS.PROPERTY_DOCUMENT, { docType, filename: file.name });
    } catch (err) {
      setFormError('Failed to process uploaded property document');
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
      trackEvent(VERIFICATION_EVENTS.PROPERTY_PHOTO, { title, filename: file.name });
    } catch (err) {
      setFormError('Failed to process photo upload');
    }
  };

  const handleRemoveDoc = (docId) => {
    setDocuments((prev) => prev.filter((d) => d._id !== docId));
    setHasUnsavedChanges(true);
  };

  const handleRemovePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    setHasUnsavedChanges(true);
  };

  const handleNext = () => {
    setFormError(null);
    if (currentStep === 1 && !formData.propertyName) {
      setFormError('Property Name is required');
      return;
    }
    if (currentStep === 2 && !formData.ownerName) {
      setFormError('Property Owner Name is required');
      return;
    }
    if (currentStep < 6) {
      const next = currentStep + 1;
      setCurrentStep(next);
      saveDraft();
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
      setSubmitting(true);
      setFormError(null);

      if (propertyIdParam) {
        try {
          const initRes = await verificationService.initiateVerification({
            entityType: 'PROPERTY',
            entityId: propertyIdParam,
          });
          const vrfId = initRes?.data?._id || initRes?.data?.data?._id;
          if (vrfId) {
            await verificationService.submitVerification(vrfId);
          }
        } catch (e) {
          if (activeVerification?._id) {
            await verificationService.submitVerification(activeVerification._id);
          }
        }
      }

      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);
      trackEvent(VERIFICATION_EVENTS.PROPERTY_SUBMITTED);
      navigate(propertyIdParam ? `/property/verification?propertyId=${propertyIdParam}` : '/property/verification');
    } catch (err) {
      setFormError(err.message || 'Failed to submit property verification application');
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round((currentStep / WIZARD_STEPS.length) * 100);

  return (
    <div className="p-6 sm:p-10 space-y-8 pb-24 sm:pb-10">
      <VerificationPageHeader
        title="Property Verification Wizard"
        subtitle="Complete multi-step real estate verification to receive Gold Property certification"
        icon={ShieldCheck}
        breadcrumbs={[
          { label: 'Property Operations', href: '/properties' },
          {
            label: 'Property Verification',
            href: propertyIdParam ? `/property/verification?propertyId=${propertyIdParam}` : '/property/verification',
          },
          { label: 'Wizard' },
        ]}
        actionSlot={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved ✓'}
              {saveStatus === 'idle' && lastAutoSave && `Saved at ${lastAutoSave}`}
            </span>
            <Button variant="outline" onClick={saveDraft} disabled={saveStatus === 'saving'} className="text-xs">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Draft
            </Button>
          </div>
        }
      />

      {/* Stepper Progress Bar */}
      <VerificationProgressStepper
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step <= currentStep) setCurrentStep(step);
        }}
      />

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Property Physical Details */}
      {currentStep === 1 && (
        <VerificationSectionCard
          title="Step 1: Property Details"
          subtitle="Basic physical specifications and municipality classification"
          icon={Building}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Property Name *"
              placeholder="e.g. Green Heights Villa #4"
              value={formData.propertyName}
              onChange={(e) => updateForm({ propertyName: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => updateForm({ propertyType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
              >
                <option value="Apartment">Apartment</option>
                <option value="Villa">Villa / Independent House</option>
                <option value="Commercial">Commercial / Office</option>
                <option value="Plot">Residential Plot</option>
                <option value="Studio">Studio Apartment</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Registered Property Address *"
                placeholder="Full address according to municipality registration"
                value={formData.address}
                onChange={(e) => updateForm({ address: e.target.value })}
              />
            </div>
            <Input
              label="Total Built-up Area (Sq.Ft)"
              placeholder="e.g. 1450"
              value={formData.areaSqFt}
              onChange={(e) => updateForm({ areaSqFt: e.target.value })}
            />
            <Input
              label="Construction Year"
              placeholder="e.g. 2022"
              value={formData.yearBuilt}
              onChange={(e) => updateForm({ yearBuilt: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Ownership Details */}
      {currentStep === 2 && (
        <VerificationSectionCard
          title="Step 2: Legal & Ownership Identifiers"
          subtitle="Official survey, khata, and municipal jurisdiction records"
          icon={ShieldCheck}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Primary Owner / Legal Entity Name *"
              placeholder="Name as printed on original Sale Deed"
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Ownership Structure</label>
              <select
                value={formData.ownershipType}
                onChange={(e) => updateForm({ ownershipType: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-muted/50 border border-border text-xs font-semibold text-foreground focus:outline-none"
              >
                {MOCK_OWNERSHIP_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Property Registration Number"
              placeholder="e.g. REG-2022-XXXX"
              value={formData.registrationNumber}
              onChange={(e) => updateForm({ registrationNumber: e.target.value })}
            />
            <Input
              label="Survey / Plot Number"
              placeholder="e.g. SURV-882/B"
              value={formData.surveyNumber}
              onChange={(e) => updateForm({ surveyNumber: e.target.value })}
            />
            <Input
              label="Khata / PID Number"
              placeholder="e.g. KHATA-4410"
              value={formData.khataNumber}
              onChange={(e) => updateForm({ khataNumber: e.target.value })}
            />
            <Input
              label="Municipal Authority Jurisdiction"
              placeholder="e.g. Greater Municipal Corporation"
              value={formData.municipality}
              onChange={(e) => updateForm({ municipality: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 3: Documents Upload */}
      {currentStep === 3 && (
        <VerificationSectionCard
          title="Step 3: Upload Ownership & Compliance Documents"
          subtitle="Attach PDF or high-resolution photos of title deeds and tax receipts"
          icon={Upload}
        >
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <p className="text-xs font-bold text-foreground">1. Sale Deed / Title Deed *</p>
                <p className="text-[11px] text-muted-foreground">Original registered deed proving ownership rights.</p>
                <FileUploader onFileSelected={(file) => handleFileUpload('SALE_DEED', file)} label="Upload Title Deed" />
              </div>

              <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 space-y-3">
                <p className="text-xs font-bold text-foreground">2. Property Tax Receipt (Current FY)</p>
                <p className="text-[11px] text-muted-foreground">Latest municipal property tax payment receipt.</p>
                <FileUploader onFileSelected={(file) => handleFileUpload('TAX_RECEIPT', file)} label="Upload Tax Receipt" />
              </div>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-xs font-bold text-muted-foreground">Uploaded Documents ({documents.length})</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {documents.map((doc) => (
                    <div key={doc._id} className="p-3 rounded-xl bg-card border border-border flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-foreground">{doc.filename}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.documentType}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc._id)}
                        className="text-muted-foreground hover:text-rose-500 p-1"
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
          title="Step 4: Property Physical Inspection Photos"
          subtitle="Add exterior building elevation, living area, kitchen, and bathroom photos"
          icon={ImageIcon}
        >
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl border border-dashed border-border bg-muted/20 text-center space-y-2">
              <p className="text-xs font-bold text-foreground">Upload Real Estate Photos</p>
              <p className="text-[11px] text-muted-foreground">Geotagged high-resolution photos accelerate verification review.</p>
              <FileUploader onFileSelected={(file) => handlePhotoUpload('Exterior / Interior', file)} label="Add Property Photo" />
            </div>

            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border aspect-video bg-muted">
                    <img src={photo.url} alt={photo.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1.5 rounded-full bg-rose-500 text-white hover:bg-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review & Verify */}
      {currentStep === 5 && (
        <VerificationSectionCard
          title="Step 5: Review Property Verification Application"
          subtitle="Verify all entered property attributes and attached documents before submission"
          icon={ShieldCheck}
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30 border border-border">
              <div>
                <span className="text-muted-foreground font-semibold">Property:</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{formData.propertyName}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Owner:</span>
                <p className="font-bold text-foreground text-sm mt-0.5">{formData.ownerName} ({formData.ownershipType})</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground font-semibold">Address:</span>
                <p className="font-medium text-foreground mt-0.5">{formData.address}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Registration / Khata:</span>
                <p className="font-medium text-foreground mt-0.5">{formData.registrationNumber || 'N/A'} • {formData.khataNumber || 'N/A'}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Attached Docs & Photos:</span>
                <p className="font-bold text-emerald-500 mt-0.5">{documents.length} Document(s), {photos.length} Photo(s)</p>
              </div>
            </div>
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 6: Submit */}
      {currentStep === 6 && (
        <VerificationSectionCard
          title="Step 6: Submit Legal Verification Application"
          subtitle="Your application will be queued for municipal automated review and physical inspection"
          icon={CheckCircle2}
        >
          <div className="p-6 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">Ready to Submit Application</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Upon submission, a verification record will be generated. You will receive real-time status updates on your dashboard.
              </p>
            </div>
            <Button
              variant="primary"
              className="w-full text-xs py-2.5 justify-center"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Submitting Application...' : 'Confirm & Submit Verification'}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Bottom Floating Navigation Bar */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="outline"
          onClick={handlePrev}
          disabled={currentStep === 1}
          className="text-xs"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>

        {currentStep < 6 ? (
          <Button
            variant="primary"
            onClick={handleNext}
            className="text-xs"
          >
            Next Step
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
            className="text-xs"
          >
            {submitting ? 'Submitting...' : 'Submit Application'}
          </Button>
        )}
      </div>
    </div>
  );
}
