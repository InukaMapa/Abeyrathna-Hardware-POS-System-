import nodemailer from 'nodemailer';
import { config } from '../src/config/env.js';

const testSMTP = async () => {
    console.log('Testing SMTP Configuration...');
    console.log('Config:', {
        host: config.smtp.host,
        port: config.smtp.port,
        user: config.smtp.user,
        from: config.smtp.from
    });

    if (!config.smtp.user || !config.smtp.pass) {
        console.log('---------------------------------------------------');
        console.log('WARNING: SMTP credentials are missing in .env');
        console.log('The system will use MOCK MODE (logging to console).');
        console.log('This is fine for development, but emails will NOT be sent to real inboxes.');
        console.log('---------------------------------------------------');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: config.smtp.host,
        port: config.smtp.port,
        secure: config.smtp.port === 465,
        auth: {
            user: config.smtp.user,
            pass: config.smtp.pass
        }
    });

    try {
        const info = await transporter.sendMail({
            from: config.smtp.from,
            to: config.smtp.user, // Send to self
            subject: 'Test Email from Chill Grand API',
            text: 'If you see this, your SMTP configuration is working correctly!'
        });

        console.log('---------------------------------------------------');
        console.log('SUCCESS: Test email sent!');
        console.log(`Message ID: ${info.messageId}`);
        console.log('Check your inbox (' + config.smtp.user + ')');
        console.log('---------------------------------------------------');
    } catch (error) {
        console.error('---------------------------------------------------');
        console.error('ERROR: Failed to send test email.');
        console.error(error);
        console.log('---------------------------------------------------');
    }
};

testSMTP();
