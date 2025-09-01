-- Migration: Add CUSTOM pricing strategy option and custom offering selection
-- This allows manually selecting a specific offering instead of MIN/MAX

-- First, remove the old constraint
ALTER TABLE websites DROP CONSTRAINT IF EXISTS websites_pricing_strategy_check;

-- Add new constraint with custom option
ALTER TABLE websites 
ADD CONSTRAINT websites_pricing_strategy_check 
CHECK (pricing_strategy IN ('min_price', 'max_price', 'custom'));

-- Add column to store which offering is selected for custom strategy
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'websites' 
        AND column_name = 'custom_offering_id'
    ) THEN
        ALTER TABLE websites 
        ADD COLUMN custom_offering_id UUID REFERENCES publisher_offerings(id);
        
        COMMENT ON COLUMN websites.custom_offering_id IS 'The specific offering selected when using custom pricing strategy';
    END IF;
END $$;

-- Update the function to handle custom strategy
CREATE OR REPLACE FUNCTION calculate_and_update_guest_post_cost(
    website_id_param UUID, 
    strategy_param VARCHAR DEFAULT NULL,
    custom_offering_param UUID DEFAULT NULL
)
RETURNS INTEGER AS $$
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
          
        -- Update website with override price
        UPDATE websites 
        SET 
            guest_post_cost = calculated_price,
            guest_post_cost_source = 'derived_override',
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
    
    -- If we found a price, update the website
    IF calculated_price IS NOT NULL THEN
        UPDATE websites 
        SET 
            guest_post_cost = calculated_price,
            guest_post_cost_source = 'derived_auto',
            pricing_strategy = pricing_strategy_to_use,
            custom_offering_id = CASE 
                WHEN pricing_strategy_to_use = 'custom' THEN custom_offering_to_use
                ELSE NULL
            END
        WHERE id = website_id_param;
    END IF;
    
    RETURN calculated_price;
END;
$$ LANGUAGE plpgsql;