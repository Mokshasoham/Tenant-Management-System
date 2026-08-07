import React from 'react';

/**
 * VerificationPortalLayout
 * Reusable layout wrapper standardizing the dashboard structure across Manager, Tenant, Property, Technician, and Admin verification portals.
 */
export default function VerificationPortalLayout({
  header,
  notification,
  hero,
  widget,
  actions,
  content,
  integrations,
  className = '',
}) {
  return (
    <div className={`p-6 sm:p-10 space-y-8 ${className}`}>
      {/* 1. Header */}
      {header}

      {/* 2. State-driven Notification Banner */}
      {notification}

      {/* 3. Hero Grid */}
      {hero}

      {/* 4. Readiness Widget */}
      {widget}

      {/* 5. Quick Actions */}
      {actions}

      {/* 6. Main Content Grid */}
      {content}

      {/* 7. Future Integrations / Enterprise Hooks */}
      {integrations}
    </div>
  );
}
