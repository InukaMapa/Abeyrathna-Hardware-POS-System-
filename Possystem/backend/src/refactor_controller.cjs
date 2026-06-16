const fs = require('fs');

const filePath = 'd:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/backend/src/controllers/inventoryController.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove buildLedgerEntry, insertBatchLedger, backfillMissingBatchPrices
content = content.replace(/const buildLedgerEntry[\s\S]*?const insertBatchLedger[\s\S]*?const backfillMissingBatchPrices[\s\S]*?};\n\n/m, '');

// 2. In fetchInventoryList: remove stockBatches logic
const stockBatchesRegex = /const itemIds = \(data \|\| \[\]\)\.map\(item => item\.id\);[\s\S]*?if \(status\) {/m;
const newStockBatchesReplacement = `
        let filteredData = data.map(item => {
            let stockStatus = 'In Stock';
            if (item.quantity === 0) stockStatus = 'Out of Stock';
            else if (item.quantity <= item.reorder_level) stockStatus = 'Low Stock';

            return {
                ...item,
                fifo_selling_price: parseFloat(item.selling_price || 0),
                stock_price_tiers: [],
                status: stockStatus
            };
        });

        if (status) {`;
content = content.replace(stockBatchesRegex, newStockBatchesReplacement);

// 3. In fetchInventoryItemDetails: remove batch fetching
const itemDetailsRegex = /\/\/ 2\. Get Batches[\s\S]*?\/\/ 3\. Get History/m;
const newItemDetailsReplacement = `// 3. Get History`;
content = content.replace(itemDetailsRegex, newItemDetailsReplacement);
content = content.replace(/batches: mappedBatches,/, 'batches: [],');
content = content.replace(/supplier_summary: item\.suppliers \|\| batchSupplier,/, 'supplier_summary: item.suppliers,');

// 4. In addInventoryItem: remove batch inserts
content = content.replace(/batch_code,\s*batch_id,/, '');
content = content.replace(/batch_id: batch_id \|\| existing\.batch_id, \/\/ Link to the new batch/, '');
content = content.replace(/await backfillMissingBatchPrices\(itemId, existing\);/, '');
content = content.replace(/batch_id,\s*storage_location/, 'storage_location');
content = content.replace(/\/\/ Add Batch[\s\S]*?\/\/ Log History/m, '// Log History');
content = content.replace(/\/\/ 4\. Record in Batch Ledger[\s\S]*?res\.status\(201\)/m, 'res.status(201)');

// 5. In receiveInventoryStock: remove batch constraints
const receiveRegex = /const receivedQty = parseFloat\(quantity\);[\s\S]*?const newQty = previousQty \+ receivedQty;/m;
const newReceiveReplacement = `const receivedQty = parseFloat(quantity);
        if (!Number.isFinite(receivedQty) || receivedQty <= 0) {
            return res.status(400).json({ message: 'Quantity to add must be greater than zero.' });
        }

        const { data: existing, error: fetchError } = await supabase
            .from('inventory')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ message: 'Inventory item not found.' });
        }

        const previousQty = parseFloat(existing.quantity || 0);
        const newQty = previousQty + receivedQty;`;
content = content.replace(receiveRegex, newReceiveReplacement);
content = content.replace(/batch_id,\s*buying_price/, 'buying_price');
content = content.replace(/supplier_id: batch\.supplier_id \|\| existing\.supplier_id \|\| null,/, 'supplier_id: existing.supplier_id || null,');
content = content.replace(/await insertBatchLedger[\s\S]*?await inventoryService.updateInventoryQuantity/m, 'await inventoryService.updateInventoryQuantity');

// 6. Delete big chunks at the end
content = content.replace(/\/\*\*[\s\*]*Fetch all inventory batches[\s\S]*?\/\*\*[\s\*]*Fetch all pending payout requests/m, '/**\n * Fetch all pending payout requests');
content = content.replace(/inventory_batches\(batch_number\)/, '');
content = content.replace(/\/\*\*[\s\*]*Fetch all pending refund batches[\s\S]*$/m, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed for inventoryController.js');
