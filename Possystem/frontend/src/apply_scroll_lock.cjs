const fs = require('fs');

const addScrollLockToComponent = (filePath, isConditional, conditionVar) => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Ensure useEffect is imported
    if (!content.match(/import.*useEffect.*from 'react'/)) {
        content = content.replace(/import React(?:, \{[^}]*\})? from 'react';/, (match) => {
            if (match.includes('{')) {
                return match.replace('{', '{ useEffect, ');
            } else {
                return "import React, { useEffect } from 'react';";
            }
        });
    }

    // Add useEffect body
    let effectBody = '';
    if (isConditional) {
        effectBody = `
    useEffect(() => {
        if (${conditionVar}) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [${conditionVar}]);
`;
    } else {
        effectBody = `
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);
`;
    }

    // Insert effect right after the first state declaration in the component
    if (!content.includes('document.body.style.overflow')) {
        content = content.replace(/(const \[.*?\] = useState\(.*?\);)/, "$1\n" + effectBody);
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('Updated ' + filePath);
    } else {
        console.log('Already updated ' + filePath);
    }
};

addScrollLockToComponent('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/supplier/AddSupplierModal.jsx', false);
addScrollLockToComponent('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/CategoryManagerModal.jsx', false);
addScrollLockToComponent('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/AddInventoryModal.jsx', false);
addScrollLockToComponent('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/supplier/SupplierReturnsPage.jsx', true, 'showForm');
addScrollLockToComponent('d:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/InventoryPage.jsx', true, 'showBatchModal');
