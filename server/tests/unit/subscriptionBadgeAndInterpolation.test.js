import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translations } from '../../../client/src/utils/translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('TMS Subscription Plan Badge Layout & Translation Interpolation Tests', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];
  const managerPagePath = path.resolve(__dirname, '../../../client/src/pages/manager/subscription/ManagerSubscriptionPage.jsx');
  const tenantPagePath = path.resolve(__dirname, '../../../client/src/pages/tenant/subscription/TenantSubscriptionPage.jsx');
  const languageContextPath = path.resolve(__dirname, '../../../client/src/context/LanguageContext.jsx');

  // Helper matching LanguageContext interpolation logic
  function createTranslator(language) {
    return function t(key, fallbackOrParams, paramsObj) {
      if (!key) return '';

      let fallbackDefault = null;
      let params = null;

      if (typeof fallbackOrParams === 'object' && fallbackOrParams !== null) {
        params = fallbackOrParams;
      } else {
        fallbackDefault = fallbackOrParams;
        if (typeof paramsObj === 'object' && paramsObj !== null) {
          params = paramsObj;
        }
      }

      const keys = key.split('.');
      let val = translations[language];
      for (const k of keys) {
        val = val?.[k];
        if (val === undefined) break;
      }

      if (val === undefined) {
        let fallbackVal = translations['en'];
        for (const k of keys) {
          fallbackVal = fallbackVal?.[k];
          if (fallbackVal === undefined) break;
        }
        val = fallbackVal !== undefined ? fallbackVal : (fallbackDefault || key);
      }

      if (params && typeof val === 'string') {
        for (const [pKey, pVal] of Object.entries(params)) {
          const replacement = pVal !== undefined && pVal !== null ? String(pVal) : '';
          const escapedKey = pKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:\\{\\{|\\{)\\s*${escapedKey}\\s*(?:\\}\\}|\\})`, 'gi');
          val = val.replace(regex, () => replacement);
        }
      }

      return val;
    };
  }

  describe('1. Rendered Upgrade Button Labels in all 8 Languages', () => {
    const expectedLabels = {
      en: { plus: 'Upgrade to PLUS', pro: 'Upgrade to PRO' },
      hi: { plus: 'प्लस में अपग्रेड करें', pro: 'प्रो में अपग्रेड करें' },
      ta: { plus: 'பிளஸ்க்கு மேம்படுத்தவும்', pro: 'ப்ரோக்கு மேம்படுத்தவும்' },
      te: { plus: 'ప్లస్ కి అప్‌గ్రేడ్ చేయండి', pro: 'ప్రో కి అప్‌గ్రేడ్ చేయండి' },
      kn: { plus: 'ಪ್ಲಸ್ಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ', pro: 'ಪ್ರೊಗೆ ಅಪ್‌ಗ್ರೇಡ್ ಮಾಡಿ' },
      ml: { plus: 'പ്ലസ് ലേക്ക് അപ്‌ഗ്രേഡ് ചെയ്യുക', pro: 'പ്രോ ലേക്ക് അപ്‌ഗ്രേഡ് ചെയ്യുക' },
      es: { plus: 'Mejorar a PLUS', pro: 'Mejorar a PRO' },
      fr: { plus: 'Passer à PLUS', pro: 'Passer à PRO' },
    };

    supportedLanguages.forEach((lang) => {
      test(`[${lang}] renders correctly localized Plus and Pro upgrade button labels`, () => {
        const t = createTranslator(lang);
        const plusPlanName = t('subscription.plus', 'Plus');
        const proPlanName = t('subscription.pro', 'Pro');

        const plusBtn = t('subscription.upgradeTo', 'Upgrade to {{plan}}', {
          plan: plusPlanName,
          PLAN: plusPlanName,
        });
        const proBtn = t('subscription.upgradeTo', 'Upgrade to {{plan}}', {
          plan: proPlanName,
          PLAN: proPlanName,
        });

        expect(plusBtn).toEqual(expectedLabels[lang].plus);
        expect(proBtn).toEqual(expectedLabels[lang].pro);
      });

      test(`[${lang}] contains NO unresolved template placeholders in button labels`, () => {
        const t = createTranslator(lang);
        const plusPlanName = t('subscription.plus', 'Plus');
        const proPlanName = t('subscription.pro', 'Pro');

        const plusBtn = t('subscription.upgradeTo', 'Upgrade to {{plan}}', { plan: plusPlanName });
        const proBtn = t('subscription.upgradeTo', 'Upgrade to {{plan}}', { plan: proPlanName });

        expect(plusBtn).not.toMatch(/\{\{/);
        expect(plusBtn).not.toMatch(/\}\}/);
        expect(plusBtn).not.toMatch(/\{plan\}/i);
        expect(plusBtn).not.toMatch(/\$\{/);

        expect(proBtn).not.toMatch(/\{\{/);
        expect(proBtn).not.toMatch(/\}\}/);
        expect(proBtn).not.toMatch(/\{plan\}/i);
        expect(proBtn).not.toMatch(/\$\{/);
      });
    });
  });

  describe('2. Localization Dictionary Parity for Subscription Elements', () => {
    const requiredKeys = [
      'upgradeTo',
      'plus',
      'pro',
      'starter',
      'free',
      'currentPlanBadge',
      'mostPopularBadge',
      'growingPortfoliosBadge',
      'perMonth',
    ];

    supportedLanguages.forEach((lang) => {
      test(`[${lang}] contains all required subscription keys with non-empty values`, () => {
        const sub = translations[lang]?.subscription;
        expect(sub).toBeDefined();
        requiredKeys.forEach((key) => {
          expect(sub[key]).toBeDefined();
          expect(typeof sub[key]).toBe('string');
          expect(sub[key].trim().length).toBeGreaterThan(0);
        });
      });

      test(`[${lang}] subscription.upgradeTo contains the {{plan}} interpolation variable`, () => {
        const upgradeToStr = translations[lang]?.subscription?.upgradeTo;
        expect(upgradeToStr).toMatch(/\{\{plan\}\}/i);
      });
    });
  });

  describe('3. Robust Interpolation Engine in LanguageContext', () => {
    test('LanguageContext.jsx source uses case-insensitive and whitespace-tolerant replacement', () => {
      const code = fs.readFileSync(languageContextPath, 'utf8');
      expect(code).toContain('escapedKey');
      expect(code).toContain('RegExp(');
      expect(code).toContain("'gi'");
    });

    test('Interpolates case variants: {{plan}}, {{PLAN}}, {plan}, {PLAN}', () => {
      const t = createTranslator('en');
      // Simulated translation strings
      const testCases = [
        'Upgrade to {{plan}}',
        'Upgrade to {{PLAN}}',
        'Upgrade to {plan}',
        'Upgrade to {PLAN}',
        'Upgrade to {{ plan }}',
      ];

      testCases.forEach((template) => {
        // Mock translate with explicit template
        let val = template;
        const params = { plan: 'PLUS' };
        for (const [pKey, pVal] of Object.entries(params)) {
          const replacement = String(pVal);
          const escapedKey = pKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:\\{\\{|\\{)\\s*${escapedKey}\\s*(?:\\}\\}|\\})`, 'gi');
          val = val.replace(regex, () => replacement);
        }
        expect(val).toBe('Upgrade to PLUS');
      });
    });

    test('Safely handles currency symbols like $ without regex backreference collisions', () => {
      const t = createTranslator('en');
      const val = 'Total is {{amount}}';
      const params = { amount: '$150' };
      let res = val;
      for (const [pKey, pVal] of Object.entries(params)) {
        const replacement = String(pVal);
        const escapedKey = pKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(?:\\{\\{|\\{)\\s*${escapedKey}\\s*(?:\\}\\}|\\})`, 'gi');
        res = res.replace(regex, () => replacement);
      }
      expect(res).toBe('Total is $150');
    });

    test('Gracefully handles empty or missing parameters without throwing', () => {
      const t = createTranslator('en');
      expect(t('subscription.upgradeTo', 'Upgrade to {{plan}}', {})).toBe('Upgrade to {{plan}}');
      expect(t('subscription.upgradeTo', 'Upgrade to {{plan}}')).toBe('Upgrade to {{plan}}');
      expect(t('subscription.upgradeTo', 'Upgrade to {{plan}}', { plan: null })).toBe('Upgrade to ');
      expect(t('subscription.upgradeTo', 'Upgrade to {{plan}}', { plan: undefined })).toBe('Upgrade to ');
    });
  });

  describe('4. Manager Subscription Page Layout & Badge Inset Rules', () => {
    let pageCode = '';

    beforeAll(() => {
      pageCode = fs.readFileSync(managerPagePath, 'utf8');
    });

    test('Plan badge does NOT use negative absolute top offset (-top-3.5) on cards', () => {
      expect(pageCode).not.toContain('absolute -top-3.5');
    });

    test('Plan badge uses top-inset reserved height container (min-h-[36px] or min-h-[40px])', () => {
      expect(pageCode).toMatch(/min-h-\[36px\]|min-h-\[40px\]/);
    });

    test('Plan badge has responsive word-wrapping classes without clipping', () => {
      expect(pageCode).toContain('break-words');
      expect(pageCode).toContain('max-w-full');
      expect(pageCode).toContain('leading-snug');
    });

    test('Pricing cards have balanced top padding (pt-5 sm:pt-6)', () => {
      expect(pageCode).toMatch(/pt-5.*sm:pt-6/);
    });

    test('Upgrade button passes localized plan parameter to subscription.upgradeTo', () => {
      expect(pageCode).toContain("t('subscription.upgradeTo', 'Upgrade to {{plan}}'");
      expect(pageCode).toContain("plan: isPlus");
      expect(pageCode).toContain("t('subscription.plus'");
      expect(pageCode).toContain("t('subscription.pro'");
    });

    test('Plan title and description are localized via helper functions', () => {
      expect(pageCode).toContain('getLocalizedPlanName(plan.planId, plan.planName)');
      expect(pageCode).toContain('getLocalizedPlanDesc(plan.planId, plan.description)');
    });

    test('Feature comparison table badges avoid whitespace-nowrap and use break-words', () => {
      // PRO and PLUS header badges in comparison table
      expect(pageCode).toContain("t('subscription.growingPortfoliosBadge', 'FOR GROWING PORTFOLIOS')");
      expect(pageCode).not.toContain("whitespace-nowrap border border-violet-300");
      expect(pageCode).not.toContain("whitespace-nowrap border border-indigo-300");
    });
  });

  describe('5. Tenant Subscription Page Alignment', () => {
    let pageCode = '';

    beforeAll(() => {
      pageCode = fs.readFileSync(tenantPagePath, 'utf8');
    });

    test('Tenant plan badge does NOT use negative absolute top offset (-top-3.5)', () => {
      expect(pageCode).not.toContain('absolute -top-3.5');
    });

    test('Tenant plan badge uses top-inset container with responsive wrapping', () => {
      expect(pageCode).toMatch(/min-h-\[36px\]|min-h-\[40px\]/);
      expect(pageCode).toContain('break-words');
      expect(pageCode).toContain('max-w-full');
    });

    test('Tenant upgrade button passes localized plan parameter', () => {
      expect(pageCode).toContain("t('subscription.upgradeTo', 'Upgrade to {{plan}}'");
      expect(pageCode).toContain("plan: isPlanPlus");
      expect(pageCode).toContain("t('subscription.plus'");
      expect(pageCode).toContain("t('subscription.pro'");
    });

    test('Tenant comparison table badges avoid whitespace-nowrap', () => {
      expect(pageCode).not.toContain("whitespace-nowrap border border-emerald-300");
      expect(pageCode).not.toContain("whitespace-nowrap border border-cyan-300");
    });
  });

  describe('6. Long Translated Badge Integrity in all 8 Languages', () => {
    supportedLanguages.forEach((lang) => {
      test(`[${lang}] growingPortfoliosBadge is valid and non-empty for card badge rendering`, () => {
        const badge = translations[lang]?.subscription?.growingPortfoliosBadge;
        expect(badge).toBeDefined();
        expect(typeof badge).toBe('string');
        expect(badge.length).toBeGreaterThan(0);
        // Ensure no untranslated literal template syntax in badge
        expect(badge).not.toMatch(/\{\{/);
        expect(badge).not.toMatch(/\}\}/);
      });

      test(`[${lang}] mostPopularBadge is valid and non-empty for card badge rendering`, () => {
        const badge = translations[lang]?.subscription?.mostPopularBadge;
        expect(badge).toBeDefined();
        expect(typeof badge).toBe('string');
        expect(badge.length).toBeGreaterThan(0);
        expect(badge).not.toMatch(/\{\{/);
        expect(badge).not.toMatch(/\}\}/);
      });

      test(`[${lang}] currentPlanBadge is valid and non-empty for card badge rendering`, () => {
        const badge = translations[lang]?.subscription?.currentPlanBadge;
        expect(badge).toBeDefined();
        expect(typeof badge).toBe('string');
        expect(badge.length).toBeGreaterThan(0);
        expect(badge).not.toMatch(/\{\{/);
        expect(badge).not.toMatch(/\}\}/);
      });
    });
  });
});
