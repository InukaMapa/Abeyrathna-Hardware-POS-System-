const fs = require('fs');

const filePath = 'd:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/backend/src/controllers/orderController.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Replace getStockAllocations and consumeOrderStock
const newHelpers = `
const consumeOrderStock = async (orderId) => {
    const { data: orderItems, error } = await supabase
        .from('order_items')
        .select('item_id, quantity')
        .eq('order_id', orderId);

    if (error) throw error;

    for (const item of orderItems || []) {
        const qty = parseFloat(item.quantity || 0);
        if (!item.item_id || qty <= 0) continue;

        const { data: inventoryItem, error: invFetchError } = await supabase
            .from('inventory')
            .select('quantity')
            .eq('id', item.item_id)
            .single();

        if (invFetchError || !inventoryItem) continue;

        const nextQuantity = Math.max(0, parseFloat(inventoryItem.quantity || 0) - qty);
        await supabase
            .from('inventory')
            .update({ quantity: nextQuantity, last_updated: new Date() })
            .eq('id', item.item_id);
    }
};
`;

content = content.replace(/const getStockAllocations = async \([\s\S]*?const consumeOrderStock = async \(orderId\) => \{[\s\S]*?\}\;\n/m, newHelpers);

// 2. Refactor the items loop in createOrder
const itemsLoopRegex = /const allocations = await getStockAllocations\(invItem, quantity\);[\s\S]*?\}\n        \}/m;
const newItemsLoop = `const unitPrice = parseFloat(invItem.selling_price || 0);
            const buyingPrice = parseFloat(invItem.buying_price || 0);
            const subtotal = unitPrice * quantity;
            totalAmount += subtotal;

            orderItemsData.push({
                item_id: invItem.id,
                item_name: invItem.ingredient_name,
                item_price: unitPrice,
                quantity: quantity,
                subtotal,
                selected_variants: []
            });
        }`;

content = content.replace(itemsLoopRegex, newItemsLoop);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactoring completed for orderController.js');
