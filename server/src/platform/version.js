import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

let appVersion = '1.0.0';
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  appVersion = packageJson.version || '1.0.0';
} catch (err) {
  // fallback if package.json cannot be read
}

export const PLATFORM_VERSION = '1.0.0';
export const APPLICATION_VERSION = appVersion;
export const NODE_VERSION = process.version;
export const GIT_COMMIT = process.env.GIT_COMMIT || 'dev';
export const BUILD_TIME = process.env.BUILD_TIME || new Date().toISOString();
export const ENVIRONMENT = process.env.NODE_ENV || 'development';
export const API_VERSION = 'v1';
