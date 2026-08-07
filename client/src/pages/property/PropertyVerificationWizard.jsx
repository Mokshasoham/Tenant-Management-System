import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { MOCK_OWNERSHIP_TYPES, MOCK_PROPERTY_PHOTOS } from '../../mocks/propertyVerificationMock';
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
  const user = useAuthStore((state) => state.user);
  const { activeVerification, refresh } = useVerificationContext();

  const userId = user?.userId || user?._id || user?.id || 'demo';
  const DRAFT_STORAGE_KEY = `property_verification_draft_${userId}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    propertyName: 'Oakwood Residency, Apt 4B',
    propertyType: 'Apartment',
    address: '142 Palm Boulevard, Sector 15, City',
    areaSqFt: '1450',
    yearBuilt: '2019',
    ownerName: user?.firstName ? `${user.firstName} ${user.lastName}` : 'Sarah Jenkins',
    ownershipType: 'Individual Owner', // Enhancement #2
    registrationNumber: 'REG-2019-9941',
    surveyNumber: 'SURV-882/B',
    khataNumber: 'KHATA-4410',
    municipality: 'City Municipal Corporation',
  });

  const [documents, setDocuments] = useState([]);
  const [photos, setPhotos] = useState(MOCK_PROPERTY_PHOTOS);

  // Auto-restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.photos) setPhotos(parsed.photos);
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
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      setHasUnsavedChanges(false);
      await refresh();
      trackEvent(VERIFICATION_EVENTS.PROPERTY_SUBMITTED);
      navigate('/property/verification');
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
          { label: 'Property Verification', href: '/property/verification' },
          { label: 'Wizard' },
        ]}
        actionSlot={
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-muted-foreground">
              {saveStatus === 'saving' && 'Saving...'}
              {saveStatus === 'saved' && 'Saved ✓'}
              {saveStatus === 'idle' && lastAutoSave && `Last saved: ${lastAutoSave}`}
            </span>
            <Button variant="outline" onClick={saveDraft} disabled={saveStatus === 'saving'} className="text-xs">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save Draft
            </Button>
          </div>
        }
      />

      {/* Stepper Wrapper & Progress Text */}
      <div className="space-y-2">
        <VerificationProgressStepper steps={WIZARD_STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
          <span>Step {currentStep} of {WIZARD_STEPS.length}</span>
          <span className="text-primary">{progressPercent}% Complete</span>
        </div>
      </div>

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Property Details */}
      {currentStep === 1 && (
        <VerificationSectionCard title="Step 1: Basic Property Specs" subtitle="Enter physical property specs">
          <div className="space-y-4">
            <Input
              label="Property Name / Title"
              placeholder="e.g. Oakwood Residency, Apt 4B"
              value={formData.propertyName}
              onChange={(e) => updateForm({ propertyName: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-foreground">Property Type</label>
                <select
                  className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground"
                  value={formData.propertyType}
                  onChange={(e) => updateForm({ propertyType: e.target.value })}
                >
                  <option value="Apartment">Apartment</option>
                  <option value="Independent Villa">Independent Villa</option>
                  <option value="Commercial Office">Commercial Office</option>
                  <option value="Retail Store">Retail Store</option>
                  <option value="Warehouse / Storage">Warehouse / Storage</option>
                </select>
              </div>
              <Input
                label="Total Built-up Area (sq ft)"
                placeholder="e.g. 1450"
                value={formData.areaSqFt}
                onChange={(e) => updateForm({ areaSqFt: e.target.value })}
              />
            </div>
            <Input
              label="Full Physical Address"
              placeholder="e.g. 142 Palm Boulevard, Sector 15, City"
              value={formData.address}
              onChange={(e) => updateForm({ address: e.target.value })}
            />
            <Input
              label="Year Built / Construction Completion"
              placeholder="e.g. 2019"
              value={formData.yearBuilt}
              onChange={(e) => updateForm({ yearBuilt: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Ownership Details (#2 Expanded Ownership Types) */}
      {currentStep === 2 && (
        <VerificationSectionCard title="Step 2: Ownership & Legal Title" subtitle="Enter registered ownership specs">
          <div className="space-y-4">
            <Input
              label="Registered Property Owner Name"
              placeholder="e.g. Sarah Jenkins"
              value={formData.ownerName}
              onChange={(e) => updateForm({ ownerName: e.target.value })}
            />

            {/* Enhancement #2: Expanded Ownership Types */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-foreground">Ownership Category</label>
              <select
                className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground"
                value={formData.ownershipType}
                onChange={(e) => updateForm({ ownershipType: e.target.value })}
              >
                {MOCK_OWNERSHIP_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Property Reg Number"
                placeholder="e.g. REG-2019-9941"
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
                label="Khata / Property Tax ID"
                placeholder="e.g. KHATA-4410"
                value={formData.khataNumber}
                onChange={(e) => updateForm({ khataNumber: e.target.value })}
              />
            </div>
            <Input
              label="Local Municipal Authority"
              placeholder="e.g. City Municipal Corporation"
              value={formData.municipality}
              onChange={(e) => updateForm({ municipality: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 3: Property Documents */}
      {currentStep === 3 && (
        <VerificationSectionCard title="Step 3: Ownership & Tax Documents" subtitle="Upload title deed and property tax receipts">
          <div className="space-y-4">
            <FileUploader
              label="Upload Original Sale Deed / Title Deed"
              onFileSelect={(file) => handleFileUpload('SALE_DEED', file)}
              hint="Registered title deed PDF or image"
            />
            <FileUploader
              label="Upload Property Tax Receipt"
              onFileSelect={(file) => handleFileUpload('TAX_RECEIPT', file)}
              hint="Latest annual municipal property tax receipt"
            />
            {documents.map((doc) => (
              <DocumentPreviewCard key={doc._id} document={doc} onRemove={() => handleRemoveDoc(doc._id)} />
            ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 4: Property Photos */}
      {currentStep === 4 && (
        <VerificationSectionCard title="Step 4: Property Room Photos" subtitle="Upload high-resolution room elevation photos" icon={ImageIcon}>
          <div className="space-y-4 pt-1">
            <FileUploader
              label="Upload Room Photo"
              onFileSelect={(file) => handlePhotoUpload('Room Elevation', file)}
              hint="Exterior, Living Room, Bedroom, Kitchen, Bathroom"
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {photos.map((photo) => (
                <div key={photo.id} className="p-3 rounded-xl border border-border bg-muted/30 relative group text-center space-y-2">
                  <div className="w-full h-24 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-xs font-bold text-foreground truncate">{photo.title}</p>
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="text-muted-foreground hover:text-rose-500 text-xs flex items-center justify-center gap-1 mx-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <VerificationSectionCard title="Step 5: Review Submission Data" subtitle="Verify specs before legal submission">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">Property: {formData.propertyName}</p>
              <p className="text-muted-foreground">Type: {formData.propertyType} • Area: {formData.areaSqFt} sq ft</p>
              <p className="text-muted-foreground">Owner: {formData.ownerName} ({formData.ownershipType})</p>
              <p className="text-muted-foreground">Reg ID: {formData.registrationNumber} • Khata: {formData.khataNumber}</p>
            </div>
            <p className="font-bold text-foreground">Attached Property Documents ({documents.length}):</p>
            {documents.map((doc) => (
              <DocumentPreviewCard key={doc._id} document={doc} />
            ))}
            <p className="font-bold text-foreground">Verified Property Photos ({photos.length}):</p>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <span key={p.id} className="px-2.5 py-1 rounded-lg bg-muted text-[10px] font-bold border border-border">
                  {p.title} ✓
                </span>
              ))}
            </div>
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 6: Submit */}
      {currentStep === 6 && (
        <VerificationSectionCard title="Step 6: Confirm & Submit Property" subtitle="Finalize real estate verification">
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce-slow" />
            <h3 className="text-base font-black text-foreground">Property Verification Ready</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              By clicking Submit, your title deeds, municipal records, and physical photos will undergo legal title verification to issue VRF certification.
            </p>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="mx-auto">
              {submitting ? 'Submitting Property...' : 'Submit Property Application'}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Mobile-friendly Sticky Bottom Bar */}
      <div className="fixed sm:static bottom-0 left-0 right-0 p-4 sm:p-0 bg-background/95 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none border-t sm:border-0 border-border z-30 flex items-center justify-between pt-4">
        <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 1} className="text-xs">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Previous
        </Button>
        {currentStep < 6 && (
          <Button variant="primary" onClick={handleNext} className="text-xs">
            Next Step
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
