SELECT 
  COUNT(*) as total_domains,
  COUNT(CASE WHEN ai_qualification_reasoning IS NOT NULL THEN 1 END) as enriched_domains,
  COUNT(CASE WHEN ai_qualification_reasoning IS NULL THEN 1 END) as domains_to_enrich
FROM bulk_analysis_domains
WHERE project_id IS NOT NULL
LIMIT 10;
