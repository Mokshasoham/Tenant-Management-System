import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../../../client/node_modules/@babel/parser/lib/index.js';
import traversePkg from '../../../client/node_modules/@babel/traverse/lib/index.js';
import { translations } from '../../../client/src/utils/translations.js';

const traverse = traversePkg.default || traversePkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('TMS Verification Routes Localization & Runtime Integrity Regression Suite', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];

  describe('1. AST Binding & Import Integrity for Verification Routes', () => {
    test('ManagerVerificationPage.jsx imports useLanguage and has zero unbound useLanguage or t() calls', () => {
      const filePath = path.join(rootDir, 'client/src/pages/manager/ManagerVerificationPage.jsx');
      expect(fs.existsSync(filePath)).toBe(true);

      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toContain("import { useLanguage } from '../../context/LanguageContext';");

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'dynamicImport']
      });

      let unboundUseLanguage = 0;
      let unboundT = 0;

      traverse(ast, {
        Identifier(nodePath) {
          if (nodePath.node.name === 'useLanguage') {
            if (nodePath.parent.type !== 'ImportSpecifier' && nodePath.parent.type !== 'ImportDefaultSpecifier') {
              if (!nodePath.scope.hasBinding('useLanguage')) {
                unboundUseLanguage++;
              }
            }
          }
          if (nodePath.node.name === 't' && nodePath.parent.type === 'CallExpression' && nodePath.parent.callee === nodePath.node) {
            if (!nodePath.scope.hasBinding('t')) {
              unboundT++;
            }
          }
        }
      });

      expect(unboundUseLanguage).toBe(0);
      expect(unboundT).toBe(0);
    });

    test('PropertyVerificationPage.jsx imports useLanguage and has zero unbound useLanguage or t() calls', () => {
      const filePath = path.join(rootDir, 'client/src/pages/property/PropertyVerificationPage.jsx');
      expect(fs.existsSync(filePath)).toBe(true);

      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toContain("import { useLanguage } from '../../context/LanguageContext';");

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'dynamicImport']
      });

      let unboundUseLanguage = 0;
      let unboundT = 0;

      traverse(ast, {
        Identifier(nodePath) {
          if (nodePath.node.name === 'useLanguage') {
            if (nodePath.parent.type !== 'ImportSpecifier' && nodePath.parent.type !== 'ImportDefaultSpecifier') {
              if (!nodePath.scope.hasBinding('useLanguage')) {
                unboundUseLanguage++;
              }
            }
          }
          if (nodePath.node.name === 't' && nodePath.parent.type === 'CallExpression' && nodePath.parent.callee === nodePath.node) {
            if (!nodePath.scope.hasBinding('t')) {
              unboundT++;
            }
          }
        }
      });

      expect(unboundUseLanguage).toBe(0);
      expect(unboundT).toBe(0);
    });

    test('ManagerPropertyDetailsPage.jsx imports useLanguage and has zero unbound useLanguage or t() calls', () => {
      const filePath = path.join(rootDir, 'client/src/pages/ManagerPropertyDetailsPage.jsx');
      expect(fs.existsSync(filePath)).toBe(true);

      const code = fs.readFileSync(filePath, 'utf8');
      expect(code).toContain("import { useLanguage } from '../context/LanguageContext';");

      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'dynamicImport']
      });

      let unboundUseLanguage = 0;
      let unboundT = 0;

      traverse(ast, {
        Identifier(nodePath) {
          if (nodePath.node.name === 'useLanguage') {
            if (nodePath.parent.type !== 'ImportSpecifier' && nodePath.parent.type !== 'ImportDefaultSpecifier') {
              if (!nodePath.scope.hasBinding('useLanguage')) {
                unboundUseLanguage++;
              }
            }
          }
          if (nodePath.node.name === 't' && nodePath.parent.type === 'CallExpression' && nodePath.parent.callee === nodePath.node) {
            if (!nodePath.scope.hasBinding('t')) {
              unboundT++;
            }
          }
        }
      });

      expect(unboundUseLanguage).toBe(0);
      expect(unboundT).toBe(0);
    });

    test('Zero unbound useLanguage or t() calls across all verification components', () => {
      const verificationDir = path.join(rootDir, 'client/src/components/verification');
      function getFiles(dir) {
        let res = [];
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, item.name);
          if (item.isDirectory()) {
            res = res.concat(getFiles(full));
          } else if (item.name.endsWith('.jsx') || item.name.endsWith('.js')) {
            res.push(full);
          }
        }
        return res;
      }

      const allVerifComponents = getFiles(verificationDir);
      const errors = [];

      for (const file of allVerifComponents) {
        const code = fs.readFileSync(file, 'utf8');
        try {
          const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'classProperties', 'dynamicImport']
          });

          traverse(ast, {
            Identifier(nodePath) {
              const name = nodePath.node.name;
              if (name === 'useLanguage') {
                if (nodePath.parent.type !== 'ImportSpecifier' && nodePath.parent.type !== 'ImportDefaultSpecifier') {
                  if (!nodePath.scope.hasBinding('useLanguage')) {
                    errors.push({ file: path.relative(rootDir, file), error: 'unbound useLanguage' });
                  }
                }
              }
              if (name === 't' && nodePath.parent.type === 'CallExpression' && nodePath.parent.callee === nodePath.node) {
                if (!nodePath.scope.hasBinding('t')) {
                  errors.push({ file: path.relative(rootDir, file), error: 'unbound t()' });
                }
              }
            }
          });
        } catch (err) {
          errors.push({ file: path.relative(rootDir, file), error: err.message });
        }
      }

      expect(errors).toEqual([]);
    });
  });

  describe('2. React Router Configuration & Route Normalization for Verification', () => {
    test('App.jsx defines exact, trailing slash, and wildcard routes for verification portals', () => {
      const appCode = fs.readFileSync(path.join(rootDir, 'client/src/App.jsx'), 'utf8');

      expect(appCode).toContain('path="/manager/verification"');
      expect(appCode).toContain('path="/manager/verification/"');
      expect(appCode).toContain('path="/manager/verification/*"');

      expect(appCode).toContain('path="/property/verification"');
      expect(appCode).toContain('path="/property/verification/"');
      expect(appCode).toContain('path="/property/verification/*"');
    });

    test('App.jsx provides TrailingSlashNormalizer and ErrorBoundary wrapper for verification pages', () => {
      const appCode = fs.readFileSync(path.join(rootDir, 'client/src/App.jsx'), 'utf8');

      expect(appCode).toContain('<TrailingSlashNormalizer />');
      expect(appCode).toContain('<ErrorBoundary>');
      expect(appCode).toContain('</ErrorBoundary>');
    });
  });

  describe('3. Multi-Language Parity for Verification Features (Telugu & 8 Locales)', () => {
    const requiredVerificationKeys = [
      'verification.verificationState',
      'verification.trustBadge',
      'verification.startVerification',
      'verification.continueDraft',
      'verification.resubmitVerification',
      'verification.accountFullyVerified',
      'verification.documentWorkspace',
      'verification.trustScoreAnalytics',
      'verification.propertyHealth',
      'verification.physicalInspection',
      'verification.verifiedRealEstate',
      'verification.assignedManager'
    ];

    test.each(supportedLanguages)('Language %s has complete translations for verification features', (lang) => {
      const langDict = translations[lang];
      expect(langDict).toBeDefined();

      for (const keyPath of requiredVerificationKeys) {
        const parts = keyPath.split('.');
        let cur = langDict;
        for (const p of parts) {
          cur = cur?.[p];
        }
        expect(cur).toBeDefined();
        expect(typeof cur).toBe('string');
        expect(cur.trim().length).toBeGreaterThan(0);
      }
    });

    test('Telugu (te) translations for verification correctly render expected localized strings', () => {
      const teDict = translations['te'];
      expect(teDict.verification.verificationState).toBe('ధృవీకరణ స్థితి');
      expect(teDict.verification.trustBadge).toBe('ట్రస్ట్ బ్యాడ్జ్');
      expect(teDict.verification.startVerification).toBe('ధృవీకరణను ప్రారంభించండి');
      expect(teDict.verification.documentWorkspace).toBe('డాక్యుమెంట్ వర్క్‌స్పేస్');
    });
  });
});
