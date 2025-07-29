-- Fix total_traffic column to accept decimal values from Airtable
ALTER TABLE websites 
ALTER COLUMN total_traffic TYPE DECIMAL(12, 2) USING total_traffic::decimal;