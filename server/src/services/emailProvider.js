import { Resend } from 'resend';
import config from '../config/config.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';

const isDev = config.NODE_ENV === 'development';
let resendClient = null;

/**
 * Lazy initialization of the Resend SDK Client to avoid crashing at module import time
 */
const getResendClient = () => {
  if (resendClient) return resendClient;
  const apiKey = config.RESEND_API_KEY;

  if (!apiKey) {
    if (isDev) {
      return null; // Return null in development to trigger simulation mode
    }
    // Fail fast in production
    throw new Error('CRITICAL CONFIGURATION ERROR: RESEND_API_KEY is not defined in the production environment.');
  }

  resendClient = new Resend(apiKey);
  return resendClient;
};

/**
 * Explicit email service verification called during server startup bootstrap
 */
export const verifyEmailConfiguration = () => {
  const apiKey = config.RESEND_API_KEY;
  if (!apiKey) {
    if (isDev) {
      logger.warn('Email Service: RESEND_API_KEY is missing. Operating in EMAIL SIMULATION mode.');
    } else {
      logger.error('Email Service Error: RESEND_API_KEY is missing in production environment!');
    }
  } else {
    logger.info('Email Service: Resend API has been configured successfully.');
  }
};

/**
 * Sends an email using the Resend SDK.
 * Handles dynamic conversion of local file paths to raw Buffers.
 */
export const sendEmailMessage = async ({ to, subject, html, text, attachments = [] }) => {
  const fromAddress = config.EMAIL_FROM;
  const replyToAddress = config.EMAIL_REPLY_TO;
  const client = getResendClient();

  // Development simulation mode
  if (!client && isDev) {
    logger.warn(`RESEND_API_KEY is missing in development. Simulating email transmission:`);
    console.log(`\n--- DEVELOPMENT EMAIL SIMULATION ---`);
    console.log(`To      : ${to}`);
    console.log(`From    : ${fromAddress}`);
    console.log(`Reply-To: ${replyToAddress}`);
    console.log(`Subject : ${subject}`);
    if (text) console.log(`Text    : ${text}`);
    if (html) console.log(`HTML    : ${html}`);
    if (attachments.length > 0) {
      console.log(`Attachments: ${attachments.map(a => a.filename).join(', ')}`);
    }
    console.log(`-------------------------------------\n`);
    return { id: 'dev-simulation-id' };
  }

  if (!client) {
    throw new Error('Resend client is not initialized.');
  }

  try {
    // Process attachments: Read local files as Buffers or pass URL paths
    const processedAttachments = await Promise.all(
      attachments.map(async (att) => {
        if (att.path && (att.path.startsWith('http://') || att.path.startsWith('https://'))) {
          return {
            filename: att.filename,
            path: att.path,
          };
        } else if (att.path) {
          const fileBuffer = await fs.readFile(att.path);
          return {
            filename: att.filename,
            content: fileBuffer, // Resend Node SDK accepts raw Buffers
          };
        } else if (att.content) {
          return {
            filename: att.filename,
            content: att.content,
          };
        }
        return att;
      })
    );

    logger.info(`Sending email to ${to} via Resend...`);
    const emailPayload = {
      from: `TMS Platform <${fromAddress}>`,
      to: Array.isArray(to) ? to : [to],
      replyTo: replyToAddress,
      subject,
    };

    if (html) emailPayload.html = html;
    if (text) emailPayload.text = text;
    if (processedAttachments.length > 0) emailPayload.attachments = processedAttachments;

    const response = await client.emails.send(emailPayload);

    // Verify error format of the installed Resend SDK version dynamically
    if (response.error) {
      logger.error(`Resend SDK returned an error while sending to ${to}:`, {
        message: response.error.message,
        name: response.error.name,
        statusCode: response.error.statusCode,
      });
      throw new Error(response.error.message || 'Resend SDK email delivery failed.');
    }

    const messageId = response.data?.id;
    logger.info(`Email sent successfully via Resend. Message ID: ${messageId}`);
    return response.data;
  } catch (error) {
    logger.error(`Error sending email to ${to} via Resend:`, error);
    throw error;
  }
};
