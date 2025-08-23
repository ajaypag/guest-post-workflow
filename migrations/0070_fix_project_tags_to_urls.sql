-- Migration to fix project tags from IDs to URLs
-- This updates existing project tags that contain target-page:ID to target-page:URL

-- Create a temporary function to update tags
CREATE OR REPLACE FUNCTION update_project_tags_to_urls() RETURNS void AS $$
DECLARE
    project_record RECORD;
    updated_tags jsonb;
    tag_element jsonb;
    tag_text text;
    target_page_id text;
    target_page_url text;
    new_tags jsonb;
    found_target_page RECORD;
BEGIN
    -- Loop through all projects that have tags
    FOR project_record IN 
        SELECT id, tags 
        FROM bulk_analysis_projects 
        WHERE tags IS NOT NULL AND tags != '[]'::jsonb
    LOOP
        new_tags := '[]'::jsonb;
        
        -- Process each tag
        FOR tag_element IN SELECT * FROM jsonb_array_elements(project_record.tags)
        LOOP
            tag_text := tag_element::text;
            -- Remove quotes from JSON string
            tag_text := trim(both '"' from tag_text);
            
            -- Check if this is a target-page:ID tag
            IF tag_text LIKE 'target-page:%' AND length(tag_text) > 13 THEN
                -- Extract the ID part
                target_page_id := substring(tag_text from 13);
                
                -- Check if it looks like a UUID (IDs are UUIDs, URLs are not)
                IF target_page_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                    -- Look up the URL for this target page ID
                    SELECT url INTO target_page_url 
                    FROM target_pages 
                    WHERE id = target_page_id::uuid
                    LIMIT 1;
                    
                    IF target_page_url IS NOT NULL THEN
                        -- Replace with URL-based tag
                        new_tags := new_tags || to_jsonb('target-page:' || target_page_url);
                    ELSE
                        -- Keep original if URL not found
                        new_tags := new_tags || to_jsonb(tag_text);
                    END IF;
                ELSE
                    -- Not a UUID, keep as is (might already be a URL)
                    new_tags := new_tags || to_jsonb(tag_text);
                END IF;
            ELSE
                -- Not a target-page tag, keep as is
                new_tags := new_tags || to_jsonb(tag_text);
            END IF;
        END LOOP;
        
        -- Update the project with new tags
        UPDATE bulk_analysis_projects 
        SET tags = new_tags
        WHERE id = project_record.id;
        
        RAISE NOTICE 'Updated project % tags', project_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the function
SELECT update_project_tags_to_urls();

-- Drop the temporary function
DROP FUNCTION update_project_tags_to_urls();

-- Log the migration
INSERT INTO migration_logs (migration_name, executed_at, status, notes)
VALUES (
    '0070_fix_project_tags_to_urls',
    NOW(),
    'completed',
    'Fixed project tags to use URLs instead of IDs for target pages'
)
ON CONFLICT (migration_name) DO NOTHING;