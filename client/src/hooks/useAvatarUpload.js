import { useState, useCallback } from 'react';
import useAuthStore from '../context/authStore';
import profileService from '../services/profileService';

/**
 * 10-Step Avatar Pipeline Hook with Client-Side Canvas Metadata Stripping & Compression
 */
export const useAvatarUpload = () => {
  const { user, setUser } = useAuthStore();

  const [modalState, setModalState] = useState({
    isOpen: false,
    selectedFile: null,
    previewUrl: null,
    compressedBlob: null,
    loading: false,
    deleting: false,
    error: null,
    successMsg: null
  });

  const closeModal = useCallback(() => {
    setModalState({
      isOpen: false,
      selectedFile: null,
      previewUrl: null,
      compressedBlob: null,
      loading: false,
      deleting: false,
      error: null,
      successMsg: null
    });
  }, []);

  const openModal = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: true, error: null, successMsg: null }));
  }, []);

  // Step 1 - 6: Selection, MIME Validation, Size Validation, Canvas Compression & Metadata Stripping
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Step 2: Validate MIME
    if (!file.type.startsWith('image/')) {
      setModalState(prev => ({
        ...prev,
        isOpen: true,
        error: 'Invalid file type. Only image files (JPG, PNG, WEBP) are supported.'
      }));
      return;
    }

    // Step 3: Validate Size (Max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setModalState(prev => ({
        ...prev,
        isOpen: true,
        error: 'File size exceeds 5MB limit. Please choose a smaller image.'
      }));
      return;
    }

    // Step 4 & 5: Load into Image element for Dimension Validation & Canvas Metadata Stripping / Compression
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Step 4: Validate Dimensions (Min 100x100)
        if (img.width < 100 || img.height < 100) {
          setModalState(prev => ({
            ...prev,
            isOpen: true,
            error: 'Image dimensions too small. Minimum resolution is 100x100 pixels.'
          }));
          return;
        }

        // Step 5: Strip Metadata & Compress via HTML5 Canvas
        const canvas = document.createElement('canvas');
        const maxDim = 800; // Resize large photos to max 800px width/height for fast upload
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP / JPEG Blob (strips EXIF metadata)
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              setModalState(prev => ({ ...prev, error: 'Failed to compress image' }));
              return;
            }

            const previewUrl = URL.createObjectURL(blob);

            setModalState({
              isOpen: true,
              selectedFile: file,
              previewUrl,
              compressedBlob: blob,
              loading: false,
              deleting: false,
              error: null,
              successMsg: null
            });
          },
          'image/jpeg',
          0.85
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, []);

  // Step 7 - 10: Upload, Refresh Hero UI & Clean Storage
  const handleUpload = useCallback(async () => {
    if (!modalState.compressedBlob) return;

    setModalState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const formData = new FormData();
      formData.append('avatar', modalState.compressedBlob, modalState.selectedFile?.name || 'avatar.jpg');

      const res = await profileService.uploadAvatar(formData);
      const updatedUser = res.data?.data || res.data;

      if (setUser && updatedUser) {
        setUser({ ...user, avatar: updatedUser.avatar || updatedUser.data?.avatar });
      }

      setModalState(prev => ({
        ...prev,
        loading: false,
        successMsg: 'Profile photo updated successfully!'
      }));

      setTimeout(closeModal, 1500);
    } catch (err) {
      setModalState(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message || 'Failed to upload profile photo'
      }));
    }
  }, [modalState.compressedBlob, modalState.selectedFile, user, setUser, closeModal]);

  const handleDeleteAvatar = useCallback(async () => {
    setModalState(prev => ({ ...prev, deleting: true, error: null }));

    try {
      const res = await profileService.deleteAvatar();
      const updatedUser = res.data?.data || res.data;

      if (setUser) {
        setUser({ ...user, avatar: null });
      }

      setModalState(prev => ({
        ...prev,
        deleting: false,
        successMsg: 'Profile photo removed!'
      }));

      setTimeout(closeModal, 1500);
    } catch (err) {
      setModalState(prev => ({
        ...prev,
        deleting: false,
        error: err.response?.data?.message || err.message || 'Failed to remove profile photo'
      }));
    }
  }, [user, setUser, closeModal]);

  return {
    modalState,
    openModal,
    closeModal,
    handleFileSelect,
    handleUpload,
    handleDeleteAvatar
  };
};

export default useAvatarUpload;
