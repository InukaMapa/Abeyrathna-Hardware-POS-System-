import qz from 'qz-tray';
import { getSavedBillPrinter, getSavedLabelPrinter } from './printerConfig';

// ─── Security setup ──────────────────────────────────────────────────────────
// By default, since we do not define qz.security.setCertificatePromise and
// qz.security.setSignaturePromise, QZ Tray will connect in "unsigned" mode
// and prompt the user to allow printing. If you later add a real certificate,
// define the security promises here.

// ─── Connection helper ────────────────────────────────────────────────────────
/**
 * Connects to QZ Tray if not already connected.
 * Safe to call multiple times; returns true if connected, false on failure.
 */
export const initQZ = async () => {
    if (qz.websocket.isActive()) {
        return true;
    }
    try {
        await qz.websocket.connect();
        console.log('[QZ] Connected to QZ Tray');
        return true;
    } catch (err) {
        console.error('[QZ] Failed to connect to QZ Tray:', err);
        throw err;
    }
};

// ─── Printer discovery ────────────────────────────────────────────────────────
/**
 * Returns the list of all printers visible to QZ Tray.
 * Returns [] if QZ Tray is unreachable.
 */
export const getPrinters = async () => {
    try {
        await initQZ();
        return await qz.printers.find();
    } catch (err) {
        console.error('[QZ] Failed to get printers:', err);
        return [];
    }
};

// ─── Internal helper ──────────────────────────────────────────────────────────
/**
 * Resolves the best bill printer:
 *   explicit arg  →  saved bill printer  →  QZ default
 */
const resolveBillPrinter = async (printerName) => {
    if (printerName) return printerName;
    const saved = getSavedBillPrinter();
    if (saved) return saved;
    return await qz.printers.getDefault();
};

/**
 * Resolves the best label printer:
 *   explicit arg  →  saved label printer  →  saved bill printer  →  QZ default
 */
const resolveLabelPrinter = async (printerName) => {
    if (printerName) return printerName;
    const savedLabel = getSavedLabelPrinter();
    if (savedLabel) return savedLabel;
    const savedBill = getSavedBillPrinter();
    if (savedBill) return savedBill;
    return await qz.printers.getDefault();
};

// ─── Bill / Receipt printing ──────────────────────────────────────────────────
/**
 * Prints a base64 PNG/JPEG receipt image then:
 *   • Sends ESC/POS drawer-kick command
 *   • Sends partial-cut command
 *
 * @param {string} base64Image  – data URI or raw base64 string
 * @param {string|null} printerName – override (uses saved bill printer if omitted)
 */
export const printImageAndOpenDrawer = async (base64Image, printerName = null) => {
    try {
        await initQZ();

        const printer = await resolveBillPrinter(printerName);
        if (!printer) throw new Error('[QZ] No bill printer found');
        console.log('[QZ] Bill printer:', printer);

        // 1. Print receipt image
        if (base64Image) {
            const imageConfig = qz.configs.create(printer, {
                colorType: 'grayscale',
                interpolation: 'nearest-neighbor'
            });
            const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            await qz.print(imageConfig, [
                { type: 'pixel', format: 'image', flavor: 'base64', data: cleanBase64 }
            ]);
        }

        // 2. Drawer kick + paper cut (raw ESC/POS)
        const rawConfig = qz.configs.create(printer);
        await qz.print(rawConfig, [
            { type: 'raw', format: 'plain', data: '\x1B\x70\x00\x19\xFA' }, // drawer kick
            { type: 'raw', format: 'plain', data: '\x1B\x6D' }              // partial cut
        ]);

        return true;
    } catch (err) {
        console.error('[QZ] printImageAndOpenDrawer failed:', err);
        throw err;
    }
};

// ─── Cash drawer ──────────────────────────────────────────────────────────────
/**
 * Opens the cash drawer only (no print).
 */
export const openCashDrawerOnly = async (printerName = null) => {
    try {
        await initQZ();

        const printer = await resolveBillPrinter(printerName);
        if (!printer) throw new Error('[QZ] No bill printer found');

        const config = qz.configs.create(printer);
        await qz.print(config, [
            { type: 'raw', format: 'plain', data: '\x1B\x70\x00\x19\xFA' }
        ]);

        return true;
    } catch (err) {
        console.error('[QZ] openCashDrawerOnly failed:', err);
        throw err;
    }
};

// ─── Label printing ───────────────────────────────────────────────────────────
/**
 * Prints a label from raw HTML content via QZ Tray's pixel/html renderer.
 * NOTE: Requires the JavaFX rendering component installed with QZ Tray.
 *
 * @param {string} htmlContent  – full HTML string
 * @param {string|null} printerName – override
 */
export const printLabelHTML = async (htmlContent, printerName = null) => {
    try {
        await initQZ();

        const printer = await resolveLabelPrinter(printerName);
        if (!printer) throw new Error('[QZ] No label printer found');
        console.log('[QZ] Label printer:', printer);

        const config = qz.configs.create(printer, {
            size: { width: 2, height: 1 },
            units: 'in',
            margins: 0,
            colorType: 'grayscale'
        });

        await qz.print(config, [
            { type: 'pixel', format: 'html', flavor: 'plain', data: htmlContent }
        ]);

        return true;
    } catch (err) {
        console.error('[QZ] printLabelHTML failed:', err);
        throw err;
    }
};

/**
 * Prints a label from a base64 image (preferred – no JavaFX needed).
 *
 * @param {string} base64Image  – data URI or raw base64 string
 * @param {string|null} printerName – override
 */
export const printLabelImage = async (base64Image, printerName = null) => {
    try {
        await initQZ();

        const printer = await resolveLabelPrinter(printerName);
        if (!printer) throw new Error('[QZ] No label printer found');
        console.log('[QZ] Label printer:', printer);

        const config = qz.configs.create(printer, {
            size: { width: 2, height: 1 },
            units: 'in',
            margins: 0,
            colorType: 'grayscale',
            interpolation: 'nearest-neighbor'
        });

        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        await qz.print(config, [
            { type: 'pixel', format: 'image', flavor: 'base64', data: cleanBase64 }
        ]);

        return true;
    } catch (err) {
        console.error('[QZ] printLabelImage failed:', err);
        throw err;
    }
};