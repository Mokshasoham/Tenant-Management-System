import { useMemo } from 'react';

export const PROFILE_COMPLETION_WEIGHTS = {
  avatar: 10,
  personal: 20,
  contact: 20,
  address: 15,
  emergency: 10,
  kyc: 15,
  twoFactor: 10
};

/**
 * Enterprise Profile Completion Engine
 * Calculates weighted score & returns missing section recommendations.
 */
export const useProfileCompletion = (user, profileData = {}) => {
  return useMemo(() => {
    const data = { ...user, ...profileData };
    
    const sectionChecklist = [
      {
        id: 'avatar',
        title: 'Profile Photo',
        weight: PROFILE_COMPLETION_WEIGHTS.avatar,
        isComplete: !!data?.avatar,
        recommendation: 'Upload a clear profile photo'
      },
      {
        id: 'personal',
        title: 'Personal Information',
        weight: PROFILE_COMPLETION_WEIGHTS.personal,
        isComplete: !!(data?.firstName && data?.lastName && data?.gender && data?.dob && data?.occupation),
        recommendation: 'Fill in your gender, DOB & occupation'
      },
      {
        id: 'contact',
        title: 'Contact Information',
        weight: PROFILE_COMPLETION_WEIGHTS.contact,
        isComplete: !!(data?.email && data?.phone && data?.secondaryEmail && data?.alternatePhone),
        recommendation: 'Add secondary email & alternate phone number'
      },
      {
        id: 'address',
        title: 'Address Information',
        weight: PROFILE_COMPLETION_WEIGHTS.address,
        isComplete: !!(data?.address?.currentAddress && data?.address?.city && data?.address?.state && data?.address?.postalCode),
        recommendation: 'Complete your current address & postal code'
      },
      {
        id: 'emergency',
        title: 'Emergency Contact',
        weight: PROFILE_COMPLETION_WEIGHTS.emergency,
        isComplete: !!(data?.emergencyContact?.name && data?.emergencyContact?.phone),
        recommendation: 'Add emergency contact name & phone number'
      },
      {
        id: 'kyc',
        title: 'Identity Verification (KYC)',
        weight: PROFILE_COMPLETION_WEIGHTS.kyc,
        isComplete: data?.kycStatus === 'verified' || data?.kycStatus === 'approved',
        recommendation: 'Upload official ID documents for KYC verification'
      },
      {
        id: 'twoFactor',
        title: 'Two-Factor Security (2FA)',
        weight: PROFILE_COMPLETION_WEIGHTS.twoFactor,
        isComplete: !!data?.twoFactorEnabled,
        recommendation: 'Enable Two-Factor Authenticator security'
      }
    ];

    let percentage = 0;
    const completedSections = [];
    const missingSections = [];

    sectionChecklist.forEach(sec => {
      if (sec.isComplete) {
        percentage += sec.weight;
        completedSections.push(sec.title);
      } else {
        missingSections.push(sec);
      }
    });

    const nextRecommendation = missingSections.length > 0
      ? missingSections[0].recommendation
      : 'Your account profile is 100% complete!';

    return {
      percentage: Math.min(100, Math.round(percentage)),
      completedCount: completedSections.length,
      totalSections: sectionChecklist.length,
      completedSections,
      missingSections,
      nextRecommendation,
      checklist: sectionChecklist
    };
  }, [user, profileData]);
};

export default useProfileCompletion;
