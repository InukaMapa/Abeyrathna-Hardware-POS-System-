const fs = require('fs');

const filePath = 'd:/Campus/GitHub/Abeyrathna-Hardware-POS-System-/Possystem/frontend/src/pages/admin/inventory/InventoryPage.jsx';
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Remove batches state and fetchBatches
content = content.replace(/const \[batches, setBatches\] = useState\(\[\]\);\n\n    const fetchBatches = async \(\) => \{[\s\S]*?\};\n/m, '');
content = content.replace(/fetchBatches\(\);\n/g, '');

// 2. Remove batch display logic from table
const tableCellRegex = /\{item\.batch_id \? \([\s\S]*?\) : item\.suppliers\?\.supplier_name \|\| \([\s\S]*?\)\}/m;
const newTableCell = `{item.suppliers?.supplier_name || (
                                                        <span className="text-[#666] italic">No Supplier</span>
                                                    )}`;
content = content.replace(tableCellRegex, newTableCell);

// 3. Remove batches prop from Modals
content = content.replace(/batches=\{batches\.filter\(b => b\.calc_status !== 'COMPLETED' && b\.status !== 'COMPLETED'\)\}\n/g, '');
content = content.replace(/batches=\{batches\}\n/g, '');

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Refactored InventoryPage.jsx');
