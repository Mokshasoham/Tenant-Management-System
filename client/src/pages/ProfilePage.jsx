import React, { Suspense, lazy } from 'react';
import useAuthStore from '../context/authStore';
import { useProfileForm } from '../hooks/useProfileForm';
import { useAvatarUpload } from '../hooks/useAvatarUpload';
import { useProfileCompletion } from '../hooks/useProfileCompletion';

// Primary Components
import AccountHero from '../components/profile/AccountHero';
import ProfileCompletion from '../components/profile/ProfileCompletion';
import PersonalInformationCard from '../components/profile/PersonalInformationCard';
import ContactInformationCard from '../components/profile/ContactInformationCard';
import AddressInformationCard from '../components/profile/AddressInformationCard';
import ProfilePhotoModal from '../components/profile/ProfilePhotoModal';
import SaveBar from '../components/profile/SaveBar';
import profileService from '../services/profileService';

// Lazy Loaded Infrequently Used Cards (Performance Optimization)
const ChangePasswordCard = lazy(() => import('../components/profile/ChangePasswordCard'));
const TwoFactorCard = lazy(() => import('../components/profile/TwoFactorCard'));
const KYCCard = lazy(() => import('../components/profile/KYCCard'));

export default function ProfilePage() {
  const { user } = useAuthStore();

  // Custom Hooks managing business logic & form state
  const {
    form,
    isDirty,
    saveState,
    errors,
    serverMsg,
    updateField,
    updateEmergencyField,
    updateAddressField,
    resetForm,
    handleSubmit
  } = useProfileForm();

  const {
    modalState,
    openModal,
    closeModal,
    handleFileSelect,
    handleUpload,
    handleDeleteAvatar
  } = useAvatarUpload();

  // Configurable 100-Point Weighted Completion Calculation
  const completionInfo = useProfileCompletion(user, form);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24 px-4 sm:px-6">
      
      {/* 1. Account Hero Header */}
      <AccountHero
        user={user}
        completionPercentage={completionInfo.percentage}
        onOpenAvatarModal={openModal}
        onDownloadPDF={() => profileService.downloadProfilePDF(user)}
        onEditProfile={() => {
          const el = document.getElementById('personal-info-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* 2. Weighted Profile Completion Banner */}
      <ProfileCompletion completionInfo={completionInfo} />

      {/* 3. Core Editable Information Cards (Responsive Layout) */}
      <div id="personal-info-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <PersonalInformationCard
          form={form}
          errors={errors}
          updateField={updateField}
          disabled={saveState === 'saving'}
        />

        <ContactInformationCard
          user={user}
          form={form}
          errors={errors}
          updateField={updateField}
          updateEmergencyField={updateEmergencyField}
          disabled={saveState === 'saving'}
        />

        <AddressInformationCard
          form={form}
          errors={errors}
          updateAddressField={updateAddressField}
          disabled={saveState === 'saving'}
        />
      </div>

      {/* 4. Security, 2FA & Identity Verification (Lazy Loaded with Suspense) */}
      <Suspense fallback={
        <div className="p-6 rounded-2xl border border-border bg-card shadow-sm animate-pulse h-48 flex items-center justify-center text-muted-foreground text-xs font-bold">
          Loading Security Modules...
        </div>
      }>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ChangePasswordCard disabled={saveState === 'saving'} />
          <TwoFactorCard disabled={saveState === 'saving'} />
          <KYCCard disabled={saveState === 'saving'} />
        </div>
      </Suspense>

      {/* 5. Avatar Management Modal */}
      <ProfilePhotoModal
        user={user}
        modalState={modalState}
        onClose={closeModal}
        onFileSelect={handleFileSelect}
        onUpload={handleUpload}
        onDelete={handleDeleteAvatar}
      />

      {/* 6. Floating SaveBar (Stateful Unsaved Changes Experience) */}
      <SaveBar
        isDirty={isDirty}
        saveState={saveState}
        serverMsg={serverMsg}
        onSave={handleSubmit}
        onReset={resetForm}
      />

    </div>
  );
}
