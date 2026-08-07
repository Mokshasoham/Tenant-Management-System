import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { HelmetProvider } from 'react-helmet-async';
import useAuthStore from './context/authStore';
import { ChatProvider } from './context/ChatContext';
import { VerificationProvider } from './context/VerificationContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TenantsPage from './pages/TenantsPage';
import PropertiesPage from './pages/PropertiesPage';
import LeasesPage from './pages/LeasesPage';
import PaymentsPage from './pages/PaymentsPage';
import BillsPage from './pages/BillsPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import MaintenancePage from './pages/MaintenancePage';
import AnalyticsPage from './pages/AnalyticsPage';
import LandingPage from './pages/LandingPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import MessagesPage from './pages/MessagesPage';
import MyLeasePage from './pages/MyLeasePage';
import PayNowPage from './pages/PayNowPage';
import BrowsePropertiesPage from './pages/BrowsePropertiesPage';
import PropertyDetailsPage from './pages/PropertyDetailsPage';
import BookingStatusPage from './pages/BookingStatusPage';
import SavedPropertiesPage from './pages/SavedPropertiesPage';
import ComparePropertiesPage from './pages/ComparePropertiesPage';
import ReviewsPage from './pages/ReviewsPage';
import SettingsPage from './pages/SettingsPage';
import LeaseDecisionPage from './pages/LeaseDecisionPage';
import LeaseRenewalPage from './pages/LeaseRenewalPage';
import MoveOutPage from './pages/MoveOutPage';
import ExitFeedbackPage from './pages/ExitFeedbackPage';
import InspectionPage from './pages/InspectionPage';
import DepositSettlementPage from './pages/DepositSettlementPage';
import LeaseHistoryPage from './pages/LeaseHistoryPage';
import RenewalHistoryPage from './pages/RenewalHistoryPage';
import ManagerCampaignDashboardPage from './pages/ManagerCampaignDashboardPage';
import NotificationCenterPage from './pages/NotificationCenterPage';
import TechniciansPage from './pages/TechniciansPage';
import WorkforceSchedulingPage from './pages/WorkforceSchedulingPage';
import ActivateAccountPage from './pages/ActivateAccountPage';
import VerificationComponentGallery from './pages/internal/VerificationComponentGallery';

// Manager Verification Portal Pages
import ManagerVerificationPage from './pages/manager/ManagerVerificationPage';
import ManagerVerificationWizard from './pages/manager/ManagerVerificationWizard';
import ManagerVerificationDocuments from './pages/manager/ManagerVerificationDocuments';
import ManagerVerificationTimeline from './pages/manager/ManagerVerificationTimeline';
import ManagerTrustScorePage from './pages/manager/ManagerTrustScorePage';

// Tenant Verification Portal Pages
import TenantVerificationPage from './pages/tenant/TenantVerificationPage';
import TenantVerificationWizard from './pages/tenant/TenantVerificationWizard';
import TenantVerificationDocuments from './pages/tenant/TenantVerificationDocuments';
import TenantVerificationTimeline from './pages/tenant/TenantVerificationTimeline';
import TenantTrustScorePage from './pages/tenant/TenantTrustScorePage';

// Property Verification Portal Pages
import PropertyVerificationPage from './pages/property/PropertyVerificationPage';
import PropertyVerificationWizard from './pages/property/PropertyVerificationWizard';
import PropertyVerificationDocuments from './pages/property/PropertyVerificationDocuments';
import PropertyVerificationTimeline from './pages/property/PropertyVerificationTimeline';
import PropertyTrustScorePage from './pages/property/PropertyTrustScorePage';

// Technician Verification Portal Pages
import TechnicianVerificationPage from './pages/technician/TechnicianVerificationPage';
import TechnicianVerificationWizard from './pages/technician/TechnicianVerificationWizard';
import TechnicianVerificationDocuments from './pages/technician/TechnicianVerificationDocuments';
import TechnicianVerificationTimeline from './pages/technician/TechnicianVerificationTimeline';
import TechnicianTrustScorePage from './pages/technician/TechnicianTrustScorePage';

// Technician Portal Pages & Layout
import TechnicianLayout from './layouts/TechnicianLayout';
import TechnicianDashboard from './pages/dashboards/TechnicianDashboard';
import TechnicianJobsPage from './pages/TechnicianJobsPage';
import TechnicianJobDetailPage from './pages/TechnicianJobDetailPage';
import TechnicianSchedulePage from './pages/TechnicianSchedulePage';
import TechnicianProfilePage from './pages/TechnicianProfilePage';
import QRScannerPage from './pages/QRScannerPage';

// Layouts
import DashboardLayout from './layouts/DashboardLayout';

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  return isAuthenticated ? children : <Navigate to="/login" />;
};

const TechnicianRoute = ({ children }) => {
  const isTechnician = useAuthStore((state) => state.isTechnician());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isTechnician) return <Navigate to="/dashboard" />;
  return children;
};

const ManagerRoute = ({ children }) => {
  const isManager = useAuthStore((state) => state.isManager());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isManager) return <Navigate to="/dashboard" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const isAdmin = useAuthStore((state) => state.isAdmin());
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (!isAdmin) return <Navigate to="/dashboard" />;
  return children;
};

const PaymentRedirectHandler = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const bookingId = searchParams.get('bookingId');
    const paymentStatus = searchParams.get('paymentStatus');

    if (bookingId && paymentStatus) {
      console.log(`[PaymentRedirectHandler] Intercepted payment callback redirect: bookingId=${bookingId}, status=${paymentStatus}`);
      // Remove query parameters from url cleanly
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);

      // Navigate route internally to prevent 404
      navigate(`/bookings/${bookingId}`);
    }
  }, [searchParams, navigate]);

  return null;
};

function App() {
  const initializeAuth = useAuthStore((state) => state.initializeAuth);
  const user = useAuthStore((state) => state.user);

  // Initialize from localStorage ONCE on mount (never during render)
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  return (
    <HelmetProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || '345345345345-dummy.apps.googleusercontent.com'}>
        <Router>
          <VerificationProvider>
            <ChatProvider>
              <PaymentRedirectHandler />
              <Routes>
                {/* Public */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
                <Route path="/activate-account/:token" element={<ActivateAccountPage />} />
                <Route path="/dev/verification-gallery" element={<VerificationComponentGallery />} />

                {/* Technician Portal Isolated Workspace */}
                <Route path="/technician/dashboard" element={<TechnicianRoute><TechnicianLayout><TechnicianDashboard /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/jobs" element={<TechnicianRoute><TechnicianLayout><TechnicianJobsPage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/jobs/:id" element={<TechnicianRoute><TechnicianLayout><TechnicianJobDetailPage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/schedule" element={<TechnicianRoute><TechnicianLayout><TechnicianSchedulePage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/qr-scanner" element={<TechnicianRoute><TechnicianLayout><QRScannerPage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/messages" element={<TechnicianRoute><TechnicianLayout><MessagesPage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/notifications" element={<TechnicianRoute><TechnicianLayout><NotificationCenterPage /></TechnicianLayout></TechnicianRoute>} />
                <Route path="/technician/profile" element={<TechnicianRoute><TechnicianLayout><TechnicianProfilePage /></TechnicianLayout></TechnicianRoute>} />

                {/* All authenticated */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/dashboard/*" element={<ProtectedRoute><DashboardLayout><DashboardPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/payments" element={<ProtectedRoute><DashboardLayout><PaymentsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/bills" element={<ProtectedRoute><DashboardLayout><BillsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/bills/:id" element={<ProtectedRoute><DashboardLayout><BillsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/maintenance" element={<ProtectedRoute><DashboardLayout><MaintenancePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/maintenance/:id" element={<ProtectedRoute><DashboardLayout><MaintenancePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/messages" element={<ProtectedRoute><DashboardLayout><MessagesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><DashboardLayout><ProfilePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/my-lease" element={<ProtectedRoute><DashboardLayout><MyLeasePage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/pay-now" element={<ProtectedRoute><DashboardLayout><PayNowPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/browse" element={<ProtectedRoute><DashboardLayout><BrowsePropertiesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/properties/:id" element={<ProtectedRoute><DashboardLayout><PropertyDetailsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/bookings/:id" element={<ProtectedRoute><DashboardLayout><BookingStatusPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/saved" element={<ProtectedRoute><DashboardLayout><SavedPropertiesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/compare" element={<ProtectedRoute><DashboardLayout><ComparePropertiesPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/reviews/:propertyId" element={<ProtectedRoute><DashboardLayout><ReviewsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/lease-decision" element={<ProtectedRoute><DashboardLayout><LeaseDecisionPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/lease-renewal" element={<ProtectedRoute><DashboardLayout><LeaseRenewalPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/move-out" element={<ProtectedRoute><DashboardLayout><MoveOutPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/exit-feedback" element={<ProtectedRoute><DashboardLayout><ExitFeedbackPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/inspection/:id" element={<ProtectedRoute><DashboardLayout><InspectionPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/deposit-settlement/:id" element={<ProtectedRoute><DashboardLayout><DepositSettlementPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/lease-history" element={<ProtectedRoute><DashboardLayout><LeaseHistoryPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/renewal-history" element={<ProtectedRoute><DashboardLayout><RenewalHistoryPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><DashboardLayout><NotificationCenterPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/tenant/verification" element={<ProtectedRoute><DashboardLayout><TenantVerificationPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/tenant/verification/wizard" element={<ProtectedRoute><DashboardLayout><TenantVerificationWizard /></DashboardLayout></ProtectedRoute>} />
                <Route path="/tenant/verification/documents" element={<ProtectedRoute><DashboardLayout><TenantVerificationDocuments /></DashboardLayout></ProtectedRoute>} />
                <Route path="/tenant/verification/timeline" element={<ProtectedRoute><DashboardLayout><TenantVerificationTimeline /></DashboardLayout></ProtectedRoute>} />
                <Route path="/tenant/trust-score" element={<ProtectedRoute><DashboardLayout><TenantTrustScorePage /></DashboardLayout></ProtectedRoute>} />

                {/* Manager + Admin */}
                <Route path="/tenants" element={<ManagerRoute><DashboardLayout><TenantsPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/properties" element={<ManagerRoute><DashboardLayout><PropertiesPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/leases" element={<ManagerRoute><DashboardLayout><LeasesPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/technicians" element={<ManagerRoute><DashboardLayout><TechniciansPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/workforce-scheduling" element={<ManagerRoute><DashboardLayout><WorkforceSchedulingPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/analytics" element={<ManagerRoute><DashboardLayout><AnalyticsPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/renewals/dashboard" element={<ManagerRoute><DashboardLayout><ManagerCampaignDashboardPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/lease-renewals/dashboard" element={<ManagerRoute><DashboardLayout><ManagerCampaignDashboardPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/verification" element={<ManagerRoute><DashboardLayout><ManagerVerificationPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/verification/wizard" element={<ManagerRoute><DashboardLayout><ManagerVerificationWizard /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/verification/documents" element={<ManagerRoute><DashboardLayout><ManagerVerificationDocuments /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/verification/timeline" element={<ManagerRoute><DashboardLayout><ManagerVerificationTimeline /></DashboardLayout></ManagerRoute>} />
                <Route path="/manager/trust-score" element={<ManagerRoute><DashboardLayout><ManagerTrustScorePage /></DashboardLayout></ManagerRoute>} />
                <Route path="/property/verification" element={<ManagerRoute><DashboardLayout><PropertyVerificationPage /></DashboardLayout></ManagerRoute>} />
                <Route path="/property/verification/wizard" element={<ManagerRoute><DashboardLayout><PropertyVerificationWizard /></DashboardLayout></ManagerRoute>} />
                <Route path="/property/verification/documents" element={<ManagerRoute><DashboardLayout><PropertyVerificationDocuments /></DashboardLayout></ManagerRoute>} />
                <Route path="/property/verification/timeline" element={<ManagerRoute><DashboardLayout><PropertyVerificationTimeline /></DashboardLayout></ManagerRoute>} />
                <Route path="/property/trust-score" element={<ManagerRoute><DashboardLayout><PropertyTrustScorePage /></DashboardLayout></ManagerRoute>} />

                {/* Technician Verification Portal */}
                <Route path="/technician/verification" element={<ProtectedRoute><DashboardLayout><TechnicianVerificationPage /></DashboardLayout></ProtectedRoute>} />
                <Route path="/technician/verification/wizard" element={<ProtectedRoute><DashboardLayout><TechnicianVerificationWizard /></DashboardLayout></ProtectedRoute>} />
                <Route path="/technician/verification/documents" element={<ProtectedRoute><DashboardLayout><TechnicianVerificationDocuments /></DashboardLayout></ProtectedRoute>} />
                <Route path="/technician/verification/timeline" element={<ProtectedRoute><DashboardLayout><TechnicianVerificationTimeline /></DashboardLayout></ProtectedRoute>} />
                <Route path="/technician/trust-score" element={<ProtectedRoute><DashboardLayout><TechnicianTrustScorePage /></DashboardLayout></ProtectedRoute>} />

                {/* Admin only */}
                <Route path="/users" element={<AdminRoute><DashboardLayout><UsersPage /></DashboardLayout></AdminRoute>} />

                {/* Catch-all fallback */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </ChatProvider>
          </VerificationProvider>
        </Router>
      </GoogleOAuthProvider>
    </HelmetProvider>
  );
}

export default App;

