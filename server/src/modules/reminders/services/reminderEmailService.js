/**
 * server/src/modules/reminders/services/reminderEmailService.js
 *
 * High-level Reminder Email Service coordinating Template Compilation and Provider Drivers.
 */

import { compileTemplate, generatePreview } from '../templates/templateCompiler.js';
import { getEmailProvider, verifyActiveProvider } from '../providers/emailProviderFactory.js';
import logger from '../../../platform/logging/logger.js';

export class ReminderEmailService {
  /**
   * Compiles an email template and dispatches it via the configured/active email provider.
   *
   * @param {object} params
   * @param {object} params.template - Template document/definition
   * @param {object} [params.payload={}] - Dynamic variable payload
   * @param {string|string[]} params.recipientEmail - Target recipient email address
   * @param {object} [params.metadata={}] - { reminderId, campaignId, correlationId }
   * @param {string} [params.providerName] - Optional provider override ('resend', 'smtp', 'simulated')
   * @param {Array} [params.attachments=[]]
   * @param {object} [params.options={}] - Branding & layout options
   * @returns {Promise<EmailDeliveryResult>}
   */
  async sendReminderEmail({
    template,
    payload = {},
    recipientEmail,
    metadata = {},
    providerName,
    attachments = [],
    options = {}
  }) {
    if (!recipientEmail) {
      throw new Error('[ReminderEmailService] recipientEmail is required');
    }

    // 1. Compile Template
    const compiled = compileTemplate({
      template,
      payload,
      wrapInBaseLayout: options.wrapInBaseLayout ?? true,
      branding: options.branding || {}
    });

    if (compiled.warnings && compiled.warnings.length > 0) {
      logger.warn(`[ReminderEmailService] Template compilation warnings for ${template?.templateId || 'inline'}:`, compiled.warnings.join('; '));
    }

    // 2. Resolve Provider Driver
    const driver = getEmailProvider(providerName);

    // 3. Dispatch Email
    const result = await driver.send({
      to: recipientEmail,
      subject: compiled.subject,
      html: compiled.html,
      text: compiled.text,
      attachments,
      metadata
    });

    logger.info(`[ReminderEmailService] Email dispatch result via provider '${result.provider}': success=${result.success}, latency=${result.latencyMs}ms, msgId=${result.providerMessageId}`);
    return result;
  }

  /**
   * Renders a preview of a template with mock payload.
   *
   * @param {object} template
   * @param {object} mockPayload
   * @param {object} [options={}]
   * @returns {object}
   */
  previewTemplate(template, mockPayload = {}, options = {}) {
    return generatePreview(template, mockPayload, options);
  }

  /**
   * Health check for email configuration and provider readiness.
   *
   * @param {string} [providerName]
   * @returns {Promise<{ ready: boolean, provider: string, message: string }>}
   */
  async verifyHealth(providerName) {
    return await verifyActiveProvider(providerName);
  }

  /**
   * Dispatches a diagnostic test email to verify configuration.
   *
   * @param {string} [providerName]
   * @param {string} recipientEmail
   * @returns {Promise<EmailDeliveryResult>}
   */
  async sendTestEmail(providerName, recipientEmail) {
    const mockTemplate = {
      templateId: 'TEST_EMAIL_TEMPLATE',
      version: 1,
      name: 'System Diagnostic Test Email',
      channel: 'email',
      subject: 'Diagnostic Test Email - {{systemName}}',
      htmlBody: '<p>Hello <strong>{{userName}}</strong>,</p><p>This is a diagnostic test email verifying your Email Engine and Provider Driver ({{providerName}}).</p>',
      textBody: 'Hello {{userName}}, This is a diagnostic test email verifying your Email Engine and Provider Driver.'
    };

    const mockPayload = {
      systemName: 'TMS Platform',
      userName: 'System Administrator',
      providerName: providerName || 'active-provider',
      actionText: 'Go to Dashboard',
      actionUrl: 'http://localhost:3000/dashboard'
    };

    return await this.sendReminderEmail({
      template: mockTemplate,
      payload: mockPayload,
      recipientEmail,
      providerName,
      metadata: { reminderId: 'test-reminder-id', correlationId: `test-${Date.now()}` }
    });
  }
}

const reminderEmailServiceSingleton = new ReminderEmailService();
export default reminderEmailServiceSingleton;
