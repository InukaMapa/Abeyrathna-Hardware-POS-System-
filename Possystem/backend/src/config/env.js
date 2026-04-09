import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

dotenv.config({ path: envPath });

export const config = {
    port: process.env.PORT || 5000,
    jwtSecret: process.env.JWT_SECRET,
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseKey: process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
    env: process.env.NODE_ENV || 'development',
    smtp: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
        from: process.env.SMTP_FROM || '"Chill Grand Support" <no-reply@chillgrand.com>'
    },
    aws: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION || 'ap-south-1',
        bucketName: process.env.AWS_BUCKET_NAME || 'chillgrand-images'
    }
};

if (!config.jwtSecret) {
    console.warn('WARNING: JWT_SECRET is not defined in .env file');
}
if (!config.supabaseUrl || !config.supabaseKey) {
    console.warn('WARNING: SUPABASE_URL or SUPABASE_KEY is not defined in .env file');
}
