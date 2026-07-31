/**
 * Centralized client-side utility to securely open or download files.
 * Handles fetching temporary signed S3/Local URLs from the backend and opening them in a new tab.
 */
export const openSecureFile = async (docUrl) => {
  if (!docUrl) return;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  try {
    // 1. Extract fileId from local download path /api/files/download/:fileId
    let fileId = '';
    const downloadMatch = docUrl.match(/\/api\/files\/download\/([a-f\d]{24})/i);
    if (downloadMatch) {
      fileId = downloadMatch[1];
    }

    let url = '';
    console.log("docUrl =", docUrl);
    console.log("resolved fileId =", fileId);
    console.log("request =", `${apiBase}/files/signed-url/${fileId}`);
    if (fileId) {
      const res = await fetch(`${apiBase}/files/signed-url/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          url = data.url;
        }
      }
    }

    // 2. If no fileId (e.g., direct S3 URL or legacy URL), resolve by query param
    if (!url) {
      const encodedUrl = encodeURIComponent(docUrl);
      const res = await fetch(`${apiBase}/files/signed-url/resolve?url=${encodedUrl}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.url) {
          url = data.url;
        }
      }
    }

    const cleanServerUrl = serverUrl.replace(/\/$/, '');

    if (url) {
      const cleanUrl = url.startsWith('/') ? url : '/' + url;
      const fullUrl = url.startsWith('http') ? url : `${cleanServerUrl}${cleanUrl}`;
      window.open(fullUrl, '_blank');
    } else {
      // Graceful fallback to original URL (authenticated query redirection handled by server if applicable)
      const cleanDocUrl = docUrl.startsWith('/') ? docUrl : '/' + docUrl;
      const fallbackUrl = docUrl.startsWith('http') ? docUrl : `${cleanServerUrl}${cleanDocUrl}`;
      window.open(fallbackUrl, '_blank');
    }
  } catch (err) {
    console.error('[openSecureFile] Failed to resolve secure URL:', err);
    const cleanServerUrl = serverUrl.replace(/\/$/, '');
    const cleanDocUrl = docUrl.startsWith('/') ? docUrl : '/' + docUrl;
    const fallbackUrl = docUrl.startsWith('http') ? docUrl : `${cleanServerUrl}${cleanDocUrl}`;
    window.open(fallbackUrl, '_blank');
  }
};
