/**
 * Centralized client-side utility to securely open or download files.
 * Handles fetching temporary signed S3/Local URLs from the backend and opening them in a new tab.
 */
export const openSecureFile = async (docUrl) => {
  if (!docUrl) return;

  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  const serverUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const token = localStorage.getItem('authToken');

  // Normalize legacy URLs containing /uploads/ by replacing the origin with the configured serverUrl
  let normalizedUrl = docUrl;
  if (docUrl.startsWith('http') && docUrl.includes('/uploads/')) {
    try {
      const parsed = new URL(docUrl);
      normalizedUrl = `${serverUrl.replace(/\/$/, '')}${parsed.pathname}${parsed.search}`;
    } catch (_) {}
  }

  try {
    // 1. Extract fileId from download path /api/files/download/:fileId (must be a 24-char hex ObjectId)
    let fileId = '';
    const downloadMatch = normalizedUrl.match(/\/api\/files\/download\/([a-f\d]{24})/i);
    if (downloadMatch) {
      fileId = downloadMatch[1];
    }

    let url = '';
    console.log("docUrl =", normalizedUrl);
    console.log("resolved fileId =", fileId);

    // Only fetch signed URL if we have a valid 24-character ObjectId
    if (fileId && /^[a-f\d]{24}$/i.test(fileId)) {
      console.log("request =", `${apiBase}/files/signed-url/${fileId}`);
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

    const cleanServerUrl = serverUrl.replace(/\/$/, '');

    if (url) {
      const cleanUrl = url.startsWith('/') ? url : '/' + url;
      const fullUrl = url.startsWith('http') ? url : `${cleanServerUrl}${cleanUrl}`;
      window.open(fullUrl, '_blank');
    } else {
      // Treat as a legacy URL or direct URL and open directly
      const cleanDocUrl = normalizedUrl.startsWith('/') ? normalizedUrl : '/' + normalizedUrl;
      const fallbackUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `${cleanServerUrl}${cleanDocUrl}`;
      console.log("Opening directly (fallbackUrl) =", fallbackUrl);
      window.open(fallbackUrl, '_blank');
    }
  } catch (err) {
    console.error('[openSecureFile] Failed to resolve secure URL:', err);
    const cleanServerUrl = serverUrl.replace(/\/$/, '');
    const cleanDocUrl = normalizedUrl.startsWith('/') ? normalizedUrl : '/' + normalizedUrl;
    const fallbackUrl = normalizedUrl.startsWith('http') ? normalizedUrl : `${cleanServerUrl}${cleanDocUrl}`;
    window.open(fallbackUrl, '_blank');
  }
};
