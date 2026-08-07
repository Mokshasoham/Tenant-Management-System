import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
import useAuthStore from '../../context/authStore';
import { trackEvent, VERIFICATION_EVENTS } from '../../utils/verificationAnalytics';
import { MOCK_REFERENCES } from '../../mocks/tenantVerificationMock';
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
  { stepNumber: 1, title: 'Personal Info' },
  { stepNumber: 2, title: 'Contact & References' },
  { stepNumber: 3, title: 'Identity Docs' },
  { stepNumber: 4, title: 'Address Proof' },
  { stepNumber: 5, title: 'Review & Verify' },
  { stepNumber: 6, title: 'Submit Application' },
];

export default function TenantVerificationWizard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, refresh } = useVerificationContext();

  const userId = user?.userId || user?._id || user?.id || 'demo';
  const DRAFT_STORAGE_KEY = `tenant_verification_draft_${userId}`;

  const [currentStep, setCurrentStep] = useState(1);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved'
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    emergencyContactName: 'Jane Doe',
    emergencyContactPhone: '+1 (555) 987-6543',
    occupation: 'Software Engineer',
    employerName: 'TechCorp Solutions',
    monthlyIncome: '8500',
  });

  // Enhancement #14: References State
  const [references, setReferences] = useState(MOCK_REFERENCES);

  // Documents State
  const [documents, setDocuments] = useState([]);

  // Auto-restore Draft on Mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (parsed.references) setReferences(parsed.references);
        if (parsed.currentStep) setCurrentStep(parsed.currentStep);
        setLastAutoSave(parsed.lastSaved || null);
      }
    } catch (e) {
      // Ignore parse errors
    }
  }, [DRAFT_STORAGE_KEY]);

  // Enhancement #5: Unsaved Changes Leave Confirmation (beforeunload)
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes in your verification wizard.';
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
        references,
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
  }, [formData, references, documents, currentStep, DRAFT_STORAGE_KEY]);

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
        _id: `doc_${Date.now()}`,
        documentType: docType,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
        status: 'VERIFIED',
        category: docType === 'GOVT_ID' ? 'IDENTITY' : 'ADDRESS',
      };
      setDocuments((prev) => [...prev.filter((d) => d.documentType !== docType), newDoc]);
      setHasUnsavedChanges(true);
      trackEvent(VERIFICATION_EVENTS.DOCUMENT_UPLOADED, { docType, filename: file.name });
    } catch (err) {
      setFormError('Failed to process uploaded document');
    }
  };

  const handleRemoveDoc = (docId) => {
    setDocuments((prev) => prev.filter((d) => d._id !== docId));
    setHasUnsavedChanges(true);
    trackEvent(VERIFICATION_EVENTS.DOCUMENT_REMOVED, { docId });
  };

  // Enhancement #14: Add Reference Handler
  const handleAddReference = () => {
    const newRef = {
      id: `ref_${Date.now()}`,
      name: '',
      relationship: 'Previous Landlord',
      phone: '',
      email: '',
      status: 'UNVERIFIED_DEMO',
    };
    setReferences((prev) => [...prev, newRef]);
    setHasUnsavedChanges(true);
    trackEvent(VERIFICATION_EVENTS.REFERENCE_ADDED);
  };

  const handleUpdateReference = (id, key, value) => {
    setReferences((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [key]: value } : r))
    );
    setHasUnsavedChanges(true);
  };

  const handleRemoveReference = (id) => {
    setReferences((prev) => prev.filter((r) => r.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleNext = () => {
    setFormError(null);
    if (currentStep === 2 && !formData.emergencyContactName) {
      setFormError('Emergency Contact Name is required');
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
      trackEvent(VERIFICATION_EVENTS.VERIFICATION_SUBMITTED);
      navigate('/tenant/verification');
    } catch (err) {
      setFormError(err.message || 'Failed to submit verification application');
    } finally {
      setSubmitting(false);
    }
  };

  // Enhancement #17: Step Progress Text
  const progressPercent = Math.round((currentStep / WIZARD_STEPS.length) * 100);

  return (
    <div className="p-6 sm:p-10 space-y-8 pb-24 sm:pb-10">
      <VerificationPageHeader
        title="Tenant Rental Verification Wizard"
        subtitle="Complete your profile, attach proofs, and add references to build rental trust"
        icon={ShieldCheck}
        breadcrumbs={[
          { label: 'Tenant Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/tenant/verification' },
          { label: 'Wizard' },
        ]}
        actionSlot={
          <div className="flex items-center gap-3">
            {/* Enhancement #5: Save Status Indicator */}
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

      {/* Enhancement #9: Mobile-friendly Stepper Wrapper */}
      <div className="space-y-2">
        <VerificationProgressStepper steps={WIZARD_STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />
        {/* Enhancement #17: Step Progress Text */}
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground px-1">
          <span>Step {currentStep} of {WIZARD_STEPS.length}</span>
          <span className="text-primary">{progressPercent}% Complete</span>
        </div>
      </div>

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Personal Info */}
      {currentStep === 1 && (
        <VerificationSectionCard title="Step 1: Personal Information" subtitle="Read-only tenant profile data">
          <div className="space-y-4">
            <Input label="Full Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`} disabled />
            <Input label="Email Address" value={user?.email || ''} disabled />
            <Input label="Phone Number" value={user?.phone || '+1 (555) 019-2831'} disabled />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Contact & References (#14) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <VerificationSectionCard title="Step 2: Emergency Contact & Employment" subtitle="Rental application details">
            <div className="space-y-4">
              <Input
                label="Emergency Contact Full Name"
                placeholder="e.g. Jane Doe"
                value={formData.emergencyContactName}
                onChange={(e) => updateForm({ emergencyContactName: e.target.value })}
              />
              <Input
                label="Emergency Contact Phone"
                placeholder="e.g. +1 (555) 987-6543"
                value={formData.emergencyContactPhone}
                onChange={(e) => updateForm({ emergencyContactPhone: e.target.value })}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Occupation / Title"
                  placeholder="e.g. Software Engineer"
                  value={formData.occupation}
                  onChange={(e) => updateForm({ occupation: e.target.value })}
                />
                <Input
                  label="Employer / Company Name"
                  placeholder="e.g. TechCorp Solutions"
                  value={formData.employerName}
                  onChange={(e) => updateForm({ employerName: e.target.value })}
                />
              </div>
            </div>
          </VerificationSectionCard>

          {/* Enhancement #14: Reference Verification Form */}
          <VerificationSectionCard
            title="Rental References"
            subtitle="Add previous landlords or employers to strengthen your trust profile"
            icon={UserCheck}
          >
            <div className="space-y-4 pt-1">
              {references.map((ref, idx) => (
                <div key={ref.id || idx} className="p-4 rounded-xl border border-border bg-muted/30 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-foreground">Reference #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveReference(ref.id)}
                      className="text-muted-foreground hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Reference Name"
                      placeholder="e.g. Robert Vance"
                      value={ref.name}
                      onChange={(e) => handleUpdateReference(ref.id, 'name', e.target.value)}
                    />
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Relationship</label>
                      <select
                        className="w-full h-10 px-3 text-xs rounded-xl border border-border bg-background text-foreground"
                        value={ref.relationship}
                        onChange={(e) => handleUpdateReference(ref.id, 'relationship', e.target.value)}
                      >
                        <option value="Previous Landlord">Previous Landlord</option>
                        <option value="Employer / HR Manager">Employer / HR Manager</option>
                        <option value="Personal Reference">Personal Reference</option>
                      </select>
                    </div>
                    <Input
                      label="Phone"
                      placeholder="e.g. +1 (555) 234-5678"
                      value={ref.phone}
                      onChange={(e) => handleUpdateReference(ref.id, 'phone', e.target.value)}
                    />
                    <Input
                      label="Email"
                      placeholder="e.g. landlord@example.com"
                      value={ref.email}
                      onChange={(e) => handleUpdateReference(ref.id, 'email', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button type="button" variant="outline" className="w-full text-xs" onClick={handleAddReference}>
                <Plus className="w-4 h-4 mr-1.5" />
                Add Another Reference
              </Button>
            </div>
          </VerificationSectionCard>
        </div>
      )}

      {/* Step 3: Identity Docs */}
      {currentStep === 3 && (
        <VerificationSectionCard title="Step 3: Identity Verification Documents" subtitle="Upload government photo ID">
          <div className="space-y-4">
            <FileUploader
              label="Upload Govt Photo ID"
              onFileSelect={(file) => handleFileUpload('GOVT_ID', file)}
              hint="Passport, Drivers License, or National Identity Card"
            />
            {documents
              .filter((d) => d.documentType === 'GOVT_ID')
              .map((doc) => (
                <DocumentPreviewCard key={doc._id} document={doc} onRemove={() => handleRemoveDoc(doc._id)} />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 4: Address Proof */}
      {currentStep === 4 && (
        <VerificationSectionCard title="Step 4: Address Proof Documents" subtitle="Upload recent utility bill or bank statement">
          <div className="space-y-4">
            <FileUploader
              label="Upload Address Proof"
              onFileSelect={(file) => handleFileUpload('ADDRESS_PROOF', file)}
              hint="Utility Bill, Bank Statement, or Rental Lease Agreement"
            />
            {documents
              .filter((d) => d.documentType === 'ADDRESS_PROOF')
              .map((doc) => (
                <DocumentPreviewCard key={doc._id} document={doc} onRemove={() => handleRemoveDoc(doc._id)} />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <VerificationSectionCard title="Step 5: Review Application Data" subtitle="Verify information before final submission">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">Tenant Name: {user?.firstName} {user?.lastName}</p>
              <p className="text-muted-foreground">Occupation: {formData.occupation || 'N/A'}</p>
              <p className="text-muted-foreground">Employer: {formData.employerName || 'N/A'}</p>
              <p className="text-muted-foreground">Emergency Contact: {formData.emergencyContactName} ({formData.emergencyContactPhone})</p>
            </div>

            <p className="font-bold text-foreground">References Added ({references.length}):</p>
            <div className="space-y-2">
              {references.map((r, i) => (
                <div key={i} className="p-3 rounded-lg border border-border bg-muted/20 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-foreground">{r.name || 'Unnamed'}</p>
                    <p className="text-[10px] text-muted-foreground">{r.relationship} • {r.email || r.phone}</p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">Demo Storage Only</span>
                </div>
              ))}
            </div>

            <p className="font-bold text-foreground">Uploaded Documents ({documents.length}):</p>
            {documents.map((doc) => (
              <DocumentPreviewCard key={doc._id} document={doc} />
            ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 6: Submit */}
      {currentStep === 6 && (
        <VerificationSectionCard title="Step 6: Confirm & Submit Application" subtitle="Finalize rental verification request">
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce-slow" />
            <h3 className="text-base font-black text-foreground">Application Ready for Submission</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              Your application will undergo automated validation followed by manager review to update your Trust Score and award rental badges.
            </p>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="mx-auto">
              {submitting ? 'Submitting Application...' : 'Submit Verification Application'}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Enhancement #9: Sticky Bottom Bar on Mobile */}
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
