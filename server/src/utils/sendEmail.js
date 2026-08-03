import nodemailer from 'nodemailer';
import config from '../config/config.js';
import logger from './logger.js';
import dns from 'dns/promises';
import net from 'net';

const sendEmail = async (options) => {
    // Check for credentials
    if (!config.SMTP_USER || !config.SMTP_PASS || config.SMTP_USER.includes('your_email')) {
        const error = new Error('SMTP credentials are not configured in .env file (using placeholders)');
        logger.error(error.message);
        throw error;
    }

    // Dynamically resolve SMTP host to IPv4 to bypass Render IPv6 connection issues
    let resolvedHost = config.SMTP_HOST;
    if (config.SMTP_HOST && !net.isIP(config.SMTP_HOST)) {
        try {
            const addresses = await dns.resolve4(config.SMTP_HOST);
            if (addresses && addresses.length > 0) {
                resolvedHost = addresses[Math.floor(Math.random() * addresses.length)];
                logger.debug(`Resolved SMTP host ${config.SMTP_HOST} to IPv4: ${resolvedHost}`);
            }
        } catch (dnsErr) {
            logger.warn(`Failed to resolve SMTP host ${config.SMTP_HOST} to IPv4 dynamically. Falling back to default host. Detail: ${dnsErr.message}`);
        }
    }

    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
        host: resolvedHost,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465, // true for 465, false for 587
        auth: {
            user: config.SMTP_USER,
            pass: config.SMTP_PASS,
        },
        connectionTimeout: 10000, // 10 seconds connection timeout
        greetingTimeout: 10000,   // 10 seconds greeting timeout
        socketTimeout: 10000,     // 10 seconds socket timeout
        tls: {
            servername: config.SMTP_HOST || 'smtp.gmail.com', // Explicit SNI servername for TLS validation
            rejectUnauthorized: true // Secure TLS verification
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
