-- Migration 0079: Add derived pricing infrastructure for Phase 6B shadow mode
-- This enables parallel calculation of guest_post_cost from publisher_offerings
-- Part of pricing standardization initiative

-- Add derived pricing fields to websites table
ALTER TABLE websites 
ADD COLUMN IF NOT EXISTS derived_guest_post_cost INTEGER,
ADD COLUMN IF NOT EXISTS price_calculation_method VARCHAR(50) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS price_calculated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS price_override_offering_id UUID REFERENCES publisher_offerings(id),
ADD COLUMN IF NOT EXISTS price_override_reason TEXT;

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_websites_derived_cost ON websites(derived_guest_post_cost);
CREATE INDEX IF NOT EXISTS idx_websites_calculation_method ON websites(price_calculation_method);
CREATE INDEX IF NOT EXISTS idx_websites_price_calculated_at ON websites(price_calculated_at);

-- Function to calculate derived price for a website
CREATE OR REPLACE FUNCTION calculate_derived_guest_post_cost(website_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    derived_price INTEGER;
    override_offering_id UUID;
BEGIN
    -- Check if manual override exists
    SELECT price_override_offering_id INTO override_offering_id
    FROM websites 
    WHERE id = website_id_param;
    
    IF override_offering_id IS NOT NULL THEN
        -- Use manually selected offering
        SELECT po.base_price INTO derived_price
        FROM publisher_offerings po
        WHERE po.id = override_offering_id
          AND po.is_active = true
          AND po.offering_type = 'guest_post';
    ELSE
        -- Use minimum price from all guest_post offerings
        SELECT MIN(po.base_price) INTO derived_price
        FROM publisher_offering_relationships por
        JOIN publisher_offerings po ON por.offering_id = po.id
        WHERE por.website_id = website_id_param
          AND po.is_active = true
          AND po.offering_type = 'guest_post'
          AND po.base_price IS NOT NULL;
    END IF;
    
    RETURN derived_price;
END;
$$ LANGUAGE plpgsql;

-- Function to update derived price with metadata
CREATE OR REPLACE FUNCTION update_derived_guest_post_cost(website_id_param UUID)
RETURNS VOID AS $$
DECLARE
    new_derived_price INTEGER;
    override_offering_id UUID;
    calculation_method VARCHAR(50);
BEGIN
    -- Get current override status
    SELECT price_override_offering_id INTO override_offering_id
    FROM websites 
    WHERE id = website_id_param;
    
    -- Calculate new price
    new_derived_price := calculate_derived_guest_post_cost(website_id_param);
    
    -- Determine calculation method
    IF override_offering_id IS NOT NULL THEN
        calculation_method := 'manual_override';
    ELSE
        calculation_method := 'auto_min';
    END IF;
    
    -- Update website record
    UPDATE websites 
    SET 
        derived_guest_post_cost = new_derived_price,
        price_calculation_method = calculation_method,
        price_calculated_at = NOW()
    WHERE id = website_id_param;
END;
$$ LANGUAGE plpgsql;

-- Populate initial derived prices for all websites with current prices
-- This runs the calculation for all 941 websites
DO $$
DECLARE
    website_record RECORD;
    processed_count INTEGER := 0;
    total_count INTEGER;
BEGIN
    -- Get total count for progress tracking
    SELECT COUNT(*) INTO total_count 
    FROM websites 
    WHERE guest_post_cost IS NOT NULL;
    
    RAISE NOTICE 'Starting derived price calculation for % websites...', total_count;
    
    -- Update each website
    FOR website_record IN 
        SELECT id FROM websites WHERE guest_post_cost IS NOT NULL
    LOOP
        PERFORM update_derived_guest_post_cost(website_record.id);
        processed_count := processed_count + 1;
        
        -- Progress logging every 100 websites
        IF processed_count % 100 = 0 THEN
            RAISE NOTICE 'Processed %/% websites...', processed_count, total_count;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Completed derived price calculation for % websites', processed_count;
END
$$;

-- Optional: Create trigger to auto-update derived prices when offerings change
-- This is commented out for Phase 6B - we'll enable it later if needed
/*
CREATE OR REPLACE FUNCTION trigger_update_derived_pricing()
RETURNS TRIGGER AS $$
BEGIN
    -- Update derived prices for affected websites when offerings change
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update websites linked to this offering
        UPDATE websites 
        SET 
            derived_guest_post_cost = calculate_derived_guest_post_cost(id),
            price_calculated_at = NOW(),
            price_calculation_method = CASE 
                WHEN price_override_offering_id IS NOT NULL THEN 'manual_override'
                ELSE 'auto_min'
            END
        WHERE id IN (
            SELECT por.website_id 
            FROM publisher_offering_relationships por 
            WHERE por.offering_id = NEW.id
        );
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        -- Update websites that were linked to the deleted offering
        UPDATE websites 
        SET 
            derived_guest_post_cost = calculate_derived_guest_post_cost(id),
            price_calculated_at = NOW(),
            price_calculation_method = CASE 
                WHEN price_override_offering_id IS NOT NULL THEN 'manual_override'
                ELSE 'auto_min'
            END
        WHERE id IN (
            SELECT por.website_id 
            FROM publisher_offering_relationships por 
            WHERE por.offering_id = OLD.id
        );
        
        RETURN OLD;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger (disabled for now - enable in Phase 6C if needed)
-- CREATE TRIGGER publisher_offerings_update_derived_pricing
--     AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
--     FOR EACH ROW EXECUTE FUNCTION trigger_update_derived_pricing();
*/

-- Create a view for easy comparison of current vs derived pricing
CREATE OR REPLACE VIEW pricing_comparison AS
SELECT 
    w.id,
    w.domain,
    w.guest_post_cost as current_price,
    w.derived_guest_post_cost as derived_price,
    w.price_calculation_method,
    w.price_calculated_at,
    w.price_override_offering_id,
    w.price_override_reason,
    -- Calculate difference and status
    CASE 
        WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NULL THEN 'both_null'
        WHEN w.guest_post_cost IS NULL AND w.derived_guest_post_cost IS NOT NULL THEN 'current_null'
        WHEN w.guest_post_cost IS NOT NULL AND w.derived_guest_post_cost IS NULL THEN 'derived_null'
        WHEN w.guest_post_cost = w.derived_guest_post_cost THEN 'match'
        ELSE 'mismatch'
    END as price_status,
    -- Difference in cents
    COALESCE(w.derived_guest_post_cost, 0) - COALESCE(w.guest_post_cost, 0) as price_difference,
    -- Percentage difference
    CASE 
        WHEN w.guest_post_cost > 0 THEN 
            ROUND(((COALESCE(w.derived_guest_post_cost, 0) - w.guest_post_cost)::DECIMAL / w.guest_post_cost * 100), 2)
        ELSE NULL
    END as percent_difference
FROM websites w
WHERE w.guest_post_cost IS NOT NULL OR w.derived_guest_post_cost IS NOT NULL;

-- Add comment explaining the migration
COMMENT ON COLUMN websites.derived_guest_post_cost IS 'Auto-calculated guest post cost from publisher offerings (Phase 6B shadow mode)';
COMMENT ON COLUMN websites.price_calculation_method IS 'How price was calculated: manual, auto_min, manual_override';
COMMENT ON COLUMN websites.price_calculated_at IS 'When the derived price was last calculated';
COMMENT ON COLUMN websites.price_override_offering_id IS 'Specific offering selected for manual price override';
COMMENT ON COLUMN websites.price_override_reason IS 'Reason for manual price override';

-- Final verification query to show migration results
DO $$
DECLARE
    stats RECORD;
BEGIN
    -- Get statistics on the migration
    SELECT 
        COUNT(*) as total_websites,
        COUNT(CASE WHEN derived_guest_post_cost IS NOT NULL THEN 1 END) as with_derived_price,
        COUNT(CASE WHEN guest_post_cost = derived_guest_post_cost THEN 1 END) as matching_prices,
        COUNT(CASE WHEN guest_post_cost != derived_guest_post_cost THEN 1 END) as mismatched_prices,
        COUNT(CASE WHEN guest_post_cost IS NOT NULL AND derived_guest_post_cost IS NULL THEN 1 END) as missing_derived
    INTO stats
    FROM websites 
    WHERE guest_post_cost IS NOT NULL;
    
    RAISE NOTICE '=== Phase 6B Migration Complete ===';
    RAISE NOTICE 'Total websites with prices: %', stats.total_websites;
    RAISE NOTICE 'Websites with derived prices: %', stats.with_derived_price;
    RAISE NOTICE 'Matching prices: %', stats.matching_prices;
    RAISE NOTICE 'Mismatched prices: %', stats.mismatched_prices;
    RAISE NOTICE 'Missing derived prices: %', stats.missing_derived;
    RAISE NOTICE '=====================================';
END
$$;