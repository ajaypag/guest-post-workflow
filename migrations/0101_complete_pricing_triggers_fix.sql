-- Migration: Complete fix for pricing triggers and NULL handling
-- This migration fixes the calculate_and_update_guest_post_cost function to properly set NULL
-- when no active offerings exist, and creates all necessary triggers

-- Drop existing triggers and functions to start fresh
DROP TRIGGER IF EXISTS update_website_pricing_on_offering_change ON publisher_offerings CASCADE;
DROP TRIGGER IF EXISTS update_website_pricing_on_relationship_change ON publisher_offering_relationships CASCADE;
DROP TRIGGER IF EXISTS update_website_pricing_on_strategy_change ON websites CASCADE;
DROP FUNCTION IF EXISTS trigger_update_website_pricing() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_website_pricing_on_strategy() CASCADE;

-- Create or replace the calculation function with NULL handling fix
CREATE OR REPLACE FUNCTION calculate_and_update_guest_post_cost(
    website_id_param UUID,
    strategy_param VARCHAR DEFAULT NULL,
    custom_offering_param UUID DEFAULT NULL
) RETURNS INTEGER AS $$
DECLARE
    calculated_price INTEGER;
    override_offering_id UUID;
    pricing_strategy_to_use VARCHAR;
    custom_offering_to_use UUID;
BEGIN
    -- Determine which strategy to use
    IF strategy_param IS NOT NULL THEN
        pricing_strategy_to_use := strategy_param;
    ELSE
        -- Get current strategy from website
        SELECT pricing_strategy, custom_offering_id
        INTO pricing_strategy_to_use, custom_offering_to_use
        FROM websites WHERE id = website_id_param;
        
        -- Default to min_price if null
        IF pricing_strategy_to_use IS NULL THEN
            pricing_strategy_to_use := 'min_price';
        END IF;
    END IF;
    
    -- Use provided custom offering or existing one
    IF custom_offering_param IS NOT NULL THEN
        custom_offering_to_use := custom_offering_param;
    END IF;
    
    -- Check for manual override first (legacy field)
    SELECT price_override_offering_id INTO override_offering_id
    FROM websites WHERE id = website_id_param;
    
    IF override_offering_id IS NOT NULL THEN
        -- Use manual override offering
        SELECT po.base_price INTO calculated_price
        FROM publisher_offerings po
        WHERE po.id = override_offering_id
          AND po.is_active = true
          AND po.offering_type = 'guest_post';
        
        -- Update website with override price (even if NULL)
        UPDATE websites
        SET 
            guest_post_cost = calculated_price,
            guest_post_cost_source = CASE 
                WHEN calculated_price IS NOT NULL THEN 'derived_override'
                ELSE NULL 
            END,
            pricing_strategy = pricing_strategy_to_use,
            custom_offering_id = CASE 
                WHEN pricing_strategy_to_use = 'custom' THEN custom_offering_to_use
                ELSE NULL
            END
        WHERE id = website_id_param;
        
        RETURN calculated_price;
    END IF;
    
    -- Handle different strategies
    IF pricing_strategy_to_use = 'custom' AND custom_offering_to_use IS NOT NULL THEN
        -- Use the specific custom offering
        SELECT po.base_price INTO calculated_price
        FROM publisher_offerings po
        JOIN publisher_offering_relationships por ON por.offering_id = po.id
        WHERE por.website_id = website_id_param
          AND po.id = custom_offering_to_use
          AND po.is_active = true
          AND po.offering_type = 'guest_post';
        
        IF calculated_price IS NULL THEN
            -- Custom offering not found or not valid, fall back to min
            pricing_strategy_to_use := 'min_price';
        END IF;
    END IF;
    
    -- If not custom or custom failed, use min/max
    IF pricing_strategy_to_use != 'custom' OR calculated_price IS NULL THEN
        IF pricing_strategy_to_use = 'max_price' THEN
            -- Use maximum price from active guest_post offerings
            SELECT MAX(po.base_price) INTO calculated_price
            FROM publisher_offerings po
            JOIN publisher_offering_relationships por ON por.offering_id = po.id
            WHERE por.website_id = website_id_param
              AND po.is_active = true
              AND po.offering_type = 'guest_post';
        ELSE
            -- Default to minimum price
            SELECT MIN(po.base_price) INTO calculated_price
            FROM publisher_offerings po
            JOIN publisher_offering_relationships por ON por.offering_id = po.id
            WHERE por.website_id = website_id_param
              AND po.is_active = true
              AND po.offering_type = 'guest_post';
        END IF;
    END IF;
    
    -- IMPORTANT FIX: Always update the website, even when price is NULL
    -- This ensures guest_post_cost is set to NULL when no active offerings exist
    UPDATE websites
    SET 
        guest_post_cost = calculated_price,
        guest_post_cost_source = CASE 
            WHEN calculated_price IS NOT NULL THEN 'derived_auto'
            ELSE NULL 
        END,
        pricing_strategy = pricing_strategy_to_use,
        custom_offering_id = CASE 
            WHEN pricing_strategy_to_use = 'custom' THEN custom_offering_to_use
            ELSE NULL
        END
    WHERE id = website_id_param;
    
    RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function to update website pricing when offerings change
CREATE OR REPLACE FUNCTION trigger_update_website_pricing()
RETURNS TRIGGER AS $$
DECLARE
    affected_website_id UUID;
BEGIN
    -- Determine which website was affected
    IF TG_OP = 'DELETE' THEN
        affected_website_id := OLD.website_id;
    ELSE
        -- For INSERT and UPDATE, get website_id from relationship
        IF TG_TABLE_NAME = 'publisher_offering_relationships' THEN
            affected_website_id := NEW.website_id;
        ELSIF TG_TABLE_NAME = 'publisher_offerings' THEN
            -- Get website_id from relationship for this offering
            SELECT DISTINCT por.website_id INTO affected_website_id
            FROM publisher_offering_relationships por
            WHERE por.offering_id = NEW.id
            LIMIT 1;
        END IF;
    END IF;
    
    -- If we found an affected website, recalculate its pricing
    IF affected_website_id IS NOT NULL THEN
        PERFORM calculate_and_update_guest_post_cost(
            affected_website_id,
            NULL,  -- Use existing strategy
            NULL   -- Use existing custom offering
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger when publisher_offerings are inserted, updated, or deleted
-- Note: No WHEN clause for DELETE triggers as they cannot reference NEW
CREATE TRIGGER update_website_pricing_on_offering_change
AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
FOR EACH ROW
EXECUTE FUNCTION trigger_update_website_pricing();

-- Trigger when publisher_offering_relationships are inserted, updated, or deleted
CREATE TRIGGER update_website_pricing_on_relationship_change
AFTER INSERT OR UPDATE OR DELETE ON publisher_offering_relationships
FOR EACH ROW
EXECUTE FUNCTION trigger_update_website_pricing();

-- Create wrapper function for website strategy updates
CREATE OR REPLACE FUNCTION trigger_update_website_pricing_on_strategy()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the calculation function with the new values
    PERFORM calculate_and_update_guest_post_cost(
        NEW.id,
        NEW.pricing_strategy,
        NEW.custom_offering_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger when a website's pricing_strategy is updated
CREATE TRIGGER update_website_pricing_on_strategy_change
AFTER UPDATE ON websites
FOR EACH ROW
WHEN (NEW.pricing_strategy IS DISTINCT FROM OLD.pricing_strategy 
   OR NEW.custom_offering_id IS DISTINCT FROM OLD.custom_offering_id)
EXECUTE FUNCTION trigger_update_website_pricing_on_strategy();

-- Add helpful comments explaining the pricing system
COMMENT ON COLUMN websites.guest_post_cost IS 
'Derived field storing the calculated guest post price in cents. 
Automatically updated when offerings change based on pricing_strategy (min_price, max_price, or custom).
Set to NULL when no active offerings exist.
Source field indicates if value is derived_auto, derived_override, or legacy.';

COMMENT ON COLUMN websites.pricing_strategy IS 
'Determines how guest_post_cost is calculated from available offerings:
- min_price: Use the lowest price from active guest_post offerings (default)
- max_price: Use the highest price from active guest_post offerings  
- custom: Use the specific offering identified by custom_offering_id';

COMMENT ON COLUMN websites.guest_post_cost_source IS
'Indicates how the guest_post_cost was determined:
- derived_auto: Automatically calculated from offerings using pricing_strategy
- derived_override: Manually overridden using price_override_offering_id
- legacy: Old pricing data from before the offerings system
- NULL: No active offerings available';