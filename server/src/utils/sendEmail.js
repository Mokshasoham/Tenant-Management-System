import nodemailer from 'nodemailer';
import config from '../config/config.js';
import logger from './logger.js';

const sendEmail = async (options) => {
    // Check for credentials
    if (!config.SMTP_USER || !config.SMTP_PASS || config.SMTP_USER.includes('your_email')) {
        const error = new Error('SMTP credentials are not configured in .env file (using placeholders)');
        logger.error(error.message);
        throw error;
    }

    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
        },
        debug: true,
        logger: true
    });

    // 2) Define the email options
    const mailOptions = {
        from: `TMS <${config.SMTP_USER}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        // html: 
    };

    // 3) Actually send the email
    try {
        await transporter.sendMail(mailOptions);
        logger.info(`Email sent to: ${options.email}`);
    } catch (error) {
        logger.error(`Error sending email to: ${options.email}`, error);
        throw error;
    }
};

export default sendEmail;
