const fs = require('fs');

const fixFile = (filePath) => {
    let content = fs.readFileSync(filePath, 'utf-8');
    
    // In EditInventoryModal:
    if (filePath.includes('EditInventoryModal')) {
        content = content.replace(/                            <\/div>\n                        <\/div>\n                    <\/form>/g, '                        </div>\n                    </form>');
    }
    
    // In ReceiveInventoryModal:
    if (filePath.includes('ReceiveInventoryModal')) {
        content = content.replace(/                                <\/div>\n\n                                <div className="add-inventory-split add-inventory-full">/g, '\n                                <div className="add-inventory-split add-inventory-full">');
    }
    
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('Fixed', filePath);
};

fixFile('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/EditInventoryModal.jsx');
fixFile('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/ReceiveInventoryModal.jsx');
