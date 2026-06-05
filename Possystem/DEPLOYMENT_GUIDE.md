# Abeyrathna POS Deployment Guide

## 1. What Was Configured

- Frontend API URL is now controlled by `VITE_API_BASE_URL`.
- Local frontend can still use `/api` with the Vite proxy.
- QR order links are now controlled by `VITE_QR_ORDER_BASE_URL`.
- Backend CORS is now controlled by `CORS_ORIGINS`.
- Backend now has a health check endpoint: `/api/health`.

## 2. Recommended Hosting Setup

Use this split:

- Backend: Render, Railway, Fly.io, or VPS
- Frontend: Vercel, Netlify, Render Static Site, or Cloudflare Pages
- Database/auth/storage: existing Supabase project

For the fastest client-ready deployment, use Render for backend and Vercel for frontend.

## 3. Backend Hosting Steps

1. Push the project to GitHub.
2. Create a new backend web service.
3. Set root directory:
   ```text
   Possystem/backend
   ```
4. Set build command:
   ```text
   npm install
   ```
5. Set start command:
   ```text
   npm start
   ```
6. Add environment variables:
   ```text
   PORT=5000
   NODE_ENV=production
   JWT_SECRET=use-a-long-random-secret
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_KEY=your-service-role-key
   CORS_ORIGINS=https://your-frontend-domain.com,http://localhost:5173
   SMTP_HOST=your-smtp-host
   SMTP_PORT=587
   SMTP_USER=your-smtp-user
   SMTP_PASS=your-smtp-password
   SMTP_FROM="Abeyrathna Trade Center Support" <no-reply@yourdomain.com>
   AWS_ACCESS_KEY_ID=optional
   AWS_SECRET_ACCESS_KEY=optional
   AWS_REGION=ap-south-1
   AWS_BUCKET_NAME=optional
   ```
7. Deploy backend.
8. Test:
   ```text
   https://your-backend-domain.com/api/health
   ```
   Expected response:
   ```json
   { "ok": true }
   ```

## 4. Frontend Hosting Steps

1. Create a frontend static site.
2. Set root directory:
   ```text
   Possystem/frontend
   ```
3. Set build command:
   ```text
   npm install && npm run build
   ```
4. Set output directory:
   ```text
   dist
   ```
5. Add environment variables:
   ```text
   VITE_API_BASE_URL=https://your-backend-domain.com/api
   VITE_APP_BASE_URL=https://your-frontend-domain.com
   VITE_QR_ORDER_BASE_URL=https://your-frontend-domain.com/landing
   ```
6. Add SPA rewrite rule:
   ```text
   /* -> /index.html
   ```
7. Deploy frontend.

## 5. Local Development Setup

Backend:
```text
cd Possystem/backend
npm install
npm run dev
```

Frontend:
```text
cd Possystem/frontend
copy .env.example .env
npm install
npm run dev
```

Local frontend should run on:
```text
http://localhost:5173
```

Local backend should run on:
```text
http://localhost:5000
```

## 6. Required Smoke Test Checklist

Run these after deployment:

- Open backend health: `/api/health`
- Open frontend URL
- Login as admin
- Login as cashier
- Admin dashboard loads
- Supplier page loads
- Recent purchases filters work: All time, Today, This month, This year
- Inventory page loads
- Add inventory item
- Receive inventory stock
- Supplier purchase batch creates correctly
- Supplier payment/due status updates
- Cashier shift opens
- Cashier can create order
- Barcode input finds item by item code
- Bill opens
- Payment closes bill
- Cash counter records denominations
- Reports page loads
- User logout/login works after refresh
- Browser refresh on every major page does not show 404

## 7. Hardware Checklist

Barcode scanner:

- Most USB barcode scanners work as keyboard input.
- Plug scanner into cashier PC.
- Open cashier order page.
- Click/focus barcode input.
- Scan barcode.
- Confirm item is added or selected.
- If scan includes Enter suffix, check the app submits correctly.

Receipt printer:

- This codebase currently has no direct ESC/POS printer integration.
- For tomorrow, use browser print or PDF print if available in the UI.
- Install printer driver on cashier PC.
- Set printer as Windows default printer.
- Test from Notepad first.
- Test browser print from Chrome/Edge.

Cash drawer:

- Cash drawers usually connect through receipt printer RJ11/RJ12 port.
- The app currently has no direct drawer-open command.
- If using browser print, drawer may open only if the printer driver is configured to open drawer after print.

Scale/card terminal:

- No direct serial/USB integration is currently configured in code.
- Treat external card terminal as manual payment entry unless a separate API/device integration is added.

## 8. Executable or Installer Options

The current app is a web app, not an Electron/Tauri desktop app. You have three practical choices:

Option A: Browser/PWA shortcut for tomorrow

- Deploy frontend and backend.
- On cashier PC, open frontend in Chrome/Edge.
- Install as app from browser menu if available.
- Pin to taskbar.
- Use full-screen/kiosk mode if needed.

Option B: Windows kiosk shortcut

Create a shortcut target like:
```text
msedge.exe --kiosk https://your-frontend-domain.com --edge-kiosk-type=fullscreen
```

Option C: Real installer later

- Add Electron or Tauri wrapper.
- Configure auto-start URL or bundled frontend.
- Add native printer/barcode/device integration.
- Build Windows `.exe` or `.msi`.

For tomorrow, Option A is safest because it uses the same hosted app the client will test.

## 9. Production Cutover Order

1. Deploy backend first.
2. Test `/api/health`.
3. Deploy frontend with hosted backend URL.
4. Update backend `CORS_ORIGINS` with final frontend URL.
5. Generate new QR codes only after `VITE_QR_ORDER_BASE_URL` points to the final frontend URL.
6. Test admin.
7. Test cashier.
8. Test hardware.
9. Create admin/cashier demo accounts.
10. Backup Supabase before client demo.

## 10. Emergency Rollback

Keep these ready:

- Previous frontend deploy URL
- Previous backend deploy
- Supabase backup/export
- Local fallback:
  ```text
  cd Possystem/backend && npm start
  cd Possystem/frontend && npm run dev
  ```

