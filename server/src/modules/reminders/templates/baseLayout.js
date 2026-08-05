/**
 * server/src/modules/reminders/templates/baseLayout.js
 *
 * Enterprise Responsive HTML Email Layout Wrapper.
 * Wraps body HTML in a consistent, branded, responsive layout with CTA buttons & footer.
 */

/**
 * Wraps inner content HTML inside the standard responsive email template.
 *
 * @param {object} params
 * @param {string} params.title - Header title
 * @param {string} params.bodyHtml - Inner compiled HTML body
 * @param {string} [params.actionUrl] - Optional Call-To-Action link
 * @param {string} [params.actionText='View Details'] - CTA button label
 * @param {object} [params.branding] - Custom branding options
 * @returns {string} - Complete HTML document string
 */
export function renderBaseLayout({
  title = 'Tenant Management System',
  bodyHtml = '',
  actionUrl = null,
  actionText = 'View Details',
  branding = {}
}) {
  const companyName = branding.companyName || 'TMS Platform';
  const brandColor = branding.brandColor || '#4f46e5'; // Indigo-600
  const supportEmail = branding.supportEmail || 'support@tms-platform.com';
  const currentYear = new Date().getFullYear();

  const ctaButtonHtml = actionUrl
    ? `
      <div style="margin: 28px 0; text-align: center;">
        <a href="${actionUrl}" style="display: inline-block; background-color: ${brandColor}; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 28px; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
          ${actionText}
        </a>
      </div>
    `
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased; }
    .wrapper { width: 100%; background-color: #f8fafc; padding: 32px 16px; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); padding: 28px 32px; text-align: left; }
    .header h1 { margin: 0; color: #ffffff; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #334155; }
    .footer { background-color: #f1f5f9; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: ${brandColor}; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>${companyName}</h1>
      </div>
      <div class="content">
        ${bodyHtml}
        ${ctaButtonHtml}
      </div>
      <div class="footer">
        <p style="margin: 0 0 8px 0;">This is an automated notification from ${companyName}. Please do not reply directly.</p>
        <p style="margin: 0;">Need assistance? Contact <a href="mailto:${supportEmail}">${supportEmail}</a> &bull; &copy; ${currentYear} ${companyName}</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export default renderBaseLayout;
