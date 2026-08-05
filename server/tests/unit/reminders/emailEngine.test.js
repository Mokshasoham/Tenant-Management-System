/**
 * server/tests/unit/reminders/emailEngine.test.js
 *
 * Comprehensive Unit Test Suite for Phase 2.3.3.6.2 - Email Engine & Template Processor.
 * Validates Providers, Factory, Template Compiler, HTML Sanitization, Timeout Handling, and Standardized Results.
 */

import { jest } from '@jest/globals';
import { IEmailProvider, createDeliveryResult } from '../../../src/modules/reminders/providers/IEmailProvider.js';
import SimulatedEmailProvider from '../../../src/modules/reminders/providers/SimulatedEmailProvider.js';
import ResendProvider from '../../../src/modules/reminders/providers/ResendProvider.js';
import SmtpProvider from '../../../src/modules/reminders/providers/SmtpProvider.js';
import { getEmailProvider, verifyActiveProvider } from '../../../src/modules/reminders/providers/emailProviderFactory.js';
import {
  escapeHtml,
  validateTemplateSyntax,
  compileString,
  validatePayloadVariables,
  compileTemplate,
  generatePreview
} from '../../../src/modules/reminders/templates/templateCompiler.js';
import { renderBaseLayout } from '../../../src/modules/reminders/templates/baseLayout.js';
import reminderEmailService from '../../../src/modules/reminders/services/reminderEmailService.js';

describe('Phase 2.3.3.6.2 — Email Engine & Template Processor Unit Tests', () => {

  // ─────────────────────────────────────────────────────────────
  // 1. DELIVERY RESULT DTO & ABSTRACT INTERFACE
  // ─────────────────────────────────────────────────────────────
  describe('IEmailProvider & Delivery Result DTO', () => {
    test('createDeliveryResult builds standardized success payload', () => {
      const res = createDeliveryResult({
        success: true,
        provider: 'resend',
        providerMessageId: 'msg_12345',
        latencyMs: 120
      });

      expect(res.success).toBe(true);
      expect(res.provider).toBe('resend');
      expect(res.providerMessageId).toBe('msg_12345');
      expect(res.latencyMs).toBe(120);
      expect(res.error).toBeNull();
    });

    test('createDeliveryResult builds standardized error payload', () => {
      const res = createDeliveryResult({
        success: false,
        provider: 'smtp',
        latencyMs: 300,
        error: { code: 'SMTP_TIMEOUT', message: 'Connection timed out' }
      });

      expect(res.success).toBe(false);
      expect(res.provider).toBe('smtp');
      expect(res.error.code).toBe('SMTP_TIMEOUT');
      expect(res.error.message).toBe('Connection timed out');
    });

    test('Abstract IEmailProvider throws if methods called directly', async () => {
      const base = new IEmailProvider('base');
      await expect(base.send({})).rejects.toThrow();
      await expect(base.verify()).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. SIMULATED PROVIDER DRIVER
  // ─────────────────────────────────────────────────────────────
  describe('SimulatedEmailProvider', () => {
    test('send() returns successful delivery result in dev/test mode', async () => {
      const driver = new SimulatedEmailProvider({ delayMs: 5 });
      const result = await driver.send({
        to: 'tenant@example.com',
        subject: 'Welcome to TMS',
        html: '<p>Welcome!</p>',
        metadata: { reminderId: 'rem_100', correlationId: 'corr_200' }
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
      expect(result.providerMessageId).toMatch(/^sim-/);
      expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test('verify() returns ready status', async () => {
      const driver = new SimulatedEmailProvider();
      const health = await driver.verify();
      expect(health.ready).toBe(true);
      expect(health.provider).toBe('simulated');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. RESEND & SMTP PROVIDER GRACEFUL FAILURE FOR MISSING CONFIG
  // ─────────────────────────────────────────────────────────────
  describe('Production Drivers (Resend & SMTP) Missing Config Safeguards', () => {
    test('ResendProvider fails gracefully when API key is missing', async () => {
      const driver = new ResendProvider({ apiKey: '' });
      const health = await driver.verify();
      expect(health.ready).toBe(false);

      const sendResult = await driver.send({ to: 'user@example.com', subject: 'Test' });
      expect(sendResult.success).toBe(false);
      expect(sendResult.error.code).toBe('MISSING_CONFIG');
    });

    test('SmtpProvider fails gracefully when host/user is missing', async () => {
      const driver = new SmtpProvider({ host: '', user: '' });
      const health = await driver.verify();
      expect(health.ready).toBe(false);

      const sendResult = await driver.send({ to: 'user@example.com', subject: 'Test' });
      expect(sendResult.success).toBe(false);
      expect(sendResult.error.code).toBe('MISSING_CONFIG');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. PROVIDER FACTORY
  // ─────────────────────────────────────────────────────────────
  describe('Email Provider Factory', () => {
    test('getEmailProvider returns SimulatedEmailProvider when requested or missing config', () => {
      const driver = getEmailProvider('simulated');
      expect(driver.name).toBe('simulated');
    });

    test('verifyActiveProvider returns health check result', async () => {
      const health = await verifyActiveProvider('simulated');
      expect(health.ready).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. TEMPLATE COMPILER & HTML SANITIZATION
  // ─────────────────────────────────────────────────────────────
  describe('EmailTemplateCompiler', () => {
    test('escapeHtml escapes special HTML characters', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('validateTemplateSyntax catches malformed placeholders', () => {
      const emptyCheck = validateTemplateSyntax('Hello {{  }}, welcome!');
      expect(emptyCheck.isValid).toBe(false);
      expect(emptyCheck.malformed.length).toBeGreaterThan(0);

      const invalidNameCheck = validateTemplateSyntax('Hello {{ first name }}, welcome!');
      expect(invalidNameCheck.isValid).toBe(false);
    });

    test('compileString replaces placeholders and supports nested properties', () => {
      const tpl = 'Hi {{user.name}}, your rent for {{property.title}} is ${{amount}}.';
      const payload = {
        user: { name: 'Sarah' },
        property: { title: 'Sunset Apartments #4B' },
        amount: 1500
      };

      const compiled = compileString(tpl, payload, false);
      expect(compiled).toBe('Hi Sarah, your rent for Sunset Apartments #4B is $1500.');
    });

    test('validatePayloadVariables flags missing required variables', () => {
      const required = ['tenantName', 'leaseEndDate', 'actionUrl'];
      const payload = { tenantName: 'Alex', leaseEndDate: '2026-09-30' }; // missing actionUrl

      const check = validatePayloadVariables(required, payload);
      expect(check.isValid).toBe(false);
      expect(check.missingVariables).toContain('actionUrl');
    });

    test('compileTemplate compiles subject, text, and wraps HTML in baseLayout', () => {
      const template = {
        templateId: 'RENEWAL_NOTICE',
        version: 1,
        subject: 'Lease Renewal Notice for {{propertyTitle}}',
        htmlBody: '<p>Dear {{tenantName}}, your lease ends on {{endDate}}.</p>',
        textBody: 'Dear {{tenantName}}, your lease ends on {{endDate}}.',
        variables: ['tenantName', 'propertyTitle', 'endDate']
      };

      const payload = {
        tenantName: 'John Doe',
        propertyTitle: 'Oakwood Villa 101',
        endDate: '2026-10-31',
        actionUrl: 'https://tms-platform.com/renew'
      };

      const result = compileTemplate({ template, payload, wrapInBaseLayout: true });

      expect(result.subject).toBe('Lease Renewal Notice for Oakwood Villa 101');
      expect(result.text).toBe('Dear John Doe, your lease ends on 2026-10-31.');
      expect(result.html).toContain('<!DOCTYPE html>');
      expect(result.html).toContain('John Doe');
      expect(result.html).toContain('https://tms-platform.com/renew');
      expect(result.warnings.length).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. BASE LAYOUT RENDERER
  // ─────────────────────────────────────────────────────────────
  describe('Base Layout Renderer', () => {
    test('renderBaseLayout generates responsive HTML with branding and CTA button', () => {
      const html = renderBaseLayout({
        title: 'Payment Confirmation',
        bodyHtml: '<p>Payment received successfully.</p>',
        actionUrl: 'https://tms.com/payments',
        actionText: 'View Receipt',
        branding: { companyName: 'Apex Properties' }
      });

      expect(html).toContain('Apex Properties');
      expect(html).toContain('View Receipt');
      expect(html).toContain('https://tms.com/payments');
      expect(html).toContain('Payment received successfully.');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. HIGH-LEVEL REMINDER EMAIL SERVICE
  // ─────────────────────────────────────────────────────────────
  describe('ReminderEmailService Orchestration', () => {
    test('sendReminderEmail compiles template and returns delivery result', async () => {
      const template = {
        templateId: 'WELCOME_EMAIL',
        subject: 'Welcome to {{propertyName}}',
        htmlBody: '<p>Welcome {{tenantName}}!</p>',
        textBody: 'Welcome {{tenantName}}!'
      };

      const payload = { propertyName: 'Grand Residency', tenantName: 'Emma' };

      const result = await reminderEmailService.sendReminderEmail({
        template,
        payload,
        recipientEmail: 'emma@example.com',
        providerName: 'simulated',
        metadata: { reminderId: 'rem_welcome_1' }
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
      expect(result.providerMessageId).toBeDefined();
    });

    test('sendTestEmail dispatches diagnostic test email', async () => {
      const result = await reminderEmailService.sendTestEmail('simulated', 'admin@tms.com');
      expect(result.success).toBe(true);
      expect(result.provider).toBe('simulated');
    });
  });

});
