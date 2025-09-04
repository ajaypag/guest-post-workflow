#!/bin/bash

# Direct SQL update using psql equivalent
cat << 'EOF' > /tmp/update.sql
UPDATE websites
SET 
  niche = ARRAY['Sports']::TEXT[],
  categories = ARRAY['Leisure & Hobbies', 'Media & Publishing']::TEXT[],
  website_type = ARRAY['Blog', 'Service']::TEXT[],
  suggested_niches = ARRAY['Sports Betting', 'Soccer Predictions']::TEXT[],
  suggested_categories = ARRAY['Gambling & Betting']::TEXT[],
  last_niche_check = NOW(),
  updated_at = NOW()
WHERE domain = '007soccerpicks.net'
RETURNING domain, niche, categories, website_type, suggested_niches, suggested_categories, last_niche_check;
EOF

echo "SQL query prepared. To execute, run:"
echo "PGPASSWORD=postgres psql -h localhost -p 5434 -U postgres -d guest_post_prod < /tmp/update.sql"