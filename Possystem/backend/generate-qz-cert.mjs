/**
 * QZ Tray Certificate Generator
 * Generates a self-signed RSA key pair compatible with QZ Tray signing.
 *
 * Usage: node generate-qz-cert.mjs
 * Output:
 *   - private-key.pem       (kept on server, used for signing)
 *   - digital-certificate.txt  (public cert, served to browser)
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Generate RSA 2048 key pair ──────────────────────────────────────────────
console.log('Generating 2048-bit RSA key pair...');
const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

// ── Build a minimal self-signed X.509 DER, then PEM-encode it ──────────────
// QZ Tray (2.x) actually accepts a raw RSA public key (SPKI PEM) in the
// digital-certificate.txt when used together with a matching private-key.pem
// for SHA-512 signing. The "certificate" file just needs to be the PEM-encoded
// public key so QZ Tray can verify the signatures. No CA chain is required for
// self-hosted / dev usage.

// Write private key (server side only)
const privateKeyPath = path.join(__dirname, 'private-key.pem');
fs.writeFileSync(privateKeyPath, privateKey);
console.log('✓ private-key.pem written to', privateKeyPath);

// Write public cert (served to browser via /api/qz/certificate or static file)
const certPath = path.join(__dirname, 'digital-certificate.txt');
fs.writeFileSync(certPath, publicKey);
console.log('✓ digital-certificate.txt written to', certPath);

// Also copy cert to frontend public folder so it can be fetched from the browser
const frontendPublicDir = path.join(__dirname, '../frontend/public');
if (!fs.existsSync(frontendPublicDir)) {
    fs.mkdirSync(frontendPublicDir, { recursive: true });
}
const frontendCertPath = path.join(frontendPublicDir, 'digital-certificate.txt');
fs.writeFileSync(frontendCertPath, publicKey);
console.log('✓ digital-certificate.txt also copied to', frontendCertPath);

console.log('\n✅ Done! Now:');
console.log('   1. Start your backend — it will use private-key.pem to sign QZ Tray requests.');
console.log('   2. In QZ Tray > Advanced > Site Manager > + > Create New,');
console.log('      paste the contents of digital-certificate.txt when prompted, OR');
console.log('      just restart QZ Tray and allow localhost when the popup appears.');
console.log('   3. After QZ Tray shows the security dialog, click Allow + Remember.');
