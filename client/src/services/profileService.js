import apiClient from './api';

export const profileService = {
  getProfile: () => apiClient.get('/auth/profile'),
  updateProfile: (data) => apiClient.put('/auth/profile', data),
  uploadAvatar: (formData) => apiClient.post('/auth/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteAvatar: () => apiClient.delete('/auth/avatar'),
  downloadProfilePDF: (userData) => {
    // Generate clean printable PDF summary report window
    const printWin = window.open('', '_blank', 'width=800,height=900');
    if (!printWin) return;
    
    const fullName = `${userData?.firstName || ''} ${userData?.lastName || ''}`.trim() || 'Tenant User';
    const email = userData?.email || 'N/A';
    const phone = userData?.phone || 'N/A';
    const role = (userData?.role || 'Tenant').toUpperCase();
    const memberSince = userData?.createdAt ? new Date(userData.createdAt).toLocaleDateString() : 'N/A';
    const kycStatus = (userData?.kycStatus || 'Unverified').toUpperCase();

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tenant Profile Summary - ${fullName}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background: #fff; }
            .header { border-bottom: 2px solid #0f172a; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
            .logo { font-size: 24px; font-weight: 900; color: #0284c7; letter-spacing: -0.5px; }
            .badge { background: #e0f2fe; color: #0369a1; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
            .card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; }
            .card-title { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 12px; }
            .field-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; }
            .field-val { font-size: 14px; font-weight: 600; color: #0f172a; margin-bottom: 10px; }
            .footer { border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 11px; color: #94a3b8; text-align: center; margin-top: 40px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="logo">TENANT MANAGEMENT SYSTEM</div>
              <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Official Account Verification Summary</div>
            </div>
            <div class="badge">${role} • ${kycStatus}</div>
          </div>

          <div class="grid">
            <div class="card">
              <div class="card-title">Personal Information</div>
              <div class="field-label">Full Name</div>
              <div class="field-val">${fullName}</div>
              <div class="field-label">Preferred Name</div>
              <div class="field-val">${userData?.preferredName || 'N/A'}</div>
              <div class="field-label">Gender / DOB</div>
              <div class="field-val">${userData?.gender || 'N/A'} • ${userData?.dob || 'N/A'}</div>
              <div class="field-label">Occupation</div>
              <div class="field-val">${userData?.occupation || 'N/A'}</div>
            </div>

            <div class="card">
              <div class="card-title">Contact & Security</div>
              <div class="field-label">Primary Email</div>
              <div class="field-val">${email}</div>
              <div class="field-label">Primary Phone</div>
              <div class="field-val">${phone}</div>
              <div class="field-label">Member Since</div>
              <div class="field-val">${memberSince}</div>
              <div class="field-label">Two-Factor Auth</div>
              <div class="field-val">${userData?.twoFactorEnabled ? 'Enabled' : 'Disabled'}</div>
            </div>
          </div>

          <div class="card" style="margin-bottom: 30px;">
            <div class="card-title">Address & Emergency Details</div>
            <div class="grid" style="grid-template-columns: 1fr 1fr; margin-bottom: 0;">
              <div>
                <div class="field-label">Current Address</div>
                <div class="field-val">${userData?.address?.currentAddress || 'N/A'}</div>
                <div class="field-label">City / State / Postal</div>
                <div class="field-val">${userData?.address?.city || 'N/A'}, ${userData?.address?.state || 'N/A'} ${userData?.address?.postalCode || ''}</div>
              </div>
              <div>
                <div class="field-label">Emergency Contact Name</div>
                <div class="field-val">${userData?.emergencyContact?.name || 'N/A'}</div>
                <div class="field-label">Emergency Phone & Relation</div>
                <div class="field-val">${userData?.emergencyContact?.phone || 'N/A'} (${userData?.emergencyContact?.relationship || 'N/A'})</div>
              </div>
            </div>
          </div>

          <div class="footer">
            Generated automatically on ${new Date().toLocaleString()} • Confirmed System Credentials
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  }
};

export default profileService;
