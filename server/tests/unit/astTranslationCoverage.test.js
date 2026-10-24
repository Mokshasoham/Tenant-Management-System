import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { translations } from '../../../client/src/utils/translations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientSrcDir = path.resolve(__dirname, '../../../client/src');

describe('TMS Application-Wide AST & Component Translation Coverage Gate', () => {
  const supportedLanguages = ['en', 'hi', 'ta', 'te', 'kn', 'ml', 'es', 'fr'];

  test('1. Every language contains >= 1000 translation keys with 100% parity across all namespaces', () => {
    const enDict = translations.en;
    const allNamespaces = Object.keys(enDict);

    for (const lang of supportedLanguages) {
      const dict = translations[lang];
      expect(dict).toBeDefined();

      let langKeyCount = 0;
      for (const ns of allNamespaces) {
        expect(dict[ns]).toBeDefined();
        const enKeys = Object.keys(enDict[ns]);
        const targetKeys = Object.keys(dict[ns]);
        expect(targetKeys.sort()).toEqual(enKeys.sort());

        for (const k of enKeys) {
          const val = dict[ns][k];
          expect(typeof val).toBe('string');
          expect(val.trim().length).toBeGreaterThan(0);
          langKeyCount++;
        }
      }

      expect(langKeyCount).toBeGreaterThanOrEqual(1000);
    }
  });

  test('2. All 11 targeted priority components import and consume useLanguage', () => {
    const priorityComponents = [
      'components/dashboard/AutoPayCard.jsx',
      'pages/BillsPage.jsx',
      'pages/MyLeasePage.jsx',
      'components/lease/RentalHistoryDrawer.jsx',
      'pages/tenant/TenantNegotiationsPage.jsx',
      'pages/PayNowPage.jsx',
      'pages/tenant/TenantVerificationPage.jsx',
      'pages/tenant/maintenance/TenantMaintenanceHeader.jsx',
      'pages/tenant/maintenance/TenantMaintenancePortal.jsx',
      'modules/lease-renewal/notifications/components/NotificationFilterBar.jsx',
      'pages/tenant/subscription/TenantSubscriptionPage.jsx',
      'pages/SettingsPage.jsx'
    ];

    for (const relPath of priorityComponents) {
      const fullPath = path.join(clientSrcDir, relPath);
      expect(fs.existsSync(fullPath)).toBe(true);
      const code = fs.readFileSync(fullPath, 'utf8');

      expect(code).toContain('useLanguage');
      expect(code).toMatch(/\bt\s*\(/);
    }
  });

  test('3. Priority components do not retain untranslated static headings or empty states', () => {
    // Check AutoPayCard
    const autoPayCode = fs.readFileSync(path.join(clientSrcDir, 'components/dashboard/AutoPayCard.jsx'), 'utf8');
    expect(autoPayCode).toContain("t('payment.autoPayCardTitle'");
    expect(autoPayCode).toContain("t('payment.autoPayEmptyDesc'");
    expect(autoPayCode).toContain("t('payment.autoPayRetry'");

    // Check BillsPage
    const billsCode = fs.readFileSync(path.join(clientSrcDir, 'pages/BillsPage.jsx'), 'utf8');
    expect(billsCode).toContain("t('bills.accountsLedgerBadge'");
    expect(billsCode).toContain("t('bills.titleTenant'");
    expect(billsCode).toContain("t('bills.noInvoicesTitle'");
    expect(billsCode).toContain("t('bills.searchPlaceholder'");

    // Check MyLeasePage
    const myLeaseCode = fs.readFileSync(path.join(clientSrcDir, 'pages/MyLeasePage.jsx'), 'utf8');
    expect(myLeaseCode).toContain("t('lease.myTenancyBadge'");
    expect(myLeaseCode).toContain("t('lease.leaseRentTitle'");
    expect(myLeaseCode).toContain("t('lease.noActiveLeaseTitle'");

    // Check RentalHistoryDrawer
    const drawerCode = fs.readFileSync(path.join(clientSrcDir, 'components/lease/RentalHistoryDrawer.jsx'), 'utf8');
    expect(drawerCode).toContain("t('lease.residentPortfolioBadge'");
    expect(drawerCode).toContain("t('lease.journeyTitle'");
    expect(drawerCode).toContain("t('lease.noPastStaysTitle'");

    // Check TenantNegotiationsPage
    const negoCode = fs.readFileSync(path.join(clientSrcDir, 'pages/tenant/TenantNegotiationsPage.jsx'), 'utf8');
    expect(negoCode).toContain("t('negotiations.badge'");
    expect(negoCode).toContain("t('negotiations.title'");
    expect(negoCode).toContain("t('negotiations.noOffersTitle'");

    // Check TenantVerificationPage
    const verifCode = fs.readFileSync(path.join(clientSrcDir, 'pages/tenant/TenantVerificationPage.jsx'), 'utf8');
    expect(verifCode).toContain("t('verification.headerTitle'");
    expect(verifCode).toContain("t('verification.tenantPortal'");
    expect(verifCode).toContain("t('verification.currentStatus'");

    // Check TenantMaintenanceHeader and Portal
    const maintHeaderCode = fs.readFileSync(path.join(clientSrcDir, 'pages/tenant/maintenance/TenantMaintenanceHeader.jsx'), 'utf8');
    expect(maintHeaderCode).toContain("t('maintenance.tenantPortal'");
    expect(maintHeaderCode).toContain("t('maintenance.title'");
    expect(maintHeaderCode).toContain("t('maintenance.howItWorks'");

    const maintPortalCode = fs.readFileSync(path.join(clientSrcDir, 'pages/tenant/maintenance/TenantMaintenancePortal.jsx'), 'utf8');
    expect(maintPortalCode).toContain("t('maintenance.noActiveProperty'");
    expect(maintPortalCode).toContain("t('maintenance.startsAfterMoveIn'");

    // Check NotificationFilterBar
    const notifFilterCode = fs.readFileSync(path.join(clientSrcDir, 'modules/lease-renewal/notifications/components/NotificationFilterBar.jsx'), 'utf8');
    expect(notifFilterCode).toContain("t('notification.searchPlaceholder'");
    expect(notifFilterCode).toContain("t('notification.allPriorities'");
    expect(notifFilterCode).toContain("t('notification.unreadOnly'");

    // Check TenantSubscriptionPage
    const subCode = fs.readFileSync(path.join(clientSrcDir, 'pages/tenant/subscription/TenantSubscriptionPage.jsx'), 'utf8');
    expect(subCode).toContain("t('subscription.residentMembership'");
    expect(subCode).toContain("t('subscription.upgradeTitle'");
    expect(subCode).toContain("t('subscription.currentPlan'");
  });

  test('4. Telugu locale contains authentic translations for all 11 priority areas', () => {
    const te = translations.te;

    // Payments
    expect(te.payment.autoPayCardTitle).toBe('ఆటో-పే (Auto-Pay)');
    expect(te.payment.securePayment).toBe('సురక్షిత చెల్లింపు');
    expect(te.payment.payRent).toBe('అద్దె చెల్లించండి');
    expect(te.payment.noActiveLease).toBe('యాక్టివ్ లీజు లేదు');

    // Bills
    expect(te.bills.accountsLedgerBadge).toBe('ఖాతాలు & లెడ్జర్');
    expect(te.bills.titleTenant).toBe('నా ఇన్‌వాయిస్‌లు & బిల్లులు 🧾');
    expect(te.bills.noInvoicesTitle).toBe('ఫిల్టర్‌కు సరిపోలే ఇన్‌వాయిస్‌లు లేవు');

    // My Lease & Rental Journey
    expect(te.lease.myTenancyBadge).toBe('నా అద్దె కాలం');
    expect(te.lease.leaseRentTitle).toBe('లీజు & అద్దె 🏠');
    expect(te.lease.noActiveLeaseTitle).toBe('ఇంకా క్రియాశీల లీజు లేదు');
    expect(te.lease.journeyTitle).toBe('అద్దె ప్రయాణం');
    expect(te.lease.noPastStaysTitle).toBe('ఇంకా పూర్తి చేసిన నివాసాలు లేవు');

    // Negotiations
    expect(te.negotiations.badge).toBe('వ్యక్తిగత చర్చలు');
    expect(te.negotiations.title).toBe('నా అద్దె ఆఫర్‌లు & డీల్స్');
    expect(te.negotiations.noOffersTitle).toBe('క్రియాశీల అద్దె చర్చలు లేవు');

    // Verification
    expect(te.verification.headerTitle).toBe('అద్దెదారు ధృవీకరణ & ట్రస్ట్ హబ్');
    expect(te.verification.currentStatus).toBe('ప్రస్తుత స్థితి');

    // Maintenance
    expect(te.maintenance.tenantPortal).toBe('అద్దెదారు పోర్టల్');
    expect(te.maintenance.title).toBe('నిర్వహణ & మరమ్మతులు');
    expect(te.maintenance.howItWorks).toBe('ఇది ఎలా పనిచేస్తుంది');
    expect(te.maintenance.noActiveProperty).toBe('క్రియాశీల ప్రాపర్టీ లేదు');

    // Notifications
    expect(te.notification.searchPlaceholder).toBe('శీర్షిక, సందేశం ద్వారా నోటిఫికేషన్‌లను శోధించండి...');
    expect(te.notification.allPriorities).toBe('అన్ని ప్రాధాన్యతలు');
    expect(te.notification.unreadOnly).toBe('చదవనివి మాత్రమే');

    // Subscription
    expect(te.subscription.residentMembership).toBe('నివాసి సభ్యత్వం');
    expect(te.subscription.upgradeTitle).toBe('మీ నివాస అనుభవాన్ని అప్‌గ్రేడ్ చేసుకోండి');
    expect(te.subscription.currentPlan).toBe('ప్రస్తుత ప్లాన్');

    // Settings
    expect(te.settings.dark).toBe('డార్క్ మోడ్');
    expect(te.settings.light).toBe('లైట్ మోడ్');
  });
});
