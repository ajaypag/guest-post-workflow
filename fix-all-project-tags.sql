-- Fix all project tags to use URLs instead of IDs

-- First, let's see what we're dealing with
SELECT 'Current state:' as info;
SELECT id, name, tags FROM bulk_analysis_projects WHERE tags::text LIKE '%target-page:%' LIMIT 2;

-- Fix the Linkio project
UPDATE bulk_analysis_projects 
SET tags = '["order", "1 links", "target-page:https://www.linkio.com/best-link-building-services/"]'::jsonb
WHERE id = '51a11fd0-7b9c-4e35-bd8c-f5e682454f78';

-- Fix the PPC Masterminds project (replacing all b9e50f22 IDs with the URL)
UPDATE bulk_analysis_projects 
SET tags = '["order", "14 links", "order:ac5740f6-d035-4557-9199-91833046b40d", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/", "target-page:https://ppcmasterminds.com/"]'::jsonb
WHERE id = '6dbc9a63-95c4-4383-a2a0-aac6a603a326';

-- Check if there are other projects with target-page IDs
SELECT 'Checking for other projects with target-page IDs:' as info;
SELECT id, name, tags::text as tags_text 
FROM bulk_analysis_projects 
WHERE tags::text LIKE '%target-page:%' 
  AND tags::text ~ 'target-page:[0-9a-f]{8}-[0-9a-f]{4}'
LIMIT 10;

-- Fix any remaining projects with specific known IDs
-- 823ea16b-092f-4397-acc3-ed3698f1b366 -> https://www.linkio.com/best-link-building-services/
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:823ea16b-092f-4397-acc3-ed3698f1b366', 'target-page:https://www.linkio.com/best-link-building-services/')::jsonb
WHERE tags::text LIKE '%target-page:823ea16b-092f-4397-acc3-ed3698f1b366%';

-- 4c0dfcbd-9fa5-424f-a765-897ea20da7a4 
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:4c0dfcbd-9fa5-424f-a765-897ea20da7a4', 'target-page:https://beautyblogsfeedback.com/')::jsonb
WHERE tags::text LIKE '%target-page:4c0dfcbd-9fa5-424f-a765-897ea20da7a4%'
  AND EXISTS (SELECT 1 FROM target_pages WHERE id = '4c0dfcbd-9fa5-424f-a765-897ea20da7a4');

-- 11c6a15c-f2d7-4b9d-bd8e-3f329956e16b (multiple occurrences in old data)
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:11c6a15c-f2d7-4b9d-bd8e-3f329956e16b', 'target-page:https://ppcmasterminds.com/')::jsonb
WHERE tags::text LIKE '%target-page:11c6a15c-f2d7-4b9d-bd8e-3f329956e16b%';

-- d0321f62-2f16-4607-b591-203c9e96305a
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:d0321f62-2f16-4607-b591-203c9e96305a', 'target-page:https://www.linkio.com/')::jsonb
WHERE tags::text LIKE '%target-page:d0321f62-2f16-4607-b591-203c9e96305a%';

-- 5838a059-a2c0-4bcb-8c59-7c02c0b6308d
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:5838a059-a2c0-4bcb-8c59-7c02c0b6308d', 'target-page:https://www.linkio.com/blog/')::jsonb
WHERE tags::text LIKE '%target-page:5838a059-a2c0-4bcb-8c59-7c02c0b6308d%';

-- 8ebfd7be-eed1-4c02-8677-49e36d20213c
UPDATE bulk_analysis_projects
SET tags = replace(tags::text, 'target-page:8ebfd7be-eed1-4c02-8677-49e36d20213c', 'target-page:https://www.linkio.com/features/')::jsonb
WHERE tags::text LIKE '%target-page:8ebfd7be-eed1-4c02-8677-49e36d20213c%';

-- Remove all order-group tags (legacy system)
UPDATE bulk_analysis_projects
SET tags = (
    SELECT jsonb_agg(elem)
    FROM jsonb_array_elements_text(tags) elem
    WHERE elem NOT LIKE 'order-group:%'
)
WHERE tags::text LIKE '%order-group:%';

SELECT 'Migration complete. Final check:' as info;
SELECT id, name, tags FROM bulk_analysis_projects WHERE id IN (
    '51a11fd0-7b9c-4e35-bd8c-f5e682454f78',
    '6dbc9a63-95c4-4383-a2a0-aac6a603a326'
);