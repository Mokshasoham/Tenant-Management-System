/**
 * server/src/modules/reminders/templates/templateCompiler.js
 *
 * Enterprise Email & Text Template Compiler.
 * Features:
 *   - Template Caching
 *   - Placeholder Syntax Validation
 *   - HTML Entity Escaping (Sanitization)
 *   - Missing Variable Detection
 *   - Base Layout Rendering
 *   - Preview Generation
 */

import { renderBaseLayout } from './baseLayout.js';

// Cache for parsed template placeholder lists
const compiledTemplateCache = new Map();

/**
 * Escapes special HTML characters to prevent broken markup or HTML injection.
 *
 * @param {any} val
 * @returns {string}
 */
export function escapeHtml(val) {
  if (val === null || val === undefined) return '';
  const str = String(val);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates template placeholder syntax for malformed brackets (e.g. {{}}, {{ var name }}).
 *
 * @param {string} templateString
 * @returns {{ isValid: boolean, malformed: string[] }}
 */
export function validateTemplateSyntax(templateString = '') {
  const malformed = [];
  
  // Find empty placeholders {{}} or {{   }}
  const emptyRegex = /\{\{\s*\}\}/g;
  if (emptyRegex.test(templateString)) {
    malformed.push('Empty placeholder {{}} detected');
  }

  // Find invalid variable names (spaces, special characters inside {{ }})
  const invalidNameRegex = /\{\{\s*([^{}\s]*\s+[^{}]*)\}\}/g;
  let match;
  while ((match = invalidNameRegex.exec(templateString)) !== null) {
    malformed.push(`Invalid placeholder with spaces/characters: "${match[0]}"`);
  }

  return {
    isValid: malformed.length === 0,
    malformed
  };
}

/**
 * Extracts all unique {{variableName}} placeholders from a template string (with caching).
 *
 * @param {string} templateString
 * @returns {string[]}
 */
export function extractPlaceholders(templateString = '') {
  if (compiledTemplateCache.has(templateString)) {
    return compiledTemplateCache.get(templateString);
  }

  const regex = /\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g;
  const placeholders = new Set();
  let match;

  while ((match = regex.exec(templateString)) !== null) {
    placeholders.add(match[1]);
  }

  const result = Array.from(placeholders);
  compiledTemplateCache.set(templateString, result);
  return result;
}

/**
 * Compiles a raw template string with payload values.
 *
 * @param {string} templateString
 * @param {object} payload
 * @param {boolean} [shouldEscape=false] - Escape HTML entities
 * @returns {string}
 */
export function compileString(templateString = '', payload = {}, shouldEscape = false) {
  if (!templateString) return '';

  return templateString.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key) => {
    // Support nested keys e.g. user.firstName
    const keys = key.split('.');
    let val = payload;

    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }

    if (val === undefined || val === null) {
      return ''; // Empty replacement for missing values
    }

    return shouldEscape ? escapeHtml(val) : String(val);
  });
}

/**
 * Validates required variables against payload and checks for unpopulated placeholders after rendering.
 *
 * @param {string[]} requiredVariables
 * @param {object} payload
 * @returns {{ isValid: boolean, missingVariables: string[] }}
 */
export function validatePayloadVariables(requiredVariables = [], payload = {}) {
  const missingVariables = [];

  for (const varName of requiredVariables) {
    const keys = varName.split('.');
    let val = payload;
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) break;
    }
    if (val === undefined || val === null || val === '') {
      missingVariables.push(varName);
    }
  }

  return {
    isValid: missingVariables.length === 0,
    missingVariables
  };
}

/**
 * Full Template Compiler Engine.
 * Takes a ReminderTemplate document/definition + payload, performs syntax validation, variable checking,
 * HTML escaping, and optional base layout wrapping.
 *
 * @param {object} params
 * @param {object} params.template - { templateId, version, subject, htmlBody, textBody, variables }
 * @param {object} params.payload - Variables to inject
 * @param {boolean} [params.wrapInBaseLayout=true]
 * @param {object} [params.branding={}]
 * @returns {{ subject: string, html: string, text: string, warnings: string[] }}
 */
export function compileTemplate({
  template = {},
  payload = {},
  wrapInBaseLayout = true,
  branding = {}
}) {
  const warnings = [];

  const { subject = '', htmlBody = '', textBody = '', variables = [] } = template;

  // 1. Syntax Validation
  const subjectSyntax = validateTemplateSyntax(subject);
  const htmlSyntax = validateTemplateSyntax(htmlBody);
  const textSyntax = validateTemplateSyntax(textBody);

  if (!subjectSyntax.isValid) warnings.push(...subjectSyntax.malformed);
  if (!htmlSyntax.isValid) warnings.push(...htmlSyntax.malformed);
  if (!textSyntax.isValid) warnings.push(...textSyntax.malformed);

  // 2. Required Variable Validation
  const varCheck = validatePayloadVariables(variables, payload);
  if (!varCheck.isValid) {
    warnings.push(`Missing required template variables: ${varCheck.missingVariables.join(', ')}`);
  }

  // 3. String Compilation
  const compiledSubject = compileString(subject, payload, false);
  const compiledText = compileString(textBody || htmlBody, payload, false);
  const compiledBodyHtml = compileString(htmlBody || textBody, payload, true);

  // 4. Base Layout Wrapping
  let finalHtml = compiledBodyHtml;
  if (wrapInBaseLayout) {
    finalHtml = renderBaseLayout({
      title: compiledSubject,
      bodyHtml: compiledBodyHtml,
      actionUrl: payload.actionUrl || null,
      actionText: payload.actionText || 'View Details',
      branding
    });
  }

  // 5. Post-render check for remaining unpopulated {{var}} placeholders
  const remainingPlaceholders = extractPlaceholders(compiledSubject)
    .concat(extractPlaceholders(compiledText))
    .concat(extractPlaceholders(compiledBodyHtml));

  if (remainingPlaceholders.length > 0) {
    warnings.push(`Unpopulated placeholders remaining: ${Array.from(new Set(remainingPlaceholders)).join(', ')}`);
  }

  return {
    subject: compiledSubject,
    html: finalHtml,
    text: compiledText,
    warnings
  };
}

/**
 * Generates a full preview of a template with mock payload.
 *
 * @param {object} template
 * @param {object} mockPayload
 * @param {object} [options={}]
 * @returns {object}
 */
export function generatePreview(template, mockPayload = {}, options = {}) {
  return compileTemplate({
    template,
    payload: mockPayload,
    wrapInBaseLayout: options.wrapInBaseLayout ?? true,
    branding: options.branding || {}
  });
}

export default {
  escapeHtml,
  validateTemplateSyntax,
  extractPlaceholders,
  compileString,
  validatePayloadVariables,
  compileTemplate,
  generatePreview
};
