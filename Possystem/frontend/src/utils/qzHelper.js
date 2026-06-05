import qz from 'qz-tray';

export const initQZ = async () => {
    if (qz.websocket.isActive()) {
        return true;
    }
    
    try {
        await qz.websocket.connect();
        return true;
    } catch (err) {
        console.error('Failed to connect to QZ Tray:', err);
        return false;
    }
};

export const getPrinters = async () => {
    try {
        await initQZ();
        const printers = await qz.printers.find();
        return printers;
    } catch (err) {
        console.error('Failed to get printers:', err);
        return [];
    }
};

export const printImageAndOpenDrawer = async (base64Image, printerName = null) => {
    try {
        await initQZ();
        
        // Find default printer if none specified
        if (!printerName) {
            printerName = await qz.printers.getDefault();
        }
        
        // 1. Print the Receipt Image (Pixel format)
        if (base64Image) {
            const imageConfig = qz.configs.create(printerName, {
                colorType: 'grayscale',
                interpolation: 'nearest-neighbor'
            });
            
            // Remove the data:image/png;base64, part if present
            const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
            const imageData = [{
                type: 'pixel',
                format: 'image',
                flavor: 'base64',
                data: cleanBase64
            }];
            
            await qz.print(imageConfig, imageData);
        }
        
        // 2. Send Raw Commands for Drawer Kick and Cut
        const rawConfig = qz.configs.create(printerName);
        
        const rawData = [
            // ESC/POS command to open cash drawer: ESC p m t1 t2
            {
                type: 'raw',
                format: 'plain',
                data: '\x1B\x70\x00\x19\xFA'
            },
            // Cutter command
            {
                type: 'raw',
                format: 'plain',
                data: '\x1B\x6D' // Partial cut
            }
        ];
        
        await qz.print(rawConfig, rawData);

        return true;
    } catch (err) {
        console.error('Print failed:', err);
        throw err;
    }
};

export const openCashDrawerOnly = async (printerName = null) => {
    try {
        await initQZ();
        
        if (!printerName) {
            printerName = await qz.printers.getDefault();
        }
        
        const config = qz.configs.create(printerName);
        
        const data = [{
            type: 'raw',
            format: 'plain',
            data: '\x1B\x70\x00\x19\xFA' // Open drawer
        }];
        
        await qz.print(config, data);
        return true;
    } catch (err) {
        console.error('Open drawer failed:', err);
        throw err;
    }
};

export const printLabelHTML = async (htmlContent, printerName = null) => {
    try {
        await initQZ();
        
        if (!printerName) {
            // Alternatively, they could search for a printer with "Label" or "Zebra" in the name
            printerName = await qz.printers.getDefault();
        }
        
        // Configuration for label printing. 
        // Adjust the size width/height based on the physical label size (in inches or mm).
        // Defaulting to 2x1 inches which is standard for small barcodes.
        const config = qz.configs.create(printerName, {
            size: { width: 2, height: 1 },
            units: 'in',
            margins: 0,
            colorType: 'grayscale'
        });
        
        const data = [{
            type: 'pixel',
            format: 'html',
            flavor: 'plain',
            data: htmlContent
        }];
        
        await qz.print(config, data);
        return true;
    } catch (err) {
        console.error('Label print failed:', err);
        throw err;
    }
};

export const printLabelImage = async (base64Image, printerName = null) => {
    try {
        await initQZ();
        
        if (!printerName) {
            printerName = await qz.printers.getDefault();
        }
        
        const config = qz.configs.create(printerName, {
            size: { width: 2, height: 1 },
            units: 'in',
            margins: 0,
            colorType: 'grayscale',
            interpolation: 'nearest-neighbor'
        });
        
        const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');
        const data = [{
            type: 'pixel',
            format: 'image',
            flavor: 'base64',
            data: cleanBase64
        }];
        
        await qz.print(config, data);
        return true;
    } catch (err) {
        console.error('Label image print failed:', err);
        throw err;
    }
};
