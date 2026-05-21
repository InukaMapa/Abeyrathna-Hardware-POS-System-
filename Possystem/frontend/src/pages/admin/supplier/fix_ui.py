import re

filepath = r"d:\Campus\GitHub\Abeyrathna-Hardware-POS-System-\Possystem\frontend\src\pages\admin\supplier\SupplierPage.jsx"

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# We only want to modify the modal part.
# The modal starts at `{/* Professional Enterprise Profile Modal */}`
start_marker = "{/* Professional Enterprise Profile Modal */}"
if start_marker in content:
    before, modal_and_after = content.split(start_marker, 1)
    
    # We also have isGlobalPaymentsOpen modal at the top. Let's just fix the whole file for safe classes,
    # or just the profile modal. The user specifically asked for "overview, history, ledger, return tab wla thyen UI"
    # which is inside the Professional Enterprise Profile Modal.
    
    # The modal overlay class fix:
    modal_and_after = modal_and_after.replace(
        'className="modal-overlay z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-black/70"',
        'className="fixed inset-0 z-[2000] flex items-center justify-center p-6 backdrop-blur-md bg-black/60"'
    )
    
    # Let's do some common replacements for the modal body
    replacements = [
        ('bg-[#1E1E1E]', 'bg-white'),
        ('bg-[#1F1F1F]/50', 'bg-gray-50/50'),
        ('bg-gradient-to-tr from-[#252525] to-[#333]', 'bg-gradient-to-tr from-green-50 to-green-100'),
        ('bg-[#D4AF37]/10', 'bg-green-100'),
        ('text-[#D4AF37]', 'text-green-700'),
        ('border-[#D4AF37]/20', 'border-green-200'),
        ('text-white/30', 'text-gray-500'),
        ('text-white/20', 'text-gray-400'),
        ('text-white/10', 'text-gray-300'),
        ('text-white/40', 'text-gray-500'),
        ('text-white/50', 'text-gray-500'),
        ('text-white/60', 'text-gray-600'),
        ('text-white/70', 'text-gray-700'),
        ('text-white/80', 'text-gray-800'),
        ('text-white', 'text-gray-900'),
        ('border-white/5', 'border-gray-200'),
        ('border-white/10', 'border-gray-300'),
        ('bg-white/[0.01]', 'bg-gray-50'),
        ('bg-white/[0.02]', 'bg-gray-50'),
        ('bg-white/[0.04]', 'bg-gray-100'),
        ('bg-white/5', 'bg-gray-100'),
        ('bg-white/10', 'bg-gray-200'),
        ('bg-[#121212]', 'bg-white'),
        ('border-[#333]', 'border-gray-200'),
        ('text-[#A0A0A0]', 'text-gray-500'),
        ('hover:text-[#D4AF37]', 'hover:text-green-600'),
        ('hover:border-[#D4AF37]', 'hover:border-green-600'),
        ('hover:border-[#D4AF37]/30', 'hover:border-green-300'),
        ('hover:bg-[#222]', 'hover:bg-gray-50'),
        ('hover:bg-white/5', 'hover:bg-gray-100'),
        ('hover:bg-white/10', 'hover:bg-gray-200'),
        ('hover:text-white/40', 'hover:text-gray-700'),
        ('hover:text-white', 'hover:text-gray-900'),
        ('bg-[#252525]', 'bg-white'),
        ('bg-[#2A2A2A]', 'bg-gray-50'),
        ('bg-blue-500/[0.02]', 'bg-blue-50'),
        ('border-blue-500/10', 'border-blue-100'),
        ('text-blue-500/40', 'text-blue-600'),
        ('text-blue-400/60', 'text-blue-600'),
        ('bg-blue-500/10', 'bg-blue-100'),
        ('text-blue-500', 'text-blue-700'),
        ('border-blue-500/20', 'border-blue-200'),
        ('text-blue-500/80', 'text-blue-700'),
        ('bg-[#4caf50]/10', 'bg-green-100'),
        ('text-[#4caf50]', 'text-green-700'),
        ('border-[#4caf50]/20', 'border-green-200'),
    ]
    
    for old, new in replacements:
        modal_and_after = modal_and_after.replace(old, new)
        
    # Re-assemble
    content = before + start_marker + modal_and_after
    
    # Save back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("UI fixed successfully")
else:
    print("Could not find modal start marker")
