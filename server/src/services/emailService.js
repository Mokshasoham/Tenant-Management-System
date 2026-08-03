import logger from '../utils/logger.js';
import { sendEmailMessage } from './emailProvider.js';

/**
 * The Email Service handles all outgoing communications,
 * such as receipts, late fee alerts, and payout notifications.
 */

/**
 * Sends a transactional email with an optional attachment (e.g. PDF Invoice)
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    return await sendEmailMessage({ to, subject, html, attachments });
  } catch (error) {
    logger.error(`Failed to send email to ${to}: ${error.message}`);
    return null;
  }
};

/**
 * Pre-defined template for Payment Receipts
 */
export const sendPaymentReceiptEmail = async (user, payment, property, uploadResult) => {
  const subject = `Payment Confirmation - ${property.name}`;
  const pdfUrl = uploadResult.fileId ? `/api/files/download/${uploadResult.fileId}` : uploadResult.Location;
  const filePath = uploadResult.filePath;

  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2563eb;">Payment Received!</h2>
      <p>Hi ${user.firstName},</p>
      <p>This is a confirmation that your payment for <strong>${payment.type.replace('_', ' ')}</strong> has been successfully processed.</p>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Amount:</strong> INR ${payment.amount.toLocaleString('en-IN')}</p>
        <p style="margin: 0;"><strong>Status:</strong> Completed</p>
        <p style="margin: 0;"><strong>Date:</strong> ${new Date(payment.paymentDate || Date.now()).toLocaleDateString()}</p>
      </div>

      <p>You can download your official receipt using the link below (or see attached):</p>
      <a href="${pdfUrl}" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Download Receipt (PDF)</a>

      <p style="margin-top: 30px;">Thank you for using our platform.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply to this email.</p>
    </div>
  `;

  const attachments = [];
  if (filePath) {
    attachments.push({
      filename: `invoice_${payment._id}.pdf`,
      path: filePath,
    });
  } else if (pdfUrl) {
    attachments.push({
      filename: `invoice_${payment._id}.pdf`,
      path: pdfUrl,
    });
  }

  return sendEmail({
    to: user.email,
    subject,
    html,
    attachments,
  });
};

/**
 * Notify user of a failed payment attempt
 */
export const sendPaymentFailedEmail = async (user, amount, reason) => {
  const subject = `Action Required: Payment Failed`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #e11d48;">Payment Failed</h2>
      <p>Hi ${user.firstName},</p>
      <p>Unfortunately, your recent payment attempt of <strong>INR ${amount.toLocaleString('en-IN')}</strong> has failed.</p>

      <div style="background: #fff1f2; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecdd3;">
        <p style="margin: 0;"><strong>Reason:</strong> ${reason || 'Transaction declined by bank'}</p>
        <p style="margin: 0;"><strong>Status:</strong> Failed</p>
      </div>

      <p>Please log in to your dashboard to update your payment method and retry the transaction to avoid any service interruptions or late fees.</p>

      <a href="${config.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 10px 20px; background: #e11d48; color: #fff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>

      <p style="margin-top: 30px;">If you believe this is an error, please contact support.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, html });
};

/**
 * Notify user that a late fee has been applied
 */
export const sendLateFeeAppliedEmail = async (user, payment, property, lateFeeAmount) => {
  const subject = `⚠️ Late Fee Applied - ${property.name}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #dc2626;">Late Fee Applied</h2>
      <p>Hi ${user.firstName},</p>
      <p>This is to inform you that a 5% late fee of <strong>INR ${lateFeeAmount.toLocaleString('en-IN')}</strong> has been applied to your account for overdue rent on <strong>${property.name}</strong>.</p>
      <p>The original rent payment of INR ${payment.amount.toLocaleString('en-IN')} was due on ${new Date(payment.dueDate).toLocaleDateString()}.</p>
      <p>Please log in to your dashboard to pay the outstanding balance as soon as possible to avoid further penalties.</p>
      <a href="${config.FRONTEND_URL || 'http://localhost:3000'}/payments" style="display: inline-block; padding: 10px 20px; background: #dc2626; color: #fff; text-decoration: none; border-radius: 5px;">View Payments</a>
      <p style="margin-top: 30px;">Thank you,</p>
      <p>TMS Management Team</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
};

/**
 * Send rent payment reminder to user
 */
export const sendRentReminderEmail = async (user, payment, property) => {
  const subject = `⏰ Rent Payment Reminder - ${property.name}`;
  const html = `
    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
      <h2 style="color: #2563eb;">Rent Due Soon</h2>
      <p>Hi ${user.firstName},</p>
      <p>This is a friendly reminder that your rent payment of <strong>INR ${payment.amount.toLocaleString('en-IN')}</strong> for <strong>${property.name}</strong> is due on <strong>${new Date(payment.dueDate).toLocaleDateString()}</strong>.</p>
      <p>Please log in to your dashboard to make your payment on time.</p>
      <a href="${config.FRONTEND_URL || 'http://localhost:3000'}/payments" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 5px;">Pay Rent Now</a>
      <p style="margin-top: 30px;">Thank you,</p>
      <p>TMS Management Team</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply.</p>
    </div>
  `;
  return sendEmail({ to: user.email, subject, html });
};
