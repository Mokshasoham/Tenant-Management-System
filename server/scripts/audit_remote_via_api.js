/**
 * Safe staging-only collection-count audit.
 *
 * Credentials must be supplied with AUDIT_EMAIL and AUDIT_PASSWORD environment
 * variables. This script intentionally does not print tokens, record payloads,
 * individual customer records, payment identifiers, or database contents.
 */
const DEFAULT_STAGING_API = 'https://tenant-management-backend-staging.onrender.com/api';
const API_BASE_URL = (process.env.STAGING_API_BASE_URL || DEFAULT_STAGING_API).replace(/\/+$/, '');
const ALLOWED_HOST = 'tenant-management-backend-staging.onrender.com';

function assertStagingOnly() {
  const target = new URL(API_BASE_URL);
  if (target.protocol !== 'https:' || target.hostname !== ALLOWED_HOST || target.pathname.replace(/\/$/, '') !== '/api') {
    throw new Error('Safety guard: this audit script can target only the staging backend API.');
  }
}

async function requestJson(route, { method = 'GET', body, token } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE_URL}${route}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(`Staging request failed: ${method} ${route} returned HTTP ${response.status}.`);
  }
  return payload;
}

function countFrom(payload) {
  if (Number.isFinite(payload?.pagination?.total)) return payload.pagination.total;
  const rows = Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.data?.items)
      ? payload.data.items
      : [];
  return rows.length;
}

async function runAudit() {
  assertStagingOnly();
  const email = process.env.AUDIT_EMAIL?.trim();
  const password = process.env.AUDIT_PASSWORD;
  if (!email || !password) {
    throw new Error('Set AUDIT_EMAIL and AUDIT_PASSWORD in your shell environment before running this audit. Credentials are never read from source code.');
  }

  const login = await requestJson('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  const token = login?.data?.token;
  if (!login?.success || !token) {
    throw new Error('Staging audit authentication failed. The account must have permission to view the requested aggregate counts.');
  }

  const endpoints = [
    ['Users', '/users/admin/all'],
    ['Properties', '/properties'],
    ['Payments', '/payments'],
    ['Leases', '/leases'],
  ];

  console.log('Staging collection count audit (no customer records are printed):');
  for (const [label, route] of endpoints) {
    const payload = await requestJson(route, { token });
    if (!payload?.success) {
      console.log(`${label}: unavailable to this account`);
      continue;
    }
    console.log(`${label}: ${countFrom(payload)}`);
  }
}

runAudit().catch((error) => {
  console.error(error.message || 'Staging audit failed.');
  process.exitCode = 1;
});
