import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translations } from '../../../client/src/utils/translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TMS Complete Multilingual System & 8-Language Coverage Tests', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];
  const namespaces = [
    'nav', 'common', 'auth', 'dashboard', 'property',
    'booking', 'lease', 'payment', 'maintenance', 'technician',
    'notification', 'people', 'verification', 'settings', 'errors'
  ];

  test('1. All 8 required languages are present in the translations registry', () => {
    expect(Object.keys(translations).sort()).toEqual(supportedLanguages.slice().sort());
  });

  test('2. Every language contains all 15 required core namespaces', () => {
    for (const lang of supportedLanguages) {
      const langDict = translations[lang];
      expect(langDict).toBeDefined();
      for (const ns of namespaces) {
        expect(langDict[ns]).toBeDefined();
        expect(typeof langDict[ns]).toBe('object');
      }
    }
  });

  test('3. Exact 100% key parity across all 8 languages (no missing or empty keys)', () => {
    const enDict = translations['en'];
    let totalKeysCount = 0;

    for (const ns of namespaces) {
      const enKeys = Object.keys(enDict[ns]);
      totalKeysCount += enKeys.length;

      for (const lang of supportedLanguages) {
        const langDict = translations[lang];
        for (const key of enKeys) {
          const val = langDict[ns][key];
          expect(val).toBeDefined();
          expect(typeof val).toBe('string');
          expect(val.trim().length).toBeGreaterThan(0);
        }
      }
    }

    // Must have at least 400 keys in the comprehensive system
    expect(totalKeysCount).toBeGreaterThanOrEqual(400);
  });

  test('4. Dynamic interpolation placeholders {{param}} must be strictly consistent across all languages', () => {
    const enDict = translations['en'];
    const placeholderRegex = /\{\{([^}]+)\}\}/g;
    let placeholdersFound = 0;

    for (const ns of namespaces) {
      for (const [key, enVal] of Object.entries(enDict[ns])) {
        const enMatches = Array.from(enVal.matchAll(placeholderRegex), m => m[1]).sort();
        if (enMatches.length > 0) {
          placeholdersFound++;
          for (const lang of supportedLanguages) {
            const targetVal = translations[lang][ns][key];
            const targetMatches = Array.from(targetVal.matchAll(placeholderRegex), m => m[1]).sort();
            expect(targetMatches).toEqual(enMatches);
          }
        }
      }
    }

    expect(placeholdersFound).toBeGreaterThanOrEqual(15);
  });

  test('5. Non-English translations must be authentic (not mere copies of English)', () => {
    const enDict = translations['en'];
    const nonEnglish = supportedLanguages.filter(l => l !== 'en');

    for (const lang of nonEnglish) {
      let identicalToEnglishCount = 0;
      let totalChecked = 0;

      for (const ns of namespaces) {
        for (const [key, enVal] of Object.entries(enDict[ns])) {
          totalChecked++;
          const targetVal = translations[lang][ns][key];
          if (targetVal === enVal) {
            identicalToEnglishCount++;
          }
        }
      }

      // Less than 5% of strings can be identical (e.g. acronyms like "SMS", "QR", "TMS", or English borrow words)
      const identicalRatio = identicalToEnglishCount / totalChecked;
      expect(identicalRatio).toBeLessThan(0.05);
    }
  });

  test('6. Indian languages must use appropriate native scripts', () => {
    // Check script ranges:
    // Devanagari (Hindi): \u0900-\u097F
    // Tamil: \u0B80-\u0BFF
    // Telugu: \u0C00-\u0C7F
    // Kannada: \u0C80-\u0CFF
    // Malayalam: \u0D00-\u0D7F
    const devanagariRegex = /[\u0900-\u097F]/;
    const tamilRegex = /[\u0B80-\u0BFF]/;
    const teluguRegex = /[\u0C00-\u0C7F]/;
    const kannadaRegex = /[\u0C80-\u0CFF]/;
    const malayalamRegex = /[\u0D00-\u0D7F]/;

    expect(devanagariRegex.test(translations.hi.nav.dashboard)).toBe(true);
    expect(tamilRegex.test(translations.ta.nav.dashboard)).toBe(true);
    expect(teluguRegex.test(translations.te.nav.dashboard)).toBe(true);
    expect(kannadaRegex.test(translations.kn.nav.dashboard)).toBe(true);
    expect(malayalamRegex.test(translations.ml.nav.dashboard)).toBe(true);
  });

  test('7. Spanish and French must contain authentic accented characters and vocabulary', () => {
    // Spanish: 'Panel de Control', 'Propiedades', 'Configuración', '¿Olvidó su contraseña?'
    expect(translations.es.nav.dashboard).toBe('Panel de Control');
    expect(translations.es.auth.forgotPassword).toContain('¿');
    expect(translations.es.settings.notifications).toBe('Preferencias de Notificación');

    // French: 'Tableau de Bord', 'Paramètres', 'Mot de passe oublié ?'
    expect(translations.fr.nav.dashboard).toBe('Tableau de Bord');
    expect(translations.fr.nav.settings).toBe('Paramètres');
    expect(translations.fr.auth.forgotPassword).toContain('?');
  });

  test('8. LanguageContext.jsx exports formatting helpers, locale mapping, and error translation', () => {
    const contextPath = path.resolve(__dirname, '../../../client/src/context/LanguageContext.jsx');
    const contextCode = fs.readFileSync(contextPath, 'utf8');

    expect(contextCode).toContain('export const SUPPORTED_LANGUAGES');
    expect(contextCode).toContain('export const LOCALE_MAP');
    expect(contextCode).toContain('formatDate');
    expect(contextCode).toContain('formatNumber');
    expect(contextCode).toContain('formatCurrency');
    expect(contextCode).toContain('formatRelativeTime');
    expect(contextCode).toContain('translateApiError');
    expect(contextCode).toContain('document.documentElement.setAttribute(\'lang\', language)');
    expect(contextCode).toContain('localStorage.setItem(\'language\', language)');
  });
});
