export default {
  apiKey: process.env.RESEND_API_KEY,
  from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@yourdomain.com',
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};
