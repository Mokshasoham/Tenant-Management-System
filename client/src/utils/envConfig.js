/**
 * Staging Safety & Environment Configuration Utility
 * 
 * Enforces strict environment isolation to prevent staging frontends from
 * inadvertently connecting to production backends or falling back to
 * unsafe production endpoints.
 */

export const PRODUCTION_BACKEND_HOST = 'tenant-management-backend-ohr6.onrender.com';
export const PRODUCTION_API_URL = `https://${PRODUCTION_BACKEND_HOST}/api`;

/**
 * Determines whether the current execution context is staging.
 * Checks environment flags (VITE_APP_ENV, MODE) and browser hostnames (e.g. Amplify staging branch).
 */
export function isStagingEnvironment(env = {}, hostname = '') {
  const appEnv = (env.VITE_APP_ENV || env.MODE || '').toLowerCase();
  const host = (hostname || '').toLowerCase();

  return (
    appEnv === 'staging' ||
    host.includes('staging') ||
    host.startsWith('staging.')
  );
}

/**
 * Validates a staging URL ensuring it is non-empty, well-formed, and strictly does NOT
 * point to the production backend host. Fails closed with a descriptive error.
 */
export function validateStagingUrl(url, context = 'API base URL') {
  if (!url || typeof url !== 'string' || !url.trim()) {
    throw new Error(`[StagingSafetyError] Staging configuration requires an explicit ${context}, but none was provided.`);
  }

  const trimmed = url.trim();

  if (trimmed.includes(PRODUCTION_BACKEND_HOST)) {
    throw new Error(`[StagingSafetyError] Unsafe staging configuration: ${context} points to production backend (${PRODUCTION_BACKEND_HOST}). Staging must be isolated.`);
  }

  try {
    const parsed = new URL(trimmed);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error(`[StagingSafetyError] Invalid protocol in ${context}: ${parsed.protocol}`);
    }
  } catch (err) {
    if (err.name === 'TypeError' || err.message.includes('Invalid URL')) {
      throw new Error(`[StagingSafetyError] Malformed staging ${context}: "${trimmed}". Must be a valid absolute HTTP(S) URL.`);
    }
    throw err;
  }

  return trimmed;
}

/**
 * Resolves the API base URL based on the environment and hostname.
 * 
 * Rules:
 * 1. In staging, requires a valid explicit VITE_API_BASE_URL and fails closed if missing,
 *    malformed, or pointing to production.
 * 2. In local development (localhost / 127.0.0.1), uses VITE_API_BASE_URL or defaults to http://localhost:5000/api.
 * 3. In production, uses explicit non-localhost VITE_API_BASE_URL, or defaults to the production backend.
 */
export function resolveApiBaseUrl(options = {}) {
  const env = options.env || (typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : {}) || {};
  const hostname = options.hostname !== undefined
    ? options.hostname
    : (typeof window !== 'undefined' && window.location ? window.location.hostname : '');

  const rawBase = env.VITE_API_BASE_URL;

  // Staging isolation guard
  if (isStagingEnvironment(env, hostname)) {
    const validated = validateStagingUrl(rawBase, 'VITE_API_BASE_URL');
    return validated.replace(/\/+$/, '');
  }

  // Local development
  if (!hostname || ['localhost', '127.0.0.1'].includes(hostname)) {
    return (rawBase || 'http://localhost:5000/api').replace(/\/+$/, '');
  }

  // Explicit non-localhost configuration in deployed environment
  if (rawBase && !rawBase.includes('localhost')) {
    return rawBase.replace(/\/+$/, '');
  }

  // Production fallback for deployed web clients
  return PRODUCTION_API_URL;
}

/**
 * Resolves the WebSocket server base URL. Fails closed under staging if API config is invalid.
 */
export function resolveSocketUrl(options = {}) {
  const apiBase = resolveApiBaseUrl(options);
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}

/**
 * Resolves the media / upload server base URL. Fails closed under staging if API config is invalid.
 */
export function resolveMediaBaseUrl(options = {}) {
  const apiBase = resolveApiBaseUrl(options);
  return apiBase.endsWith('/api') ? apiBase.slice(0, -4) : apiBase;
}
