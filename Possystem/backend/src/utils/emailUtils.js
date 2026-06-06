import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465, // true for 465, false for other ports
    auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
    }
});

/**
 * Sends an email.
 * @param {object} options - { to, subject, text, html }
 */
export const sendEmail = async ({ to, subject, text, html }) => {
    try {
        // If SMTP is not configured, log to console (Development Mode)
        if (!config.smtp.user || !config.smtp.pass) {
            console.log('---------------------------------------------------');
            console.log(`[MOCK EMAIL] To: ${to}`);
            console.log(`Subject: ${subject}`);
            console.log(`Text: ${text}`);
            console.log('---------------------------------------------------');
            return;
        }

        const info = await transporter.sendMail({
            from: config.smtp.from,
            to,
            subject,
            text,
            html
        });

        console.log(`Email sent: ${info.messageId}`);
    } catch (error) {
        console.error('Error sending email:', error);
        // Don't throw error to prevent blocking the flow, just log it
    }
};
