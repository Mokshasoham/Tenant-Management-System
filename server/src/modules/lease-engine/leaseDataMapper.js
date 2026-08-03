import config from '../../config/config.js';

/**
 * Maps live MongoDB domain entities (Lease, Property, Tenant, User, Booking)
 * into the strict LeaseRawInput format required by the Lease Document Engine.
 */
export async function buildLeaseEngineInput(lease, tenant, property, manager, options = {}) {
  const safeTenant = tenant || lease.tenant || {};
  const safeProperty = property || lease.property || {};
  const safeManager = manager || (safeProperty && safeProperty.manager) || {};

  // Construct financial breakdown
  const monthlyRent = lease.rentAmount || safeProperty.rentAmount || 0;
  const deposit = lease.depositAmount || (monthlyRent * 2) || 0;

  const lineItems = [
    ['Monthly Rent', `INR ${monthlyRent.toLocaleString('en-IN')}`],
    ['Security Deposit (Escrow)', `INR ${deposit.toLocaleString('en-IN')}`],
  ];

  if (lease.utilities) {
    if (lease.utilities.water) lineItems.push(['Water Utility', 'Included']);
    if (lease.utilities.electricity) lineItems.push(['Electricity Utility', 'Tenant Billed']);
    if (lease.utilities.gas) lineItems.push(['Gas Utility', 'Included']);
    if (lease.utilities.internet) lineItems.push(['High-Speed Internet', 'Included']);
  }

  // Calculate lease duration in months
  let duration = '12 Months';
  if (lease.startDate && lease.endDate) {
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const months = Math.round((end - start) / (1000 * 60 * 60 * 24 * 30.44));
    duration = `${months} Month${months > 1 ? 's' : ''}`;
  }

  // Format dates
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');

  // Signers list
  const tenantName = `${safeTenant.firstName || ''} ${safeTenant.lastName || ''}`.trim() || 'Tenant';
  const managerName = `${safeManager.firstName || ''} ${safeManager.lastName || ''}`.trim() || 'Property Manager';

  const signers = [
    {
      role: 'Tenant',
      name: tenantName,
      status: lease.signature ? 'Signed' : 'Pending',
      signedAt: lease.signedAt ? fmtDate(lease.signedAt) : undefined,
      signatureImage: lease.signature || undefined,
      audit: lease.signature ? {
        method: lease.signatureType || 'Digital Drawing',
        ip: lease.tenantSignatureIp || '127.0.0.1',
        time: lease.signedAt ? new Date(lease.signedAt).toISOString() : new Date().toISOString(),
        signer: lease.signedBy || tenantName,
      } : undefined,
    },
    {
      role: 'Property Manager',
      name: managerName,
      status: 'Signed',
      signedAt: fmtDate(lease.createdAt || new Date()),
      audit: {
        method: 'System Counter-Signature',
        ip: '127.0.0.1',
        time: new Date().toISOString(),
        signer: managerName,
      },
    },
  ];

  const termsList = lease.terms
    ? (Array.isArray(lease.terms) ? lease.terms : [lease.terms])
    : [
        'Tenant agrees to pay monthly rent in advance on or before the 1st day of each calendar month.',
        'The security deposit will be held in escrow and refunded within 14 business days after lease expiration.',
        'No unauthorized structural alterations or subletting without prior written consent from the landlord.',
        'Tenant shall maintain the property in a clean and sanitary condition throughout the tenancy term.',
      ];

  const baseUrl = config.APP_URL || process.env.APP_BASE_URL || 'http://localhost:3000';

  return {
    tenant: {
      name: tenantName,
      email: safeTenant.email || 'tenant@tms.com',
      phone: safeTenant.phone || '—',
      idType: safeTenant.kycType || 'National ID / Passport',
      idNumber: safeTenant._id ? `TEN-${safeTenant._id.toString().slice(-6).toUpperCase()}` : '—',
    },
    property: {
      name: safeProperty.name || 'Assigned Residence',
      address: safeProperty.address || 'Property Location Address',
      unit: safeProperty.unit || `Unit ${safeProperty._id?.toString()?.slice(-4)?.toUpperCase() || '101'}`,
      type: safeProperty.type || 'Residential Apartment',
      city: safeProperty.city || 'Metropolis',
    },
    manager: {
      name: managerName,
      email: safeManager.email || 'manager@tms.com',
      phone: safeManager.phone || '—',
    },
    owner: {
      name: safeProperty.ownerName || 'Property Owner',
    },
    financial: {
      monthlyRent: `INR ${monthlyRent.toLocaleString('en-IN')}`,
      deposit: `INR ${deposit.toLocaleString('en-IN')}`,
      maintenance: 'INR 0 / Month',
      lineItems,
    },
    duration,
    startDate: fmtDate(lease.startDate),
    endDate: fmtDate(lease.endDate),
    leaseStatus: lease.status === 'active' ? 'Signed' : 'Generated',
    leaseVersion: `v${options.documentVersion || lease.leaseVersion || 1}.0`,
    documentVersion: options.documentVersion || lease.leaseVersion || 1,
    signers,
    terms: termsList,
    branding: {
      companyName: 'Tenant Management System',
      primaryColor: '#059669',
    },
    verificationUrl: `${baseUrl}/verify/lease/${lease._id}`,
    generatedBy: options.generatedBy || 'System (Auto)',
  };
}
