import apiClient from '../services/apiClient';

/**
 * Centralized client-side utility to securely open or download files.
 * Handles fetching temporary signed S3/Local URLs from the backend and opening them in a new tab.
 */
export const openSecureFile = async (docUrl) => {
  if (!docUrl) return;

  try {
    let fileId = '';
    const downloadMatch = docUrl.match(/\/api\/files\/download\/([a-f\d]{24})/i);
    if (downloadMatch) {
      fileId = downloadMatch[1];
    } else if (/^[a-f\d]{24}$/i.test(docUrl)) {
      fileId = docUrl;
    }

    let url = '';

    if (fileId && /^[a-f\d]{24}$/i.test(fileId)) {
      const res = await apiClient.get(`/files/signed-url/${fileId}`);
      const data = res?.data || res;
      if (data?.success && data?.url) {
        url = data.url;
      }
    } else if (docUrl.startsWith('http://') || docUrl.startsWith('https://')) {
      url = docUrl;
    }

    if (url) {
      // If it's a relative API download URL, prepend backend base URL
      if (!url.startsWith('http')) {
        const baseURL = apiClient.defaults.baseURL || '';
        const serverOrigin = baseURL.endsWith('/api') ? baseURL.slice(0, -4) : baseURL;
        const cleanServer = (serverOrigin || window.location.origin).replace(/\/$/, '');
        const cleanPath = url.startsWith('/') ? url : '/' + url;
        url = `${cleanServer}${cleanPath}`;
      }
      window.open(url, '_blank');
    } else {
      console.error('[openSecureFile] Failed to resolve secure URL for:', docUrl);
      alert('Access Denied: You do not have permission to view this document.');
    }
  } catch (err) {
    console.error('[openSecureFile] Failed to resolve secure URL:', err);
    const msg = err?.message || err?.error?.message || err?.response?.data?.message || 'Access Denied: You do not have permission to view this document.';
    alert(msg);
  }
};

