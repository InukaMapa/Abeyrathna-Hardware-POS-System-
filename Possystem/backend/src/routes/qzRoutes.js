import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve private key path (placed next to server.js in the backend root)
const PRIVATE_KEY_PATH = path.join(__dirname, '../../../private-key.pem');
const CERT_PATH = path.join(__dirname, '../../../digital-certificate.txt');

let _privateKey = null;
let _cert = null;

const loadKeys = () => {
    if (!_privateKey && fs.existsSync(PRIVATE_KEY_PATH)) {
        _privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
    }
    if (!_cert && fs.existsSync(CERT_PATH)) {
        _cert = fs.readFileSync(CERT_PATH, 'utf-8');
    }
};

/**
 * GET /api/qz/certificate
 * Returns the public key certificate so the browser can pass it to QZ Tray.
 */
router.get('/certificate', (req, res) => {
    loadKeys();
    if (!_cert) {
        return res.status(404).send('Certificate not found. Run: node generate-qz-cert.mjs');
    }
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-store');
    res.send(_cert);
});

/**
 * GET /api/qz/sign?request=<string>
 * Signs the request string with the private key using SHA-512 and returns the
 * base64-encoded signature. QZ Tray uses this to verify each print request.
 */
router.get('/sign', (req, res) => {
    loadKeys();

    const { request } = req.query;
    if (!request) {
        return res.status(400).send('Missing ?request= parameter');
    }
    if (!_privateKey) {
        return res.status(500).send('Private key not found. Run: node generate-qz-cert.mjs');
    }

    try {
        const signature = crypto.sign('sha512', Buffer.from(request), {
            key: _privateKey,
            padding: crypto.constants.RSA_PKCS1_PADDING,
        });
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Cache-Control', 'no-store');
        res.send(signature.toString('base64'));
    } catch (err) {
        console.error('[QZ Sign] Error signing message:', err);
        res.status(500).send('Signing failed: ' + err.message);
    }
});

export default router;
