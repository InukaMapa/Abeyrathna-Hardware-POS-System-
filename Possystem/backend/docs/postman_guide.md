# Postman Testing Guide for Chill Grand API

This guide explains how to test the "Forgot Password" flow using Postman.

## Prerequisites

1.  **Server Running**: Ensure your backend server is running (`npm run dev`).
2.  **Postman Installed**: Download and install Postman.

## 1. Setup Environment

1.  Open Postman.
2.  Create a new Collection named `Chill Grand Auth`.
3.  Add a variable `baseUrl` with value `http://localhost:5000/api` (or your port).

## 2. Register a User (Optional if you have one)

**Endpoint:** `POST {{baseUrl}}/auth/register`

**Body (JSON):**
```json
{
  "username": "testuser",
  "password": "password123",
  "email": "your_real_email@example.com", 
  "role": "CASHIER"
}
```
> **Note:** Use a real email if you have SMTP configured. If not, check the server console for the OTP.

## 3. Forgot Password (Request OTP)

**Endpoint:** `POST {{baseUrl}}/auth/forgot-password`

**Body (JSON):**
```json
{
  "email": "your_real_email@example.com"
}
```

**What to check:**
- **Response:** Should be `200 OK` with message "OTP sent to email".
- **Console/Email:**
    - If SMTP is configured: Check your email inbox.
    - If SMTP is **NOT** configured: Check the VS Code terminal/console. You will see a box like:
      ```
      ---------------------------------------------------
      [MOCK EMAIL] To: your_real_email@example.com
      Subject: Password Reset OTP
      Text: Your OTP is: 123456. It expires in 10 minutes.
      ---------------------------------------------------
      ```
    - Copy the OTP (e.g., `123456`).

## 4. Verify OTP

**Endpoint:** `POST {{baseUrl}}/auth/verify-otp`

**Body (JSON):**
```json
{
  "email": "your_real_email@example.com",
  "otp": "123456"
}
```
*Replace `123456` with the code you received.*

**What to check:**
- **Response:** Should be `200 OK` with message "OTP verified successfully".

## 5. Reset Password

**Endpoint:** `POST {{baseUrl}}/auth/reset-password`

**Body (JSON):**
```json
{
  "email": "your_real_email@example.com",
  "otp": "123456",
  "newPassword": "newpassword456"
}
```

**What to check:**
- **Response:** Should be `200 OK` with message "Password reset successfully".

## 6. Login with New Password

**Endpoint:** `POST {{baseUrl}}/auth/login`

**Body (JSON):**
```json
{
  "username": "testuser",
  "password": "newpassword456"
}
```

**What to check:**
- **Response:** Should be `200 OK` and return a JWT token.
