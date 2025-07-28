-- Add missing columns for DataForSEO batch analysis support
ALTER TABLE keyword_analysis_results 
ADD COLUMN IF NOT EXISTS analysis_batch_id UUID,
ADD COLUMN IF NOT EXISTS is_incremental BOOLEAN DEFAULT FALSE;

-- Add index for batch queries
CREATE INDEX IF NOT EXISTS idx_keyword_analysis_batch 
ON keyword_analysis_results(analysis_batch_id);

-- Add foreign key to keyword_analysis_batches if it exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'keyword_analysis_batches') THEN
        ALTER TABLE keyword_analysis_results 
        ADD CONSTRAINT fk_analysis_batch 
        FOREIGN KEY (analysis_batch_id) 
        REFERENCES keyword_analysis_batches(id) 
        ON DELETE SET NULL;
    END IF;
END $$;