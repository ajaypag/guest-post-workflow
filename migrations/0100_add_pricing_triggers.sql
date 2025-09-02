-- Migration: Add triggers to automatically update guest_post_cost when offerings change
-- This ensures the derived pricing field stays in sync with offerings

-- Create a trigger function to update website pricing when offerings change
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
CREATE TRIGGER update_website_pricing_on_offering_change
AFTER INSERT OR UPDATE OR DELETE ON publisher_offerings
FOR EACH ROW
WHEN (NEW.offering_type = 'guest_post' OR OLD.offering_type = 'guest_post')
EXECUTE FUNCTION trigger_update_website_pricing();

-- Trigger when publisher_offering_relationships are inserted, updated, or deleted
CREATE TRIGGER update_website_pricing_on_relationship_change
AFTER INSERT OR UPDATE OR DELETE ON publisher_offering_relationships
FOR EACH ROW
EXECUTE FUNCTION trigger_update_website_pricing();

-- Trigger when a website's pricing_strategy is updated
CREATE TRIGGER update_website_pricing_on_strategy_change
AFTER UPDATE ON websites
FOR EACH ROW
WHEN (NEW.pricing_strategy IS DISTINCT FROM OLD.pricing_strategy 
   OR NEW.custom_offering_id IS DISTINCT FROM OLD.custom_offering_id)
EXECUTE FUNCTION calculate_and_update_guest_post_cost(NEW.id, NEW.pricing_strategy, NEW.custom_offering_id);

-- Add comment explaining the pricing system
COMMENT ON COLUMN websites.guest_post_cost IS 
'Derived field storing the calculated guest post price in cents. 
Automatically updated when offerings change based on pricing_strategy (min_price, max_price, or custom).
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
- legacy: Old pricing data from before the offerings system';