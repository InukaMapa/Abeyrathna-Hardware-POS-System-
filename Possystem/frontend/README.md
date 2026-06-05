# Abeyrathna Hardware POS - Frontend

A role-based Hardware Point of Sale (POS) frontend for Abeyrathna Trade Center. The app supports ADMIN and CASHIER workflows for inventory, billing, orders, suppliers, staff, cash counter operations, reports, barcode use, and receipt printing through the browser.

## Features

### Authentication and Authorization
- JWT-based login
- ADMIN and CASHIER role access
- Protected pages
- Persistent login across refresh

### Admin Features
- Dashboard with KPIs and metrics
- Product and inventory management
- Barcode generation and printing
- Supplier management
- Supplier returns and recent purchases
- Staff management
- Cash management
- Reports and analytics

### Cashier Features
- Create customer orders
- Scan or type product barcodes
- Add products to bill
- Edit quantities
- Open and complete bills
- Print receipts
- Cash counter and shift handling

### Hardware Support
- USB barcode scanner in HID/Keyboard mode
- Browser-based receipt printing
- Cash drawer through receipt printer driver settings
- Optional barcode label printer for product labels

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Backend API running on `http://localhost:5000`

### Installation

```bash
cd abeyrathna-hardware-pos-frontend
npm install
npm run dev
```

The application will be available at `http://localhost:5173`.

### Test Login

Admin:
```text
Username: admin
Password: your admin password
```

Cashier:
```text
Username: cashier
Password: your cashier password
```

## API Configuration

Edit `src/config/api.js` or set an environment variable:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

For local development, the app can use `/api` with the Vite proxy.

## Main User Roles

ADMIN:
- Full system access
- Inventory/product control
- Supplier management
- Staff management
- Reports
- Cash management

CASHIER:
- Order processing
- Barcode billing
- Bill closing
- Receipt printing
- Cash counter access

## Scripts

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Production Notes

- Use secure backend and frontend environment variables.
- Do not expose `.env` files to customers or public repositories.
- Configure barcode scanner to USB HID/Keyboard mode.
- Configure receipt printer in Windows before printing receipts.
- Configure cash drawer to open after print in receipt printer settings.

## License

This project is proprietary software for Abeyrathna Trade Center.
