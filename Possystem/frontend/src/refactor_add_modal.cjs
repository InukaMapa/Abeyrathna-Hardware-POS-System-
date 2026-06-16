const fs = require('fs');

const filePath = 'd:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/AddInventoryModal.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove batches from props
content = content.replace(/categories = \[\], batches = \[\]/g, 'categories = []');

// 2. Remove batch_id from initial state
content = content.replace(/batch_id: '',\n\s*/g, '');

// 3. Remove filteredBatches
content = content.replace(/const filteredBatches = [\s\S]*?: batches;\n\n/m, '');

// 4. Remove replacement tab and views completely
content = content.replace(/<button\s+title="Replacement Items"[\s\S]*?<\/button>/m, '');
const replacementBodyRegex = /\{showReplacementPicker \? \([\s\S]*?\) : \(/m;
content = content.replace(replacementBodyRegex, '(');

// 5. Remove 'showReplacementPicker' state
content = content.replace(/const \[showReplacementPicker, setShowReplacementPicker\] = useState\(false\);\n/m, '');

// 6. Fix "Manual Entry" button active class since there is no replacement picker anymore
content = content.replace(/className={`add-inventory-tab \$\{!showReplacementPicker \? 'active' : ''\}`}/m, 'className="add-inventory-tab active"');

// 7. Fix 'onClick={() => setShowReplacementPicker(false)}' on manual entry button
content = content.replace(/onClick=\{\(\) => setShowReplacementPicker\(false\)\}\n/m, '');

// 8. Remove Select Products Batch Dropdown
content = content.replace(/<div className="add-inventory-full add-inventory-batch">[\s\S]*?<\/div>/m, '');

// 9. Remove `!showReplacementPicker && (` and the closing `)` around submit button
content = content.replace(/\{\!showReplacementPicker && \(\n([\s\S]*?)\)\}/m, '$1');

// 10. Fix batch_id reset in handleSupplierChange
content = content.replace(/batch_id: '' \/\/ Reset selected batch\n\s*/g, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactored AddInventoryModal.jsx');
