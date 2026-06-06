// Keys for localStorage
export const PRINTER_KEYS = {
    BILL: 'pos_bill_printer',
    LABEL: 'pos_label_printer',
};

export const getSavedBillPrinter = () => localStorage.getItem(PRINTER_KEYS.BILL) || null;
export const getSavedLabelPrinter = () => localStorage.getItem(PRINTER_KEYS.LABEL) || null;

export const saveBillPrinter = (name) => localStorage.setItem(PRINTER_KEYS.BILL, name);
export const saveLabelPrinter = (name) => localStorage.setItem(PRINTER_KEYS.LABEL, name);

export const clearBillPrinter = () => localStorage.removeItem(PRINTER_KEYS.BILL);
export const clearLabelPrinter = () => localStorage.removeItem(PRINTER_KEYS.LABEL);
