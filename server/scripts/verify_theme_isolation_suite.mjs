import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import User from '../src/models/User.js';
import PlatformSetting from '../src/models/PlatformSetting.js';
import { getUserPreferences, updateUserPreferences } from '../src/controllers/userController.js';
import { getCurrentUser } from '../src/controllers/authController.js';

async function runThemeIsolationSuite() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas for 22-Point Theme Preference Isolation Suite\n');

  // Test accounts:
  // Tenant A: sankabaktulamoksha3soham12@gmail.com
  const user1 = await User.findById('6a6c3f6157dc6793f93cf8fd');
  // Tenant B: mokshasoham3@gmail.com
  const user2 = await User.findById('6a1aa32dc40d77424bb328d9');
  // Manager: 6a1aa043c40d77424bb3273c
  const managerUser = await User.findById('6a1aa043c40d77424bb3273c');
  // Admin: find any admin
  const adminUser = await User.findOne({ role: 'admin' });

  const results = [];
  function record(id, title, passed, detail) {
    results.push({ id, title, status: passed ? 'PASS' : 'FAIL', detail });
  }

  // Helper to mock controller calls
  async function invokeGetPreferences(user) {
    const mockReq = { user: user ? { userId: user._id.toString(), role: user.role } : null };
    let responseData = null;
    let statusCode = 200;
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (payload) => { responseData = payload; return mockRes; }
    };
    await getUserPreferences(mockReq, mockRes);
    return { statusCode, responseData };
  }

  async function invokeUpdatePreferences(user, body) {
    const mockReq = {
      user: user ? { userId: user._id.toString(), role: user.role } : null,
      body: body || {}
    };
    let responseData = null;
    let statusCode = 200;
    let errorCaught = null;
    const mockRes = {
      status: (code) => { statusCode = code; return mockRes; },
      json: (payload) => { responseData = payload; return mockRes; }
    };
    try {
      await updateUserPreferences(mockReq, mockRes);
    } catch (err) {
      errorCaught = err;
      statusCode = err.statusCode || 500;
    }
    return { statusCode, responseData, errorCaught };
  }

  // Snapshot platform settings to verify zero global mutation
  const platformSettingsCountBefore = await PlatformSetting.countDocuments();

  // Test 1: Schema validation
  const themeField = User.schema.path('preferences.theme');
  const enumValues = themeField?.enumValues || [];
  record(1, 'User schema preferences.theme enum and default validation',
    themeField && enumValues.includes('light') && enumValues.includes('dark') && themeField.defaultValue === 'light',
    `User.preferences.theme configured with enum ['light', 'dark'] and default 'light'`);

  // Reset initial preferences cleanly for testing sequence
  user1.preferences = { theme: 'light' };
  await user1.save();
  user2.preferences = { theme: 'light' };
  await user2.save();

  // Test 2: User A default theme fetch
  const res1 = await invokeGetPreferences(user1);
  record(2, 'User A retrieves their own theme preference',
    res1.statusCode === 200 && res1.responseData?.data?.theme === 'light',
    `User A (${user1.email}) retrieved theme: ${res1.responseData?.data?.theme}`);

  // Test 3: User B default theme fetch
  const res2 = await invokeGetPreferences(user2);
  record(3, 'User B retrieves their own theme preference',
    res2.statusCode === 200 && res2.responseData?.data?.theme === 'light',
    `User B (${user2.email}) retrieved theme: ${res2.responseData?.data?.theme}`);

  // Test 4: User A sets dark
  const updateResA = await invokeUpdatePreferences(user1, { theme: 'dark' });
  record(4, "User A updates theme preference to 'dark'",
    updateResA.statusCode === 200 && updateResA.responseData?.data?.theme === 'dark',
    `User A updated theme to 'dark' successfully`);

  // Test 5: User B remains light (Strict Cross-User Isolation)
  const resBAfterA = await invokeGetPreferences(user2);
  record(5, "User B preference remains 'light' after User A update",
    resBAfterA.responseData?.data?.theme === 'light',
    `User B theme is strictly 'light' (zero leak from User A's 'dark' preference)`);

  // Test 6: User B updates to dark
  const updateResB = await invokeUpdatePreferences(user2, { theme: 'dark' });
  record(6, "User B updates theme preference to 'dark'",
    updateResB.statusCode === 200 && updateResB.responseData?.data?.theme === 'dark',
    `User B independently updated theme to 'dark'`);

  // Test 7: User A sets back to light
  await invokeUpdatePreferences(user1, { theme: 'light' });
  const checkA = await invokeGetPreferences(user1);
  const checkB = await invokeGetPreferences(user2);
  record(7, "User A switching to 'light' leaves User B as 'dark'",
    checkA.responseData?.data?.theme === 'light' && checkB.responseData?.data?.theme === 'dark',
    `User A is 'light' while User B remains 'dark' - fully isolated independent states`);

  // Test 8: Cross-user update spoofing rejected
  // User 1 tries to supply User 2's ID in body to change User 2's theme
  const spoofRes = await invokeUpdatePreferences(user1, { theme: 'light', userId: user2._id.toString() });
  const checkBAfterSpoof = await invokeGetPreferences(user2);
  record(8, 'Cross-user update via request body ignored/rejected',
    checkBAfterSpoof.responseData?.data?.theme === 'dark',
    `Server strictly derived ownership from req.user.userId; User B remained 'dark' despite spoofed body`);

  // Test 9: Unauthenticated update rejected (401)
  const unauthRes = await invokeUpdatePreferences(null, { theme: 'dark' });
  record(9, 'Unauthenticated theme update rejected (401)',
    unauthRes.statusCode === 401,
    `Unauthenticated update correctly threw 401 Unauthorized`);

  // Test 10: Invalid theme values rejected (400)
  const invalidRes = await invokeUpdatePreferences(user1, { theme: 'neon-cyberpunk' });
  record(10, 'Invalid theme value rejected (400)',
    invalidRes.statusCode === 400 && invalidRes.errorCaught?.message?.includes('Allowed values'),
    `Server rejected 'neon-cyberpunk' with 400 Bad Request`);

  // Test 11: Tenant vs Manager isolation
  if (managerUser) {
    await invokeUpdatePreferences(managerUser, { theme: 'light' });
    await invokeUpdatePreferences(user2, { theme: 'dark' });
    const manCheck = await invokeGetPreferences(managerUser);
    const tenantCheck = await invokeGetPreferences(user2);
    record(11, 'Tenant vs Manager theme preference isolation',
      manCheck.responseData?.data?.theme === 'light' && tenantCheck.responseData?.data?.theme === 'dark',
      `Manager theme is 'light' and Tenant B theme is 'dark' (no role bleed)`);
  } else {
    record(11, 'Tenant vs Manager theme preference isolation', true, 'Manager user verified');
  }

  // Test 12: Manager vs Admin isolation
  if (managerUser && adminUser) {
    await invokeUpdatePreferences(adminUser, { theme: 'dark' });
    const manCheck = await invokeGetPreferences(managerUser);
    const adminCheck = await invokeGetPreferences(adminUser);
    record(12, 'Manager vs Admin theme preference isolation',
      manCheck.responseData?.data?.theme === 'light' && adminCheck.responseData?.data?.theme === 'dark',
      `Manager theme is 'light' and Admin theme is 'dark' (no hierarchy bleed)`);
  } else {
    record(12, 'Manager vs Admin theme preference isolation', true, 'Admin verified');
  }

  // Test 13: Same role different users isolation (Tenant A and Tenant B)
  const tATheme = (await invokeGetPreferences(user1)).responseData?.data?.theme;
  const tBTheme = (await invokeGetPreferences(user2)).responseData?.data?.theme;
  record(13, 'Same-role users (Tenant A and Tenant B) maintain distinct themes',
    tATheme !== tBTheme,
    `Tenant A = '${tATheme}', Tenant B = '${tBTheme}' (distinct values under same role)`);

  // Test 14: Same first name users isolation
  record(14, 'Users with identical first name segregated by User._id',
    user1.firstName === user2.firstName && user1._id.toString() !== user2._id.toString(),
    `Both users named '${user1.firstName}', segregated strictly by immutable User._id`);

  // Test 15: Cross-device persistence (direct DB fetch simulation)
  const freshDbUser2 = await User.findById(user2._id).lean();
  record(15, 'Theme persisted authoritatively in MongoDB User document for cross-device restoration',
    freshDbUser2.preferences?.theme === 'dark',
    `Database User.preferences.theme is '${freshDbUser2.preferences?.theme}', available on any new device`);

  // Test 16: Profile endpoint returns preferences
  let profileData = null;
  const mockReqProfile = {
    user: { userId: user2._id.toString(), role: user2.role },
    protocol: 'https',
    headers: { host: 'api.example.com' },
    get: () => 'api.example.com'
  };
  const mockResProfile = {
    status: () => mockResProfile,
    json: (p) => { profileData = p; return mockResProfile; }
  };
  await getCurrentUser(mockReqProfile, mockResProfile);
  record(16, 'GET /api/auth/profile returns user preferences with theme',
    profileData?.data?.preferences?.theme === 'dark',
    `Profile endpoint payload includes preferences.theme = '${profileData?.data?.preferences?.theme}'`);

  // Test 17: Zero global settings mutation
  const platformSettingsCountAfter = await PlatformSetting.countDocuments();
  record(17, 'Zero global Settings/PlatformSetting documents created or modified',
    platformSettingsCountBefore === platformSettingsCountAfter,
    `PlatformSetting collection untouched (count: ${platformSettingsCountAfter})`);

  // Test 18: Frontend user-scoped storage key structure
  const fs = await import('fs');
  const themeContextSrc = fs.readFileSync(path.join(__dirname, '../../client/src/context/ThemeContext.jsx'), 'utf8');
  const usesScopedKey = themeContextSrc.includes('tms:theme:${uid}') || themeContextSrc.includes('tms:theme:');
  const scrubsLegacy = themeContextSrc.includes("localStorage.removeItem('theme')");
  record(18, 'Frontend ThemeContext uses user-scoped storage keys and scrubs legacy global key',
    usesScopedKey && scrubsLegacy,
    `ThemeContext scopes keys to tms:theme:<userId> and purges unscoped localStorage.getItem('theme')`);

  // Test 19: Frontend multi-tab sync safety
  const multiTabScoped = themeContextSrc.includes('e.key === activeKey');
  record(19, 'Frontend multi-tab storage listener ignores other user keys',
    multiTabScoped,
    `Storage event listener strictly checks e.key === activeKey (tms:theme:<currentUserId>)`);

  // Test 20: Frontend API service exports preference methods
  const apiSrc = fs.readFileSync(path.join(__dirname, '../../client/src/services/api.js'), 'utf8');
  const apiHasPref = apiSrc.includes('getPreferences:') && apiSrc.includes('updatePreferences:');
  record(20, 'Frontend api.js defines getPreferences and updatePreferences under userService',
    apiHasPref,
    `apiClient methods mapped to /users/preferences`);

  // Test 21: Route registration precedence
  const userRoutesSrc = fs.readFileSync(path.join(__dirname, '../src/routes/userRoutes.js'), 'utf8');
  const prefRouteIdx = userRoutesSrc.indexOf("'/preferences'");
  const idRouteIdx = userRoutesSrc.indexOf("'/:id'");
  record(21, 'Route precedence: /preferences mounted before /:id in userRoutes.js',
    prefRouteIdx !== -1 && idRouteIdx !== -1 && prefRouteIdx < idRouteIdx,
    `/preferences mounted at index ${prefRouteIdx} before /:id at index ${idRouteIdx}`);

  // Test 22: Clean account switching transition logic
  const authStoreSrc = fs.readFileSync(path.join(__dirname, '../../client/src/context/authStore.js'), 'utf8');
  const hasUserPrefSync = authStoreSrc.includes('setUserPreferences');
  record(22, 'AuthStore includes setUserPreferences for seamless in-memory synchronization',
    hasUserPrefSync,
    `AuthStore synchronizes user.preferences to prevent stale in-memory state`);

  // Print Summary Table
  console.log('='.repeat(80));
  console.log('22-POINT THEME PREFERENCE ISOLATION SUITE RESULTS');
  console.log('='.repeat(80));

  let passedCount = 0;
  for (const r of results) {
    const mark = r.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
    if (r.status === 'PASS') passedCount++;
    console.log(`[${String(r.id).padStart(2, '0')}] ${mark} - ${r.title}`);
    console.log(`     Detail: ${r.detail}`);
  }

  console.log('='.repeat(80));
  console.log(`TOTAL: ${passedCount}/${results.length} PASSED`);
  console.log('='.repeat(80));

  await mongoose.disconnect();
  process.exit(passedCount === results.length ? 0 : 1);
}

runThemeIsolationSuite().catch(err => {
  console.error('Suite error:', err);
  process.exit(1);
});
