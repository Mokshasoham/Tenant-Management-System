import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../../../client/node_modules/@babel/parser/lib/index.js';
import traversePkg from '../../../client/node_modules/@babel/traverse/lib/index.js';
import { getLocalizedStatus } from '../../../client/src/utils/statusLocalization.js';
import { translations } from '../../../client/src/utils/translations.js';

const traverse = traversePkg.default || traversePkg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

describe('TMS Manager Properties Route & Manager Portal Localization Regression Suite', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];

  describe('1. Root Cause Resolution & AST Binding Integrity', () => {
    test('PropertiesPage.jsx must import useLanguage and declare const { t }', () => {
      const p = path.join(rootDir, 'client/src/pages/PropertiesPage.jsx');
      const code = fs.readFileSync(p, 'utf8');

      expect(code).toContain("import { useLanguage } from '../context/LanguageContext';");
      // Must have t binding in PropertiesPage
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'classProperties', 'dynamicImport']
      });

      let unboundTCount = 0;
      traverse(ast, {
        CallExpression(nodePath) {
          if (nodePath.node.callee.name === 't') {
            if (!nodePath.scope.hasBinding('t')) {
              unboundTCount++;
            }
          }
        }
      });

      expect(unboundTCount).toBe(0);
    });

    test('Zero unbound t calls across all Manager Portal pages and components', () => {
      const managerFiles = [
        'client/src/pages/PropertiesPage.jsx',
        'client/src/pages/ManagerPropertyDetailsPage.jsx',
        'client/src/pages/dashboards/ManagerDashboard.jsx',
        'client/src/pages/manager/maintenance/ManagerMaintenanceCommandCenter.jsx',
        'client/src/pages/manager/maintenance/components/ManagerMaintenanceHeader.jsx',
        'client/src/pages/manager/maintenance/components/ManagerMaintenanceKpis.jsx',
        'client/src/pages/manager/maintenance/components/ManagerPropertyNetwork.jsx',
        'client/src/pages/manager/maintenance/components/ManagerMaintenanceQueue.jsx',
        'client/src/pages/manager/maintenance/components/ManagerOperationsCalendar.jsx',
        'client/src/pages/manager/maintenance/components/ManagerTechnicianWorkload.jsx',
        'client/src/pages/manager/maintenance/components/ManagerMaintenanceMap.jsx',
        'client/src/pages/manager/maintenance/components/ManagerAssignTechnicianModal.jsx',
        'client/src/pages/manager/maintenance/components/ManagerMaintenanceDrawer.jsx',
        'client/src/pages/TechniciansPage.jsx',
        'client/src/pages/WorkforceSchedulingPage.jsx',
        'client/src/pages/TenantsPage.jsx',
        'client/src/pages/LeasesPage.jsx',
        'client/src/pages/manager/ManagerNegotiationsPage.jsx',
        'client/src/pages/AnalyticsPage.jsx',
        'client/src/pages/manager/ManagerVerificationPage.jsx',
        'client/src/pages/property/PropertyVerificationPage.jsx',
        'client/src/components/PropertyModal.jsx',
        'client/src/components/property/PropertyTypeSelectorModal.jsx',
        'client/src/components/dashboard/PayoutsSection.jsx'
      ];

      const failures = [];
      for (const relPath of managerFiles) {
        const fullPath = path.join(rootDir, relPath);
        if (!fs.existsSync(fullPath)) continue;

        const code = fs.readFileSync(fullPath, 'utf8');
        try {
          const ast = parse(code, {
            sourceType: 'module',
            plugins: ['jsx', 'classProperties', 'dynamicImport']
          });

          traverse(ast, {
            CallExpression(nodePath) {
              if (nodePath.node.callee.name === 't') {
                if (!nodePath.scope.hasBinding('t')) {
                  failures.push({ file: relPath, line: nodePath.node.loc?.start?.line });
                }
              }
            }
          });
        } catch (err) {
          failures.push({ file: relPath, syntaxError: err.message });
        }
      }

      expect(failures).toEqual([]);
    });
  });

  describe('2. Error Boundary & Blank Page Resilience Protection', () => {
    test('ErrorBoundary component exists and provides retry and recovery controls', () => {
      const ebPath = path.join(rootDir, 'client/src/components/ErrorBoundary.jsx');
      expect(fs.existsSync(ebPath)).toBe(true);

      const ebCode = fs.readFileSync(ebPath, 'utf8');
      expect(ebCode).toContain('componentDidCatch');
      expect(ebCode).toContain('Retry');
      expect(ebCode).toContain('Dashboard');
    });

    test('App.jsx and DashboardLayout.jsx must wrap routes in ErrorBoundary', () => {
      const appCode = fs.readFileSync(path.join(rootDir, 'client/src/App.jsx'), 'utf8');
      const layoutCode = fs.readFileSync(path.join(rootDir, 'client/src/layouts/DashboardLayout.jsx'), 'utf8');

      expect(appCode).toContain('<ErrorBoundary>');
      expect(layoutCode).toContain('<ErrorBoundary>');
    });
  });

  describe('3. Loading, Populated, Empty, and Error States in PropertiesPage', () => {
    test('PropertiesPage.jsx handles loading, empty, and error states gracefully', () => {
      const code = fs.readFileSync(path.join(rootDir, 'client/src/pages/PropertiesPage.jsx'), 'utf8');

      // Loading state check
      expect(code).toContain('loading ?');

      // Empty states check
      expect(code).toContain("t('properties.noMatchingProperties'");
      expect(code).toContain("t('properties.noPropertiesYet'");

      // Error state and retry button
      expect(code).toContain('error &&');
      expect(code).toContain('fetchProperties');

      // Add Property action for managers
      expect(code).toContain("t('properties.addProperty'");
    });
  });

  describe('4. Centralized Status & Enum Localization Engine', () => {
    test('getLocalizedStatus safely resolves property, lease, and maintenance statuses', () => {
      const dummyT = (key, fallback) => `[${key}] ${fallback}`;

      // Property statuses
      expect(getLocalizedStatus('available', dummyT, 'property')).toContain('Available');
      expect(getLocalizedStatus('occupied', dummyT, 'property')).toContain('Occupied');
      expect(getLocalizedStatus('maintenance', dummyT, 'property')).toContain('Maintenance');

      // Lease statuses
      expect(getLocalizedStatus('active', dummyT, 'lease')).toContain('Active');
      expect(getLocalizedStatus('pending', dummyT, 'lease')).toContain('Pending');
      expect(getLocalizedStatus('expired', dummyT, 'lease')).toContain('Expired');

      // Maintenance statuses
      expect(getLocalizedStatus('open', dummyT, 'maintenance')).toContain('Open');
      expect(getLocalizedStatus('in_progress', dummyT, 'maintenance')).toContain('In Progress');
      expect(getLocalizedStatus('resolved', dummyT, 'maintenance')).toContain('Resolved');

      // Unknown status gracefully falls back without throwing
      expect(getLocalizedStatus('UNKNOWN_CODE_XYZ', dummyT)).toBe('UNKNOWN CODE XYZ');
      expect(getLocalizedStatus(null, dummyT)).toBe('');
    });
  });

  describe('5. Multi-Language Parity for Manager Features Across all 8 Locales', () => {
    test('Telugu (te) and all languages have non-empty translations for Manager navigation and features', () => {
      for (const lang of supportedLanguages) {
        const dict = translations[lang];
        expect(dict).toBeDefined();

        // Nav keys for manager
        expect(dict.nav.dashboard).toBeTruthy();
        expect(dict.nav.properties).toBeTruthy();
        expect(dict.nav.tenantsManager).toBeTruthy();
        expect(dict.nav.verification).toBeTruthy();
        expect(dict.nav.propertyVerification).toBeTruthy();

        // Maintenance operations keys
        expect(dict.maintenance.operationsCenter).toBeTruthy();
        expect(dict.maintenance.maintenanceOperations).toBeTruthy();
        expect(dict.maintenance.queueTitle).toBeTruthy();
        expect(dict.maintenance.operationalMap).toBeTruthy();
        expect(dict.maintenance.assignedTechnician).toBeTruthy();

        // Lease lifecycle keys
        expect(dict.lease.contractsLifecycle).toBeTruthy();
        expect(dict.lease.allLeasesTab).toBeTruthy();
        expect(dict.lease.settleSecurityDeposit).toBeTruthy();

        // Negotiations keys
        expect(dict.negotiations.confidentialDealFlow).toBeTruthy();
        expect(dict.negotiations.totalDeals).toBeTruthy();
      }
    });
  });
});
