-- Create niches table if it doesn't exist
CREATE TABLE IF NOT EXISTS niches (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  source VARCHAR(50) DEFAULT 'manual',
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  CONSTRAINT unique_niche_name UNIQUE (name)
);

-- Create case-insensitive unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_niches_name_lower ON niches (LOWER(name));

-- Populate niches table from existing website niches
INSERT INTO niches (name, source, created_at)
SELECT DISTINCT unnest(niche) AS name, 'imported' AS source, NOW() AS created_at
FROM websites
WHERE niche IS NOT NULL AND array_length(niche, 1) > 0
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE niches IS 'Master list of available niches for categorizing websites';