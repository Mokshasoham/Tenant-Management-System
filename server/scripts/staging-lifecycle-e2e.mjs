import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';

const FRONTEND = (process.env.STAGING_FRONTEND_URL || 'https://staging.d1fq6q7ihzuzlq.amplifyapp.com').replace(/\/$/, '');
const API = (process.env.STAGING_API_BASE_URL || 'https://tenant-management-backend-staging.onrender.com/api').replace(/\/$/, '');
const marker = (process.env.GITHUB_RUN_ID || Date.now().toString()) + '-' + (process.env.GITHUB_RUN_ATTEMPT || '1') + '-' + crypto.randomBytes(3).toString('hex');
const outDir = path.resolve(process.env.E2E_ARTIFACT_DIR || 'artifacts/staging-lifecycle');
const report = {
  marker, startedAt: new Date().toISOString(), frontend: FRONTEND, backend: API,
  accounts: {}, property: null, booking: null, lease: null, checks: [], browserErrors: [], requestFailures: [],
  notes: ['Restricted to staging only.', 'No payment order or payment capture is attempted.', 'Passwords and bearer tokens are never written to the report or console.']
};
function check(id, ok, details = '') {
  report.checks.push({ id, passed: Boolean(ok), details: String(details).replace(/\s+/g, ' ').slice(0, 400) });
  console.log((ok ? 'PASS ' : 'FAIL ') + id + (details ? ' — ' + String(details).replace(/\s+/g, ' ').slice(0, 240) : ''));
}
const msg = e => e?.message || String(e);
async function shot(page, name) {
  try { await fs.mkdir(outDir, { recursive: true }); await page.screenshot({ path: path.join(outDir, name + '.png'), fullPage: true, animations: 'disabled', timeout: 15000 }); }
  catch (e) { report.notes.push('Screenshot ' + name + ' failed: ' + msg(e)); }
}
function diagnostics(page, label) {
  page.on('pageerror', e => report.browserErrors.push({ page: label, error: msg(e).slice(0, 600) }));
  page.on('requestfailed', r => {
    const u = r.url().split('?')[0];
    if (u.startsWith(FRONTEND) || u.startsWith(API)) report.requestFailures.push({ page: label, method: r.method(), url: u.slice(0, 250), error: (r.failure()?.errorText || 'failed').slice(0, 200) });
  });
}
async function api(route, opts = {}, token = null) {
  const headers = { Accept: 'application/json', ...(opts.headers || {}) };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(API + route, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body), signal: AbortSignal.timeout(45000) });
  const text = await res.text();
  let data; try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text.slice(0, 500) }; }
  if (!res.ok) { const e = new Error('HTTP ' + res.status + ' ' + route + ': ' + (data.message || data.error || text.slice(0, 180))); e.status = res.status; throw e; }
  return data;
}
const dataOf = r => r && r.data !== undefined ? r.data : r;

async function registerInUi(browser, account) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(12000); diagnostics(page, account.role + '-signup');
  try {
    await page.goto(FRONTEND + '/register', { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 25000 });
    await page.getByPlaceholder('John').fill(account.firstName);
    await page.getByPlaceholder('Doe').fill(account.lastName);
    await page.locator('input[type="email"]').fill(account.email);
    await page.locator('input[type="tel"]').fill(account.phone);
    const pw = page.locator('input[type="password"]'); await pw.nth(0).fill(account.password); await pw.nth(1).fill(account.password);
    await page.getByRole('button', { name: /next/i }).first().click();
    const roleBtn = page.getByRole('button', { name: account.role === 'manager' ? /continue as manager/i : /continue as tenant/i });
    await roleBtn.waitFor({ state: 'visible', timeout: 20000 }); await roleBtn.click();
    await page.waitForFunction(() => Boolean(localStorage.getItem('authToken')), null, { timeout: 30000 }).catch(() => {});
    const state = await page.evaluate(() => {
      let u = null; try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
      return { token: Boolean(localStorage.getItem('authToken')), id: u && (u._id || u.id), role: u && u.role };
    });
    if (!state.token || state.role !== account.role) throw new Error('Signup did not yield authenticated role=' + state.role);
    check(account.role + '.signup_ui', true, 'Signup form created the account and stored the expected role.');
    await shot(page, account.role + '-signup-complete');
    await context.close();
    return true;
  } catch (e) {
    check(account.role + '.signup_ui', false, msg(e)); await shot(page, account.role + '-signup-error');
    await context.close().catch(() => {}); return false;
  }
}
async function ensureAccount(browser, account) {
  const uiCreated = await registerInUi(browser, account);
  if (!uiCreated) {
    let created = false;
    try {
      await api('/auth/register', { method: 'POST', body: { firstName: account.firstName, lastName: account.lastName, email: account.email, password: account.password, role: account.role } });
      created = true;
    } catch (e) {
      if (![400, 409].includes(e.status)) throw e;
      report.notes.push(account.role + ' fallback signup reported an existing account; tried UI login next.');
    }
    check(account.role + '.signup_api_fallback', created, created ? 'Created account using staging signup API after UI signup failed.' : 'Account may already exist; testing UI login.');
  }
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage(); page.setDefaultTimeout(12000); diagnostics(page, account.role + '-login');
  await page.goto(FRONTEND + '/login', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 25000 });
  await page.locator('input[type="email"]').fill(account.email);
  await page.locator('input[type="password"]').first().fill(account.password);
  const loginForm = page.locator('form').filter({ has: page.locator('input[type="password"]') }).first();
  await loginForm.getByRole('button', { name: /sign in/i }).click();
  try {
    await page.waitForFunction(() => Boolean(localStorage.getItem('authToken')), null, { timeout: 30000 });
  } catch (error) {
    await shot(page, account.role + '-login-error');
    const errorText = await page.locator('form').innerText().catch(() => '');
    check(account.role + '.login_ui', false, msg(error) + ' | UI: ' + errorText);
    throw error;
  }
  const user = await page.evaluate(() => {
    let u = null; try { u = JSON.parse(localStorage.getItem('user') || 'null'); } catch {}
    return { token: Boolean(localStorage.getItem('authToken')), id: u && (u._id || u.id), role: u && u.role };
  });
  check(account.role + '.login_ui', user.token && user.role === account.role, 'Login UI returned role=' + user.role + ', token present=' + user.token);
  if (!user.token || user.role !== account.role) { await shot(page, account.role + '-login-error'); throw new Error('Unable to login via UI as ' + account.role); }
  const token = await page.evaluate(() => localStorage.getItem('authToken'));
  report.accounts[account.role] = { email: account.email, userId: user.id, role: user.role, signupVia: uiCreated ? 'ui' : 'api-fallback' };
  await shot(page, account.role + '-dashboard');
  return { context, page, token, user };
}
function futureDate(days) {
  const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + days);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
async function findProperty(token, name) {
  const result = await api('/properties?search=' + encodeURIComponent(name) + '&limit=100', {}, token);
  const d = dataOf(result); const rows = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : [];
  return rows.find(p => p && p.name === name) || rows.find(p => p && String(p.name || '').includes(name)) || null;
}
async function waitForProperty(token, name) {
  for (let i = 0; i < 8; i++) {
    const p = await findProperty(token, name).catch(() => null);
    if (p) return p;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return null;
}
async function createPropertyApi(token, name) {
  const result = await api('/properties', { method: 'POST', body: {
    name, address: 'Unit 701, Staging E2E Residency, Gachibowli', city: 'Hyderabad', state: 'Telangana', zipCode: '500032', country: 'India',
    type: 'apartment', bedrooms: 2, bathrooms: 2, squareFeet: 1100, rentAmount: 14500, depositAmount: 29000,
    furnishing: 'semi-furnished', amenities: ['Parking', 'Lift', 'Power Backup'],
    description: 'Automated staging-only end-to-end test listing. Not for a real tenancy.',
    location: { lat: 17.4401, lng: 78.3489 }, bookingType: 'paid', publishStatus: 'published'
  } }, token);
  const d = dataOf(result); return d && (d._id || d.id) ? d : d?.data || null;
}
async function createPropertyUi(manager, name) {
  const p = manager.page;
  try {
    await p.goto(FRONTEND + '/properties', { waitUntil: 'domcontentloaded', timeout: 45000 }); await shot(p, 'manager-properties-before-create');
    await p.getByRole('button', { name: /add property/i }).first().click({ timeout: 20000 });
    await p.getByText('Apartment / Flat', { exact: true }).first().click();
    await p.getByRole('button', { name: /^continue$/i }).last().click();
    await p.getByPlaceholder(/Skyline Luxury 2BHK Residency/i).fill(name);
    await p.getByPlaceholder('e.g. 25000').fill('14500');
    await p.getByPlaceholder('e.g. 50000').fill('29000');
    await p.getByText(/3\.\s*Location\s*&\s*Map/i).click({ timeout: 15000 });
    const addressA = p.getByPlaceholder(/Search address or enter street/i);
    const addressB = p.getByPlaceholder(/123 Main Street/i);
    if (await addressA.count()) await addressA.fill('Unit 701, Staging E2E Residency, Gachibowli, Hyderabad, Telangana 500032');
    else if (await addressB.count()) await addressB.fill('Unit 701, Staging E2E Residency, Gachibowli, Hyderabad, Telangana 500032');
    else throw new Error('Address input was not found on the Location tab.');
    const cityLabel = p.getByText('City', { exact: true }).last();
    if (await cityLabel.count()) {
      const cityInput = cityLabel.locator('xpath=..').locator('input').first();
      if (await cityInput.count()) await cityInput.fill('Hyderabad');
    }
    const stateLabel = p.getByText(/State\s*\*/i).last();
    if (await stateLabel.count()) {
      const stateSelect = stateLabel.locator('xpath=..').locator('select').first();
      if (await stateSelect.count()) await stateSelect.selectOption({ label: 'Telangana' }).catch(() => {});
    }
    await shot(p, 'manager-property-form-location');
    await p.getByRole('button', { name: /create\s*&\s*publish\s*property/i }).click({ timeout: 20000 });
    await p.waitForTimeout(1200); await shot(p, 'manager-property-create-result');
    return { ok: true };
  } catch (e) {
    await shot(p, 'manager-property-create-error');
    return { ok: false, error: msg(e) };
  }
}
async function main() {
  if (new URL(FRONTEND).hostname !== 'staging.d1fq6q7ihzuzlq.amplifyapp.com' || new URL(API).hostname !== 'tenant-management-backend-staging.onrender.com') throw new Error('Safety guard refused non-staging URLs.');
  await fs.mkdir(outDir, { recursive: true });
  const health = await api('/health'); check('backend.health', Boolean(health && health.success), 'Staging health endpoint succeeded.');
  const browser = await chromium.launch({ headless: true });
  try {
    const makePassword = () => 'TmsE2E@' + crypto.randomBytes(5).toString('hex') + '9a';
    const suffix = marker.replace(/[^a-z0-9]/gi, '');
    const managerAcct = { firstName: 'TMS E2E Manager', lastName: 'Test', email: 'tms.e2e.manager.' + suffix + '@example.com', phone: '+919876543210', password: makePassword(), role: 'manager' };
    const tenantAcct = { firstName: 'TMS E2E Tenant', lastName: 'Test', email: 'tms.e2e.tenant.' + suffix + '@example.com', phone: '+919876543211', password: makePassword(), role: 'tenant' };
    const manager = await ensureAccount(browser, managerAcct);
    const name = 'TMS E2E Rental ' + marker;
    const uiResult = await createPropertyUi(manager, name);
    let property = uiResult.ok ? await waitForProperty(manager.token, name) : null;
    if (!property) {
      check('manager.property_create_ui', false, uiResult.error || 'UI returned without the new listing appearing in the authenticated API.');
      property = await createPropertyApi(manager.token, name);
      check('manager.property_create_api_fallback', Boolean(property && (property._id || property.id)), 'Created published staging listing via API because UI flow failed or was not verifiable.');
    } else check('manager.property_create_ui', true, 'Created and queried the listing through manager UI/API.');
    if (!property || !(property._id || property.id)) throw new Error('Property creation failed via UI and API fallback.');
    const propertyId = String(property._id || property.id);
    report.property = { id: propertyId, name: property.name || name, rentAmount: property.rentAmount, depositAmount: property.depositAmount, city: property.city || 'not returned', createdThroughUi: Boolean(uiResult.ok && await findProperty(manager.token, name).catch(() => null)) };
    await manager.page.goto(FRONTEND + '/properties', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    const managerList = await manager.page.getByText(name, { exact: true }).first().isVisible().catch(() => false);
    check('manager.properties_list', managerList, 'Manager property list displays the test listing.'); await shot(manager.page, 'manager-properties-after-create');
    await manager.page.goto(FRONTEND + '/manager/properties/' + propertyId, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await manager.page.waitForTimeout(1000);
    const managerDetail = await manager.page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
    check('manager.property_detail_route', managerDetail, 'Manager property detail route renders listing content.'); await shot(manager.page, 'manager-property-detail');

    const tenant = await ensureAccount(browser, tenantAcct);
    await tenant.page.goto(FRONTEND + '/browse', { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await tenant.page.waitForTimeout(1200);
    const browseVisible = await tenant.page.getByText(name, { exact: true }).first().isVisible().catch(() => false);
    check('tenant.browse_listing', browseVisible, 'Tenant browse page shows the manager test property.'); await shot(tenant.page, 'tenant-browse');
    await tenant.page.goto(FRONTEND + '/properties/' + propertyId, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await tenant.page.waitForTimeout(1200);
    const tenantDetail = await tenant.page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
    check('tenant.property_detail_route', tenantDetail, 'Tenant property details page renders the listing.'); await shot(tenant.page, 'tenant-property-detail-before-booking');
    const dateFields = tenant.page.locator('#booking-card input[type="date"]');
    if (await dateFields.count() < 2) throw new Error('Booking date fields missing from tenant property details.');
    await dateFields.nth(0).fill(futureDate(14)); await dateFields.nth(1).fill(futureDate(45));
    await tenant.page.locator('#booking-card').getByRole('button', { name: /proceed to book|submit free booking/i }).last().click();
    await tenant.page.getByText(/Booking Request Submitted!/i).waitFor({ state: 'visible', timeout: 25000 }).catch(() => {});
    await shot(tenant.page, 'tenant-booking-submit-result');
    const mine = dataOf(await api('/bookings/my', {}, tenant.token));
    const bookings = Array.isArray(mine) ? mine : [];
    const booking = bookings.find(b => String(b.property?._id || b.property || '') === propertyId && ['pending', 'approved'].includes(b.status));
    const uiSuccess = await tenant.page.getByText(/Booking Request Submitted!/i).isVisible().catch(() => false);
    check('tenant.booking_request_ui', Boolean(booking && uiSuccess), 'UI success banner=' + uiSuccess + '; persisted matching booking=' + Boolean(booking));
    if (!booking) throw new Error('Booking request did not persist for tenant/property.');
    report.booking = { id: String(booking._id || booking.id), propertyId, status: booking.status, paymentStatus: booking.paymentStatus };

    const mgrBookings = dataOf(await api('/bookings/manager', {}, manager.token));
    const managerCanSee = Array.isArray(mgrBookings) && mgrBookings.some(b => String(b._id || b.id) === report.booking.id);
    check('manager.booking_inbox_api', managerCanSee, 'Manager bookings endpoint includes tenant request.');
    if (!managerCanSee) throw new Error('Manager bookings API cannot see tenant booking.');

    const approval = dataOf(await api('/bookings/' + report.booking.id + '/approve', { method: 'PUT', body: {} }, manager.token));
    const afterApproval = approval && approval._id ? approval : approval?.data || approval;
    check('manager.booking_approval', Boolean(afterApproval && afterApproval.status === 'approved'), 'Manager approval status=' + (afterApproval && afterApproval.status));
    report.booking.statusAfterApproval = afterApproval && afterApproval.status;
    report.booking.paymentStatusAfterApproval = afterApproval && afterApproval.paymentStatus;
    const detail = dataOf(await api('/bookings/' + report.booking.id, {}, manager.token));
    const lease = detail && (detail.linkedLease || detail.lease);
    report.lease = lease ? { id: String(lease._id || lease.id), status: lease.status } : null;
    check('booking.lease_created', Boolean(lease && lease._id && lease.status === 'pending'), lease ? 'Approval created lease status=' + lease.status : 'No linked lease returned after approval.');
    check('booking.no_payment_captured', Boolean(afterApproval && afterApproval.paymentStatus !== 'paid'), 'Stopped before any payment order or capture.');
    await manager.page.goto(FRONTEND + '/bookings/' + report.booking.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await manager.page.waitForTimeout(1000); await shot(manager.page, 'manager-booking-details-after-approval');
    const mgrBookingUi = await manager.page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
    check('manager.booking_details_ui', mgrBookingUi, 'Manager booking details view rendered the property.');
    await tenant.page.goto(FRONTEND + '/bookings/' + report.booking.id, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await tenant.page.waitForTimeout(1000); await shot(tenant.page, 'tenant-booking-status-after-approval');
    const tenantBookingUi = await tenant.page.getByText(name, { exact: false }).first().isVisible().catch(() => false);
    check('tenant.booking_status_ui', tenantBookingUi, 'Tenant booking status view rendered the property.');
    await tenant.page.setViewportSize({ width: 390, height: 844 });
    await tenant.page.goto(FRONTEND + '/properties/' + propertyId, { waitUntil: 'domcontentloaded', timeout: 45000 }).catch(() => {});
    await tenant.page.waitForTimeout(900); await shot(tenant.page, 'tenant-property-detail-mobile');
    const sizes = await tenant.page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth })).catch(() => null);
    check('tenant.mobile_no_horizontal_overflow', Boolean(sizes && sizes.document <= sizes.viewport + 2), JSON.stringify(sizes));
    check('browser.no_uncaught_page_errors', report.browserErrors.length === 0, report.browserErrors.length + ' uncaught page error(s) captured.');
  } finally { await browser.close().catch(() => {}); }
}
try { await main(); }
catch (error) { report.fatalError = msg(error); console.error('STAGING E2E FATAL: ' + report.fatalError); }
finally {
  report.finishedAt = new Date().toISOString();
  report.success = !report.fatalError && report.checks.every(c => c.passed);
  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, 'staging-lifecycle-report.json'), JSON.stringify(report, null, 2), 'utf8');
  const failed = report.checks.filter(c => !c.passed);
  console.log('\n=== STAGING LIFECYCLE SUMMARY ===');
  console.log('Success: ' + report.success);
  console.log('Manager: ' + (report.accounts.manager?.email || 'not created'));
  console.log('Tenant: ' + (report.accounts.tenant?.email || 'not created'));
  console.log('Property: ' + (report.property?.name || 'not created'));
  console.log('Property ID: ' + (report.property?.id || 'not created'));
  console.log('Booking ID: ' + (report.booking?.id || 'not created'));
  console.log('Checks: ' + report.checks.filter(c => c.passed).length + '/' + report.checks.length + ' passed');
  console.log('Failures: ' + JSON.stringify(failed.map(c => ({ id: c.id, details: c.details }))));
  if (!report.success) process.exitCode = 1;
}
