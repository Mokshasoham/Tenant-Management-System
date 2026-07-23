import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import config from '../config/config.js';

/**
 * The Email Service handles all outgoing communications,
 * such as receipts, late fee alerts, and payout notifications.
 */

const hasSmtpAuth = Boolean(config.SMTP_USER && config.SMTP_PASS);
const transporterConfig = {
  host: config.SMTP_HOST || 'smtp.ethereal.email',
  port: config.SMTP_PORT || 587,
  secure: config.SMTP_PORT === 465,
};

if (hasSmtpAuth) {
  transporterConfig.auth = {
    user: config.SMTP_USER,
    pass: config.SMTP_PASS,
  };
} else {
  logger.warn('SMTP credentials are not configured. Email delivery may fail.');
}

const transporter = nodemailer.createTransport(transporterConfig);

/**
 * Sends a transactional email with an optional attachment (e.g. PDF Invoice)
 */
export const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mailOptions = {
      from: `"TMS Payments" <${process.env.EMAIL_FROM || 'noreply@tms-platform.com'}>`,
      to,
      subject,
      html,
      attachments,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}: ${info.messageId}`);

    if ((config.SMTP_HOST || '').includes('ethereal')) {
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
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
  const pdfUrl = uploadResult.Location;
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

      <a href="${process.env.FRONTEND_URL}/dashboard" style="display: inline-block; padding: 10px 20px; background: #e11d48; color: #fff; text-decoration: none; border-radius: 5px;">Go to Dashboard</a>

      <p style="margin-top: 30px;">If you believe this is an error, please contact support.</p>
      <hr style="border: none; border-top: 1px solid #e5e7eb;" />
      <p style="font-size: 12px; color: #6b7280;">This is an automated message. Please do not reply.</p>
    </div>
  `;

  return sendEmail({ to: user.email, subject, html });
};
