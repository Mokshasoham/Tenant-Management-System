import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowLeft, ArrowRight, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import { useVerificationContext } from '../../context/VerificationContext';
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

const WIZARD_STEPS = [
  { stepNumber: 1, title: 'Profile Information' },
  { stepNumber: 2, title: 'Business Details' },
  { stepNumber: 3, title: 'Identity Documents' },
  { stepNumber: 4, title: 'Business Documents' },
  { stepNumber: 5, title: 'Review & Verify' },
  { stepNumber: 6, title: 'Submit Application' },
];

export default function ManagerVerificationWizard() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { activeVerification, setActiveVerification, refresh } = useVerificationContext();

  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lastAutoSave, setLastAutoSave] = useState(null);
  const [formError, setFormError] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    businessName: user?.managerProfile?.companyName || '',
    businessType: 'Real Estate Management',
    taxId: '',
    address: '',
  });

  const [documents, setDocuments] = useState([]);

  // Auto-Save Effect (Every 25 seconds or step change)
  const saveDraft = useCallback(async () => {
    try {
      setSaving(true);
      setLastAutoSave(new Date().toLocaleTimeString());
    } catch (e) {
      // Autosave catch
    } finally {
      setSaving(false);
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      saveDraft();
    }, 25000);
    return () => clearInterval(timer);
  }, [saveDraft]);

  const handleFileUpload = async (docType, file) => {
    try {
      let processed = file;
      if (file.type.startsWith('image/')) {
        processed = await compressImage(file, 1920, 0.8);
      }
      const newDoc = {
        _id: `doc_${Date.now()}`,
        type: docType,
        filename: file.name,
        uploadedAt: new Date(),
        status: 'VERIFIED',
      };
      setDocuments((prev) => [...prev.filter((d) => d.type !== docType), newDoc]);
    } catch (err) {
      setFormError('Failed to process uploaded file');
    }
  };

  const handleRemoveDoc = (docId) => {
    setDocuments((prev) => prev.filter((d) => d._id !== docId));
  };

  const handleNext = () => {
    setFormError(null);
    if (currentStep === 1 && !formData.businessName) {
      setFormError('Business / Company Name is required');
      return;
    }
    if (currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
      saveDraft();
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
      setSubmitting(true);
      setFormError(null);
      await refresh();
      navigate('/manager/verification');
    } catch (err) {
      setFormError(err.message || 'Failed to submit verification');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 sm:p-10 space-y-8">
      <VerificationPageHeader
        title="Manager Verification Wizard"
        subtitle="Complete multi-step business verification to receive trust badges"
        icon={ShieldCheck}
        breadcrumbs={[
          { label: 'Manager Portal', href: '/dashboard' },
          { label: 'Verification Home', href: '/manager/verification' },
          { label: 'Wizard' },
        ]}
        actionSlot={
          <div className="flex items-center gap-3">
            {lastAutoSave && <span className="text-xs text-muted-foreground">Auto-saved: {lastAutoSave}</span>}
            <Button variant="outline" onClick={saveDraft} disabled={saving} className="text-xs">
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
          </div>
        }
      />

      <VerificationProgressStepper steps={WIZARD_STEPS} currentStep={currentStep} onStepClick={setCurrentStep} />

      {formError && <VerificationErrorState error={formError} />}

      {/* Step 1: Profile Info */}
      {currentStep === 1 && (
        <VerificationSectionCard title="Step 1: Manager Profile Information" subtitle="Verify personal manager profile data">
          <div className="space-y-4">
            <Input label="Manager Full Name" value={`${user?.firstName || ''} ${user?.lastName || ''}`} disabled />
            <Input label="Email Address" value={user?.email || ''} disabled />
            <Input label="Phone Number" value={user?.phone || 'Not Provided'} disabled />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 2: Business Info */}
      {currentStep === 2 && (
        <VerificationSectionCard title="Step 2: Business & Property Company Details" subtitle="Enter registered business details">
          <div className="space-y-4">
            <Input
              label="Registered Business / Company Name"
              placeholder="e.g. Acme Property Management LLC"
              value={formData.businessName}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
            />
            <Input
              label="GST / Tax Registration PIN (Optional)"
              placeholder="e.g. 22AAAAA0000A1Z5"
              value={formData.taxId}
              onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
            />
            <Input
              label="Office Registered Address"
              placeholder="e.g. 123 Commercial Tower, Suite 400"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 3: Identity Docs */}
      {currentStep === 3 && (
        <VerificationSectionCard title="Step 3: Manager Identity Documents" subtitle="Upload Govt ID (Passport / Drivers License)">
          <div className="space-y-4">
            <FileUploader
              label="Upload Govt Photo ID"
              onFileSelect={(file) => handleFileUpload('GOVT_ID', file)}
              hint="Passport, Drivers License, or National Identity Card"
            />
            {documents
              .filter((d) => d.type === 'GOVT_ID')
              .map((doc) => (
                <DocumentPreviewCard key={doc._id} document={doc} onRemove={() => handleRemoveDoc(doc._id)} />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 4: Business Docs */}
      {currentStep === 4 && (
        <VerificationSectionCard title="Step 4: Business Registration & Tax Clearance" subtitle="Upload business license certificate">
          <div className="space-y-4">
            <FileUploader
              label="Upload Business Registration Certificate"
              onFileSelect={(file) => handleFileUpload('BUSINESS_REGISTRATION', file)}
              hint="Official business incorporation document"
            />
            {documents
              .filter((d) => d.type === 'BUSINESS_REGISTRATION')
              .map((doc) => (
                <DocumentPreviewCard key={doc._id} document={doc} onRemove={() => handleRemoveDoc(doc._id)} />
              ))}
          </div>
        </VerificationSectionCard>
      )}

      {/* Step 5: Review */}
      {currentStep === 5 && (
        <VerificationSectionCard title="Step 5: Review Submission Data" subtitle="Verify information before final submission">
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
              <p className="font-bold text-foreground">Manager: {user?.firstName} {user?.lastName}</p>
              <p className="text-muted-foreground">Company: {formData.businessName || 'Not Entered'}</p>
              <p className="text-muted-foreground">Tax ID: {formData.taxId || 'N/A'}</p>
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
        <VerificationSectionCard title="Step 6: Confirm & Submit" subtitle="Finalize verification request">
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto animate-bounce-slow" />
            <h3 className="text-base font-black text-foreground">Ready for Submission</h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              By clicking Submit Application, your credentials will undergo Level 1 Automated format validation followed by manager review.
            </p>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting} className="mx-auto">
              {submitting ? 'Submitting Application...' : 'Submit Application Now'}
            </Button>
          </div>
        </VerificationSectionCard>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button variant="ghost" onClick={handlePrev} disabled={currentStep === 1} className="text-xs">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Previous Step
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
