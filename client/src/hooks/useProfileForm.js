import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuthStore from '../context/authStore';
import profileService from '../services/profileService';
import { validatePersonal } from '../validators/profileValidator';
import { validateContact } from '../validators/contactValidator';
import { validateAddress } from '../validators/addressValidator';

export const useProfileForm = () => {
  const { user, setUser } = useAuthStore();

  const initialForm = useMemo(() => ({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    preferredName: user?.preferredName || '',
    gender: user?.gender || '',
    dob: user?.dob || '',
    occupation: user?.occupation || '',
    nationality: user?.nationality || '',
    phone: user?.phone || '',
    secondaryEmail: user?.secondaryEmail || '',
    alternatePhone: user?.alternatePhone || '',
    emergencyContact: {
      name: user?.emergencyContact?.name || '',
      phone: user?.emergencyContact?.phone || '',
      relationship: user?.emergencyContact?.relationship || ''
    },
    address: {
      currentAddress: user?.address?.currentAddress || '',
      permanentAddress: user?.address?.permanentAddress || '',
      country: user?.address?.country || '',
      state: user?.address?.state || '',
      city: user?.address?.city || '',
      postalCode: user?.address?.postalCode || ''
    }
  }), [user]);

  const [form, setForm] = useState(initialForm);
  const [saveState, setSaveState] = useState('idle'); // 'idle' | 'modified' | 'saving' | 'saved' | 'error'
  const [errors, setErrors] = useState({});
  const [serverMsg, setServerMsg] = useState('');

  // Sync form when user changes
  useEffect(() => {
    setForm(initialForm);
  }, [initialForm]);

  // Compute if form has unsaved changes
  const isDirty = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(initialForm);
  }, [form, initialForm]);

  // Update saveState when modified
  useEffect(() => {
    if (isDirty && saveState !== 'saving') {
      setSaveState('modified');
    } else if (!isDirty && saveState === 'modified') {
      setSaveState('idle');
    }
  }, [isDirty, saveState]);

  // Warn user before exiting window/tab if changes are unsaved
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes on your profile. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Update nested field helper
  const updateField = useCallback((field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const updateEmergencyField = useCallback((field, value) => {
    setForm(prev => ({
      ...prev,
      emergencyContact: { ...prev.emergencyContact, [field]: value }
    }));
  }, []);

  const updateAddressField = useCallback((field, value) => {
    setForm(prev => ({
      ...prev,
      address: { ...prev.address, [field]: value }
    }));
  }, []);

  const resetForm = useCallback(() => {
    setForm(initialForm);
    setErrors({});
    setSaveState('idle');
    setServerMsg('');
  }, [initialForm]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (saveState === 'saving') return; // Prevent duplicate submission

    // Execute Client-Side Validation Suite
    const personalVal = validatePersonal(form);
    const contactVal = validateContact(form);
    const addressVal = validateAddress(form);

    const combinedErrors = {
      ...personalVal.errors,
      ...contactVal.errors,
      ...addressVal.errors
    };

    if (Object.keys(combinedErrors).length > 0) {
      setErrors(combinedErrors);
      setSaveState('error');
      setServerMsg('Validation failed. Please correct highlighted fields.');
      return;
    }

    setErrors({});
    setSaveState('saving');
    setServerMsg('');

    try {
      const res = await profileService.updateProfile(form);
      const updatedUser = res.data?.data || res.data || form;

      if (setUser) {
        setUser({ ...user, ...updatedUser });
      }

      setSaveState('saved');
      setServerMsg('Profile updated successfully!');

      // Auto hide saved toast after 3.5 seconds
      setTimeout(() => {
        setSaveState('idle');
        setServerMsg('');
      }, 3500);
    } catch (err) {
      setSaveState('error');
      setServerMsg(err.response?.data?.message || err.message || 'Failed to update profile');
    }
  };

  return {
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
  };
};

export default useProfileForm;
