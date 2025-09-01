-- Get all unique niches from websites table
SELECT DISTINCT unnest(niche) as niche 
FROM websites 
WHERE niche IS NOT NULL 
ORDER BY niche;

-- Get all unique categories from websites table
SELECT DISTINCT unnest(categories) as category 
FROM websites 
WHERE categories IS NOT NULL 
ORDER BY category;

-- Get all unique website types from websites table
SELECT DISTINCT unnest(website_type) as type 
FROM websites 
WHERE website_type IS NOT NULL 
ORDER BY type;