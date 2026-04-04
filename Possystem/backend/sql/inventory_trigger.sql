-- Function to update menu item and variant status when inventory changes
CREATE OR REPLACE FUNCTION update_menu_item_status()
RETURNS TRIGGER AS $$
DECLARE
    -- Variables for iterating
    v_menu_item_id UUID;
    v_variant_option_id UUID;
    v_is_available BOOLEAN;
    v_parent_menu_id UUID;
    v_required_variants_satisfied BOOLEAN;
BEGIN
    -- ---------------------------------------------------------
    -- 1. Handle Direct Menu Item Ingredients (Base Recipe)
    -- ---------------------------------------------------------
    FOR v_menu_item_id IN
        SELECT DISTINCT menu_item_id 
        FROM menu_item_ingredients 
        WHERE inventory_id = NEW.id
    LOOP
        -- Check if ALL ingredients for this menu item are available
        -- We check physically against the inventory table for all ingredients of this item
        SELECT NOT EXISTS (
            SELECT 1
            FROM menu_item_ingredients mii
            JOIN inventory inv ON mii.inventory_id = inv.id
            WHERE mii.menu_item_id = v_menu_item_id
              AND inv.quantity < mii.quantity_required
        ) INTO v_is_available;

        -- Update the menu item status (preliminary - will check variants later)
        UPDATE menu_items 
        SET is_active = v_is_available
        WHERE id = v_menu_item_id;
    END LOOP;

    -- ---------------------------------------------------------
    -- 2. Handle Variant Option Ingredients
    -- ---------------------------------------------------------
    FOR v_variant_option_id IN
        SELECT DISTINCT variant_option_id 
        FROM menu_variant_ingredients 
        WHERE inventory_id = NEW.id
    LOOP
        -- Check availability for this SPECIFIC option
        SELECT NOT EXISTS (
            SELECT 1
            FROM menu_variant_ingredients mvi
            JOIN inventory inv ON mvi.inventory_id = inv.id
            WHERE mvi.variant_option_id = v_variant_option_id
              AND inv.quantity < mvi.quantity_required
        ) INTO v_is_available;

        -- Update the variant option status
        UPDATE menu_variant_options 
        SET is_active = v_is_available
        WHERE id = v_variant_option_id;
        
        -- Identify the parent menu item for Step 3
        SELECT mv.menu_item_id INTO v_parent_menu_id
        FROM menu_variant_options mvo
        JOIN menu_variants mv ON mvo.variant_id = mv.id
        WHERE mvo.id = v_variant_option_id;

        -- ---------------------------------------------------------
        -- 3. Re-evaluate Parent Menu Item based on Variants
        -- ---------------------------------------------------------
        IF v_parent_menu_id IS NOT NULL THEN
            -- Check 1: Are base ingredients still okay? (Re-run check or trust current status? Re-run is safer)
            SELECT NOT EXISTS (
                SELECT 1
                FROM menu_item_ingredients mii
                JOIN inventory inv ON mii.inventory_id = inv.id
                WHERE mii.menu_item_id = v_parent_menu_id
                  AND inv.quantity < mii.quantity_required
            ) INTO v_is_available;

            -- Check 2: Are all REQUIRED variant groups satisfied?
            -- A required group is satisfied if AT LEAST ONE option is active.
            SELECT NOT EXISTS (
                SELECT 1
                FROM menu_variants mv
                WHERE mv.menu_item_id = v_parent_menu_id
                  AND mv.is_required = TRUE
                  AND NOT EXISTS (
                      SELECT 1 
                      FROM menu_variant_options mvo
                      WHERE mvo.variant_id = mv.id
                        AND mvo.is_active = TRUE
                  )
            ) INTO v_required_variants_satisfied;

            -- Final Status: Base Ingredients AND Required Variants must be satisfied
            UPDATE menu_items
            SET is_active = (v_is_available AND v_required_variants_satisfied)
            WHERE id = v_parent_menu_id;
        END IF;

    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the Trigger
DROP TRIGGER IF EXISTS trg_inventory_update_menu_status ON inventory;

CREATE TRIGGER trg_inventory_update_menu_status
AFTER UPDATE OF quantity ON inventory
FOR EACH ROW
EXECUTE FUNCTION update_menu_item_status();
