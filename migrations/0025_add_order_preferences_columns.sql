-- Add order preference tracking columns
-- These capture what the user originally wanted/expected when creating the order

-- Budget expectations
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_budget_min INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_budget_max INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_links_count INTEGER;

-- Quality preferences
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_dr_min INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_dr_max INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_traffic_min INTEGER;

-- Category/type preferences
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_categories TEXT[];
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_types TEXT[];
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preferences_niches TEXT[];

-- Estimator snapshot for historical reference
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimator_snapshot JSONB;

-- Tracking how estimates matched reality
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_price_per_link INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS actual_price_per_link INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS preference_match_score DECIMAL(5,2); -- 0-100% how well we matched their preferences

-- For easy reordering
ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS copied_from_order_id UUID;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_preferences_dr ON orders(preferences_dr_min, preferences_dr_max);
CREATE INDEX IF NOT EXISTS idx_orders_preferences_traffic ON orders(preferences_traffic_min);
CREATE INDEX IF NOT EXISTS idx_orders_preferences_categories ON orders USING GIN(preferences_categories);
CREATE INDEX IF NOT EXISTS idx_orders_is_template ON orders(is_template) WHERE is_template = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN orders.estimated_budget_min IS 'Minimum budget user expected based on estimator';
COMMENT ON COLUMN orders.estimated_budget_max IS 'Maximum budget user expected based on estimator';
COMMENT ON COLUMN orders.estimated_links_count IS 'Number of links user planned to purchase';
COMMENT ON COLUMN orders.preferences_dr_min IS 'Minimum domain rating user wanted';
COMMENT ON COLUMN orders.preferences_dr_max IS 'Maximum domain rating user wanted';
COMMENT ON COLUMN orders.preferences_traffic_min IS 'Minimum monthly traffic user required';
COMMENT ON COLUMN orders.preferences_categories IS 'Categories user filtered by (Technology, Marketing, etc)';
COMMENT ON COLUMN orders.preferences_types IS 'Website types user wanted (Blog, SaaS, etc)';
COMMENT ON COLUMN orders.preferences_niches IS 'Specific niches if user filtered by them';
COMMENT ON COLUMN orders.estimator_snapshot IS 'Full snapshot of estimator results when order was created';
COMMENT ON COLUMN orders.estimated_price_per_link IS 'What estimator showed as median price per link';
COMMENT ON COLUMN orders.actual_price_per_link IS 'What user actually paid per link after approval';
COMMENT ON COLUMN orders.preference_match_score IS 'Percentage of how well final order matched original preferences';
COMMENT ON COLUMN orders.is_template IS 'Whether this order can be used as a template for quick reordering';
COMMENT ON COLUMN orders.template_name IS 'User-friendly name for template orders';
COMMENT ON COLUMN orders.copied_from_order_id IS 'If this order was created from another order, track the source';