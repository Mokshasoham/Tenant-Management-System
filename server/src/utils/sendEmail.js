import { sendEmailMessage } from '../services/emailProvider.js';

const sendEmail = async (options) => {
    return sendEmailMessage({
        to: options.email,
        subject: options.subject,
        text: options.message,
    });
};

export default sendEmail;
