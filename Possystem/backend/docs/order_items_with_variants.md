/**
 * ============================================================
 * ORDER ITEM WITH VARIANTS - TEST DOCUMENTATION
 * ============================================================
 * 
 * This file contains example requests and expected responses
 * for testing the order item variant feature
 * 
 * SETUP REQUIRED:
 * 1. Apply schema: node scripts/apply_schema.js sql/order_item_variants_schema.sql
 * 2. Ensure menu items have variants configured
 * 3. Have valid JWT token for CASHIER role
 * 4. Have an active order ID
 */

// ============================================================
// EXAMPLE 1: Add item with single-choice variant (Size)
// ============================================================
const example1 = {
    endpoint: 'POST /api/orders/:orderId/items',
    headers: {
        'Authorization': 'Bearer YOUR_JWT_TOKEN',
        'Content-Type': 'application/json'
    },
    body: {
        "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "quantity": 2,
        "variants": [
            {
                "variant_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
                "option_id": "b2c3d4e5-f678-9012-bcde-f12345678901"
            }
        ]
    },
    expected_success: {
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
};

// ============================================================
// EXAMPLE 2: Add item with multiple variants (Size + Toppings)
// ============================================================
const example2 = {
    endpoint: 'POST /api/orders/:orderId/items',
    body: {
        "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
        "quantity": 1,
        "variants": [
            {
                "variant_id": "size-variant-id",
                "option_id": "medium-option-id"
            },
            {
                "variant_id": "toppings-variant-id",
                "option_id": "extra-cheese-option-id"
            },
            {
                "variant_id": "toppings-variant-id",
                "option_id": "mushrooms-option-id"
            }
        ]
    },
    expected_success: {
        "success": true,
        "message": "Item added to order successfully",
        "data": {
            "order_item_id": "uuid",
            "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
            "item_name": "Margherita Pizza",
            "quantity": 1,
            "base_price": 899.00,
            "unit_price": 1049.00,
            "total_price": 1049.00,
            "variants": [
                {
                    "variant_name": "Size",
                    "option_name": "Medium",
                    "price_delta": 50.00
                },
                {
                    "variant_name": "Extra Toppings",
                    "option_name": "Extra Cheese",
                    "price_delta": 50.00
                },
                {
                    "variant_name": "Extra Toppings",
                    "option_name": "Mushrooms",
                    "price_delta": 50.00
                }
            ]
        }
    }
};

// ============================================================
// ERROR SCENARIOS
// ============================================================

// Error 1: Missing required variant
const error1 = {
    body: {
        "menu_item_id": "item-with-required-size",
        "quantity": 1,
        "variants": []
    },
    expected_error: {
        "error": "\"Size\" is required but not provided"
    },
    status: 400
};

// Error 2: Inactive menu item
const error2 = {
    body: {
        "menu_item_id": "inactive-item-id",
        "quantity": 1,
        "variants": []
    },
    expected_error: {
        "error": "Menu item \"Discontinued Pizza\" is not available"
    },
    status: 400
};

// Error 3: Inactive variant option
const error3 = {
    body: {
        "menu_item_id": "valid-item-id",
        "quantity": 1,
        "variants": [
            {
                "variant_id": "size-variant-id",
                "option_id": "out-of-stock-size-id"
            }
        ]
    },
    expected_error: {
        "error": "Option \"Extra Large\" for \"Size\" is not available"
    },
    status: 400
};

// Error 4: Exceeding max selections
const error4 = {
    body: {
        "menu_item_id": "pizza-id",
        "quantity": 1,
        "variants": [
            {
                "variant_id": "toppings-variant-id",
                "option_id": "option1"
            },
            {
                "variant_id": "toppings-variant-id",
                "option_id": "option2"
            },
            {
                "variant_id": "toppings-variant-id",
                "option_id": "option3"
            },
            {
                "variant_id": "toppings-variant-id",
                "option_id": "option4"
            }
        ]
    },
    expected_error: {
        "error": "\"Extra Toppings\" allows maximum 3 selection(s), but 4 provided"
    },
    status: 400
};

// Error 5: Below min selections
const error5 = {
    body: {
        "menu_item_id": "build-your-own-pizza",
        "quantity": 1,
        "variants": [
            {
                "variant_id": "base-variant-id-min-2",
                "option_id": "option1"
            }
        ]
    },
    expected_error: {
        "error": "\"Base Sauce\" requires at least 2 selection(s), but only 1 provided"
    },
    status: 400
};

// Error 6: Invalid variant option ID
const error6 = {
    body: {
        "menu_item_id": "valid-item-id",
        "quantity": 1,
        "variants": [
            {
                "variant_id": "size-variant-id",
                "option_id": "non-existent-option-id"
            }
        ]
    },
    expected_error: {
        "error": "Invalid option ID \"non-existent-option-id\" for variant \"Size\""
    },
    status: 400
};

// Error 7: Adding to closed order
const error7 = {
    endpoint: 'POST /api/orders/closed-order-id/items',
    expected_error: {
        "error": "Cannot add items to a closed order"
    },
    status: 400
};

// ============================================================
// VALIDATION RULES SUMMARY
// ============================================================
const validationRules = {
    "Menu Item": [
        "✓ Must exist in database",
        "✓ Must be is_active = true",
        "✓ Price fetched from database (not trusted from frontend)"
    ],
    "Quantity": [
        "✓ Must be positive integer",
        "✓ Greater than 0"
    ],
    "Required Variants": [
        "✓ Must have at least one option selected",
        "✓ Cannot be omitted if is_required = true"
    ],
    "Variant Options": [
        "✓ Must belong to the correct variant",
        "✓ Must be is_active = true",
        "✓ Option ID must exist in database"
    ],
    "Min/Max Selections": [
        "✓ Selection count >= min_selections",
        "✓ Selection count <= max_selections",
        "✓ Enforced per variant group"
    ],
    "Price Calculation": [
        "✓ Server-side only",
        "✓ total_price = (base_price + SUM(price_delta)) * quantity",
        "✓ Frontend prices are NEVER trusted"
    ],
    "Order State": [
        "✓ Order must exist",
        "✓ Order must not be closed (status != 'CLOSED')",
        "✓ Order total automatically updated"
    ]
};

// ============================================================
// DATABASE QUERIES FOR VERIFICATION
// ============================================================
const verificationQueries = {
    "Check order item was created": `
        SELECT * FROM order_items 
        WHERE order_id = 'your-order-id' 
        ORDER BY created_at DESC 
        LIMIT 1;
    `,
    
    "Check variant selections were saved": `
        SELECT 
            oiv.*,
            oi.item_name,
            oi.base_price,
            oi.total_price
        FROM order_item_variants oiv
        JOIN order_items oi ON oi.id = oiv.order_item_id
        WHERE oi.order_id = 'your-order-id'
        ORDER BY oiv.created_at DESC;
    `,
    
    "Verify price calculation": `
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
                oi.base_price + (
                    SELECT COALESCE(SUM(price_delta), 0) 
                    FROM order_item_variants 
                    WHERE order_item_id = oi.id
                )
            ) as calculated_unit_price
        FROM order_items oi
        WHERE oi.order_id = 'your-order-id';
    `,
    
    "Check order total updated correctly": `
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
    `
};

// ============================================================
// CURL EXAMPLES
// ============================================================
const curlExamples = `
# Add item with size variant
curl -X POST http://localhost:3000/api/orders/123/items \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "menu_item_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "quantity": 2,
    "variants": [
      {
        "variant_id": "size-variant-uuid",
        "option_id": "large-option-uuid"
      }
    ]
  }'

# Add item with multiple variant selections
curl -X POST http://localhost:3000/api/orders/123/items \\
  -H "Authorization: Bearer YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "menu_item_id": "pizza-uuid",
    "quantity": 1,
    "variants": [
      {
        "variant_id": "size-variant-uuid",
        "option_id": "medium-uuid"
      },
      {
        "variant_id": "toppings-variant-uuid",
        "option_id": "cheese-uuid"
      },
      {
        "variant_id": "toppings-variant-uuid",
        "option_id": "pepperoni-uuid"
      }
    ]
  }'

# Get order item details with variants
curl -X GET http://localhost:3000/api/orders/items/order-item-uuid \\
  -H "Authorization: Bearer YOUR_TOKEN"
`;

export { 
    example1, 
    example2, 
    error1, 
    error2, 
    error3, 
    error4, 
    error5, 
    error6, 
    error7,
    validationRules,
    verificationQueries,
    curlExamples
};
