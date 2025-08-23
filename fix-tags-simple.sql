-- Simple migration to fix project tags from IDs to URLs

DO $$
DECLARE
    project_record RECORD;
    tag_array text[];
    new_tag_array text[];
    tag text;
    target_page_id text;
    target_page_url text;
    i integer;
BEGIN
    -- Loop through all projects
    FOR project_record IN 
        SELECT id, tags 
        FROM bulk_analysis_projects 
        WHERE tags IS NOT NULL AND tags::text != '[]'
    LOOP
        -- Convert JSONB array to text array
        SELECT ARRAY(SELECT jsonb_array_elements_text(project_record.tags)) INTO tag_array;
        
        new_tag_array := ARRAY[]::text[];
        
        -- Process each tag
        FOR i IN 1..array_length(tag_array, 1) LOOP
            tag := tag_array[i];
            
            -- Check if this is a target-page:UUID tag
            IF tag LIKE 'target-page:%' AND length(tag) = 48 THEN -- UUID is 36 chars + 'target-page:' is 12 chars = 48
                target_page_id := substring(tag from 13);
                
                -- Look up the URL
                SELECT url INTO target_page_url 
                FROM target_pages 
                WHERE id = target_page_id::uuid
                LIMIT 1;
                
                IF target_page_url IS NOT NULL THEN
                    new_tag_array := array_append(new_tag_array, 'target-page:' || target_page_url);
                    RAISE NOTICE 'Replacing % with target-page:%', tag, target_page_url;
                ELSE
                    new_tag_array := array_append(new_tag_array, tag);
                    RAISE NOTICE 'No URL found for %, keeping as is', tag;
                END IF;
            -- Also replace order-group tags with just order tags
            ELSIF tag LIKE 'order-group:%' THEN
                -- Skip order-group tags (we don't need them anymore)
                RAISE NOTICE 'Removing legacy order-group tag: %', tag;
            ELSE
                new_tag_array := array_append(new_tag_array, tag);
            END IF;
        END LOOP;
        
        -- Update the project
        UPDATE bulk_analysis_projects 
        SET tags = array_to_json(new_tag_array)::jsonb
        WHERE id = project_record.id;
        
        RAISE NOTICE 'Updated project %', project_record.id;
    END LOOP;
END;
$$;