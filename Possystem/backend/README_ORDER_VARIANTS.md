# Order Items with Variants - Complete Implementation

## 📋 Overview

This implementation adds **production-ready variant support** to the order system, allowing menu items to have customizable options (size, toppings, etc.) that affect pricing.

### ✨ Key Features

- ✅ **POS-Safe**: No trust in frontend, all validation server-side
- ✅ **Full Validation**: Required variants, min/max selections, active status
- ✅ **Audit Trail**: Snapshot values prevent data loss from menu changes
- ✅ **Automatic Pricing**: Server calculates all prices
- ✅ **Relational Design**: Proper foreign keys and cascading deletes

---

## 🗄️ Database Schema

### New Table: `order_item_variants`

```sql
CREATE TABLE order_item_variants (
    order_item_variant_id UUID PRIMARY KEY,
    order_item_id UUID REFERENCES order_items(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES menu_variants(id) ON DELETE RESTRICT,
    variant_option_id UUID REFERENCES menu_variant_options(id) ON DELETE RESTRICT,
    
    -- Snapshot values for audit safety
    variant_name VARCHAR(100) NOT NULL,
    option_name VARCHAR(100) NOT NULL,
    price_delta DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Updated: `order_items`

Added columns:
- `base_price`: Original menu item price
- `total_price`: Final price including variants

---

## 🔧 Implementation Files

### 1. Database Schema
**File**: `sql/order_item_variants_schema.sql`
- Creates `order_item_variants` table
- Updates `order_items` table
- Adds indexes for performance

### 2. Service Layer
**File**: `src/services/orderService.js`
- `addOrderItem()`: Main business logic
- `validateVariants()`: Comprehensive validation
- `recalculateOrderTotal()`: Updates order totals
- `getOrderItemWithVariants()`: Fetches item details

### 3. Controller Layer
**File**: `src/controllers/orderController.js`
- `addOrderItem`: POST endpoint handler
- `getOrderItem`: GET endpoint handler
- Error handling and response formatting

### 4. Routes
**File**: `src/routes/orderRoutes.js`
- `POST /api/orders/:orderId/items` - Add item to order
- `GET /api/orders/items/:orderItemId` - Get item details

---

## 🚀 Quick Start

### Step 1: Apply Database Schema

```bash
# Option A: Using the script
node apply_order_variants_schema.js

# Option B: Manual (Supabase SQL Editor)
# Copy contents of sql/order_item_variants_schema.sql and execute
```

### Step 2: Start the Server

```bash
npm start
```

### Step 3: Test the API

```bash
node test_order_item_variants.js
```

---

## 📡 API Usage

### Add Item to Order

**Endpoint**: `POST /api/orders/:orderId/items`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

**Request Body**:
```json
{
  "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "quantity": 2,
  "variants": [
    {
      "variant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "option_id": "b2c3d4e5-f678-9012-bcde-f12345678901"
    }
  ]
}
```

**Success Response** (201):
```json
{
  "success": true,
  "message": "Item added to order successfully",
  "data": {
    "order_item_id": "uuid",
    "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "item_name": "Margherita Pizza",
    "quantity": 2,
    "base_price": 899.00,
    "unit_price": 999.00,
    "total_price": 1998.00,
    "variants": [
      {
        "variant_name": "Size",
        "option_name": "Large",
        "price_delta": 100.00
      }
    ]
  }
}
```

### Get Order Item Details

**Endpoint**: `GET /api/orders/items/:orderItemId`

**Headers**:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**Success Response** (200):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "order_id": "uuid",
    "item_name": "Margherita Pizza",
    "quantity": 2,
    "base_price": 899.00,
    "total_price": 1998.00,
    "variants": [
      {
        "order_item_variant_id": "uuid",
        "variant_name": "Size",
        "option_name": "Large",
        "price_delta": 100.00
      }
    ]
  }
}
```

---

## ✅ Validation Rules

### Menu Item Validation
- ✓ Must exist in database
- ✓ Must be `is_active = true`
- ✓ Price fetched from database (never from frontend)

### Quantity Validation
- ✓ Must be positive integer
- ✓ Greater than 0

### Required Variants
- ✓ Must have at least one option selected
- ✓ Cannot be omitted if `is_required = true`

### Variant Options
- ✓ Must belong to the correct variant
- ✓ Must be `is_active = true`
- ✓ Option ID must exist in database

### Min/Max Selections
- ✓ Selection count >= `min_selections`
- ✓ Selection count <= `max_selections`
- ✓ Enforced per variant group

### Price Calculation
- ✓ **Server-side only**
- ✓ Formula: `total_price = (base_price + SUM(price_delta)) * quantity`
- ✓ Frontend prices are **NEVER** trusted

### Order State
- ✓ Order must exist
- ✓ Order must not be closed (`status != 'CLOSED'`)
- ✓ Order total automatically updated

---

## ❌ Error Scenarios

### Missing Required Variant
```json
{
  "error": "\"Size\" is required but not provided"
}
```

### Inactive Menu Item
```json
{
  "error": "Menu item \"Discontinued Pizza\" is not available"
}
```

### Inactive Option
```json
{
  "error": "Option \"Extra Large\" for \"Size\" is not available"
}
```

### Exceeding Max Selections
```json
{
  "error": "\"Extra Toppings\" allows maximum 3 selection(s), but 4 provided"
}
```

### Below Min Selections
```json
{
  "error": "\"Base Sauce\" requires at least 2 selection(s), but only 1 provided"
}
```

### Invalid Option ID
```json
{
  "error": "Invalid option ID \"non-existent-id\" for variant \"Size\""
}
```

### Closed Order
```json
{
  "error": "Cannot add items to a closed order"
}
```

---

## 🧪 Testing

### Run Automated Tests
```bash
node test_order_item_variants.js
```

### Manual Testing with cURL

#### Add item with variant:
```bash
curl -X POST http://localhost:3000/api/orders/123/items \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "menu_item_id": "uuid",
    "quantity": 2,
    "variants": [
      {
        "variant_id": "size-variant-uuid",
        "option_id": "large-option-uuid"
      }
    ]
  }'
```

#### Get order item:
```bash
curl -X GET http://localhost:3000/api/orders/items/order-item-uuid \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🔍 Verification Queries

### Check order item was created:
```sql
SELECT * FROM order_items 
WHERE order_id = 'your-order-id' 
ORDER BY created_at DESC 
LIMIT 1;
```

### Check variant selections:
```sql
SELECT 
    oiv.*,
    oi.item_name,
    oi.base_price,
    oi.total_price
FROM order_item_variants oiv
JOIN order_items oi ON oi.id = oiv.order_item_id
WHERE oi.order_id = 'your-order-id'
ORDER BY oiv.created_at DESC;
```

### Verify price calculation:
```sql
SELECT 
    oi.item_name,
    oi.quantity,
    oi.base_price,
    oi.item_price as unit_price,
    oi.total_price,
    (
        SELECT SUM(price_delta) 
        FROM order_item_variants 
        WHERE order_item_id = oi.id
    ) as total_variant_delta,
    (
        oi.base_price + COALESCE(
            (SELECT SUM(price_delta) 
             FROM order_item_variants 
             WHERE order_item_id = oi.id), 0
        )
    ) as calculated_unit_price
FROM order_items oi
WHERE oi.order_id = 'your-order-id';
```

### Check order total:
```sql
SELECT 
    o.order_id,
    o.total_amount,
    (
        SELECT SUM(total_price) 
        FROM order_items 
        WHERE order_id = o.order_id
    ) as calculated_total
FROM orders o
WHERE o.order_id = 'your-order-id';
```

---

## 🔐 Security Features

1. **No Frontend Trust**: All prices calculated server-side
2. **Active Status Check**: Inactive items/options rejected
3. **Foreign Key Constraints**: Data integrity enforced at DB level
4. **Cascading Deletes**: Cleanup handled automatically
5. **Audit Trail**: Snapshot values preserve history
6. **Input Validation**: All inputs sanitized and validated
7. **Role-Based Access**: CASHIER role required

---

## 📊 Price Calculation Flow

```
1. Fetch menu item base price from database
2. For each selected variant option:
   a. Validate option exists and is active
   b. Add option's price_delta to running total
3. Calculate unit_price = base_price + SUM(price_deltas)
4. Calculate total_price = unit_price * quantity
5. Store all values in database
6. Recalculate order total
```

---

## 🎯 Business Rules Enforced

1. **One active order per table** (from existing system)
2. **Required variants must be selected**
3. **Min/max selection counts enforced**
4. **Only active items can be ordered**
5. **Only active options can be selected**
6. **Cannot modify closed orders**
7. **Server calculates all prices**
8. **Order totals auto-update**

---

## 📚 Related Documentation

- **API Examples**: `docs/order_items_with_variants.md`
- **Database Schema**: `sql/order_item_variants_schema.sql`
- **Service Logic**: `src/services/orderService.js`
- **Controller Logic**: `src/controllers/orderController.js`

---

## 🐛 Troubleshooting

### Issue: "order_item_variants table does not exist"
**Solution**: Run schema application script
```bash
node apply_order_variants_schema.js
```

### Issue: "Failed to insert variants"
**Cause**: Rollback triggered, order item deleted
**Check**: Validate variant IDs and option IDs are correct

### Issue: "Price mismatch"
**Check**: Verify price_delta values in database
**Run**: Price verification query (see Verification section)

### Issue: "Auth middleware error"
**Solution**: Ensure JWT token is valid and user has CASHIER role

---

## 🎉 Summary

This implementation provides a **production-ready**, **POS-safe** variant system with:

- ✅ Complete server-side validation
- ✅ Audit trail with snapshot values
- ✅ Automatic price calculation
- ✅ Proper relational database design
- ✅ Comprehensive error handling
- ✅ Full test coverage
- ✅ Complete documentation

**Status**: Ready for production deployment 🚀
