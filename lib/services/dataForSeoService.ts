import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

export interface DataForSeoKeywordResult {
  keyword: string;
  position: number;
  searchVolume: number | null;
  url: string;
  cpc: number | null;
  competition: string | null;
}

export interface DataForSeoAnalysisResult {
  domainId: string;
  domain: string;
  keywords: DataForSeoKeywordResult[];
  totalFound: number;
  status: 'success' | 'error';
  error?: string;
}

export class DataForSeoService {
  private static readonly API_BASE_URL = 'https://api.dataforseo.com/v3';
  
  /**
   * Analyze a single domain for keywords
   */
  static async analyzeDomain(
    domainId: string,
    domain: string,
    keywords: string[],
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<DataForSeoAnalysisResult> {
    console.log('DataForSeoService.analyzeDomain called with:', {
      domainId,
      domain,
      keywordsCount: keywords.length,
      locationCode,
      languageCode
    });
    
    try {
      // Check for API credentials
      if (!process.env.DATAFORSEO_LOGIN || !process.env.DATAFORSEO_PASSWORD) {
        console.error('DataForSEO credentials missing');
        throw new Error('DataForSEO credentials not configured');
      }

      console.log('DataForSEO credentials found');
      const auth = Buffer.from(
        `${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`
      ).toString('base64');

      // Prepare request with proper filters using 'like' operator and % wildcards
      // DataForSEO requires 'like' operator with % wildcards for partial matching
      // Example: ["keyword_data.keyword", "like", "%lead%"] will match "lead generation", "leadership", etc.
      let filters = undefined;
      if (keywords.length > 0) {
        console.log(`Processing ${keywords.length} keywords for filtering`);
        
        // Limit keywords to prevent filter errors
        const MAX_KEYWORDS = 10; // Start with a conservative limit
        if (keywords.length > MAX_KEYWORDS) {
          console.warn(`Too many keywords (${keywords.length}), limiting to first ${MAX_KEYWORDS}`);
          keywords = keywords.slice(0, MAX_KEYWORDS);
        }
        
        // Don't escape special characters - DataForSEO might handle this internally
        const sanitizedKeywords = keywords;

        // Create an OR condition for all keywords with partial matching
        if (sanitizedKeywords.length === 1) {
          // Single keyword - simple filter
          filters = [
            ["keyword_data.keyword", "like", `%${sanitizedKeywords[0]}%`]
          ];
        } else {
          // Multiple keywords - need OR conditions as flat array
          // DataForSEO expects: [["field", "op", "value"], "or", ["field", "op", "value"]]
          filters = [];
          for (let i = 0; i < sanitizedKeywords.length; i++) {
            if (i > 0) {
              filters.push("or");
            }
            filters.push(["keyword_data.keyword", "like", `%${sanitizedKeywords[i]}%`]);
          }
        }
      }

      const requestBody = [{
        target: domain,
        location_code: locationCode,
        language_code: languageCode,
        filters: filters,
        limit: 500
      }];
      
      console.log('DataForSEO request body:', JSON.stringify(requestBody, null, 2));

      // Make API request
      const apiUrl = `${this.API_BASE_URL}/dataforseo_labs/google/ranked_keywords/live`;
      console.log('Calling DataForSEO API:', apiUrl);
      
      const response = await fetch(
        apiUrl,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      console.log('DataForSEO API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('DataForSEO API error response:', errorText);
        throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('DataForSEO API response data:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
      
      // Check for task-level errors
      if (data.tasks?.[0]?.status_code !== 20000) {
        const taskError = data.tasks?.[0];
        console.error('DataForSEO task error:', taskError);
        throw new Error(`DataForSEO task error: ${taskError?.status_message || 'Unknown error'}`);
      }
      
      // Parse results
      const results: DataForSeoKeywordResult[] = [];
      
      if (data.tasks?.[0]?.result?.[0]?.items) {
        for (const item of data.tasks[0].result[0].items) {
          results.push({
            keyword: item.keyword_data.keyword,
            position: item.ranked_serp_element.serp_item.rank_absolute || 0,
            searchVolume: item.keyword_data.keyword_info?.search_volume || null,
            url: item.ranked_serp_element.serp_item.url || 
                 item.ranked_serp_element.serp_item.relative_url || '',
            cpc: item.keyword_data.keyword_info?.cpc || null,
            competition: this.mapCompetition(item.keyword_data.keyword_info?.competition),
          });
        }
      }

      // Store results in the database for pagination
      if (results.length > 0) {
        await this.storeResults(domainId, results, locationCode, languageCode);
      }

      // Update domain status
      await this.updateDomainAnalysisStatus(domainId, 'analyzed', results.length);

      return {
        domainId,
        domain,
        keywords: results.slice(0, 50), // Return only first 50 for initial display
        totalFound: results.length,
        status: 'success',
      };
    } catch (error: any) {
      console.error('DataForSEO analysis error:', error);
      
      // Update domain status with error
      await this.updateDomainAnalysisStatus(domainId, 'error', 0);
      
      return {
        domainId,
        domain,
        keywords: [],
        totalFound: 0,
        status: 'error',
        error: error.message,
      };
    }
  }

  /**
   * Store results in the database
   */
  private static async storeResults(
    domainId: string,
    results: DataForSeoKeywordResult[],
    locationCode: number,
    languageCode: string
  ): Promise<void> {
    try {
      const analysisDate = new Date();
      const batchSize = 100;
      
      // Insert in batches to avoid query size limits
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const values = batch.map(r => 
          `(gen_random_uuid(), '${domainId}'::uuid, '${r.keyword.replace(/'/g, "''")}', ${r.position}, ${r.searchVolume || 'NULL'}, '${r.url.replace(/'/g, "''")}', NULL, ${r.cpc || 'NULL'}, '${r.competition || 'UNKNOWN'}', ${locationCode}, '${languageCode}', '${analysisDate.toISOString()}', NOW())`
        ).join(',');
        
        await db.execute(sql.raw(`
          INSERT INTO keyword_analysis_results 
          (id, bulk_analysis_domain_id, keyword, position, search_volume, url, keyword_difficulty, cpc, competition, location_code, language_code, analysis_date, created_at)
          VALUES ${values}
        `));
      }
    } catch (error) {
      console.error('Error storing results:', error);
      throw error;
    }
  }

  /**
   * Update domain analysis status
   */
  private static async updateDomainAnalysisStatus(
    domainId: string,
    status: string,
    keywordsFound: number
  ): Promise<void> {
    try {
      await db.execute(sql`
        UPDATE bulk_analysis_domains 
        SET 
          dataforseo_status = ${status},
          dataforseo_keywords_found = ${keywordsFound},
          dataforseo_analyzed_at = NOW(),
          updated_at = NOW()
        WHERE id = ${domainId}::uuid
      `);
    } catch (error) {
      console.error('Error updating domain status:', error);
    }
  }

  /**
   * Map competition value to string
   */
  private static mapCompetition(competition?: number): string {
    if (competition === undefined || competition === null) return 'UNKNOWN';
    if (competition < 0.33) return 'LOW';
    if (competition < 0.66) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get paginated results from database
   */
  static async getStoredResults(
    domainId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ results: DataForSeoKeywordResult[]; total: number }> {
    try {
      // Get results
      const results = await db.execute<any>(sql`
        SELECT 
          keyword,
          position,
          search_volume,
          url,
          cpc::float,
          competition
        FROM keyword_analysis_results
        WHERE bulk_analysis_domain_id = ${domainId}::uuid
        ORDER BY position ASC
        LIMIT ${limit}
        OFFSET ${offset}
      `);

      // Get total count
      const countResult = await db.execute<any>(sql`
        SELECT COUNT(*) as count
        FROM keyword_analysis_results
        WHERE bulk_analysis_domain_id = ${domainId}::uuid
      `);

      return {
        results: results.rows.map(r => ({
          keyword: r.keyword,
          position: r.position,
          searchVolume: r.search_volume,
          url: r.url,
          cpc: r.cpc,
          competition: r.competition,
        })),
        total: parseInt(countResult.rows[0]?.count || '0'),
      };
    } catch (error) {
      console.error('Error fetching stored results:', error);
      return { results: [], total: 0 };
    }
  }

  /**
   * Get supported locations
   */
  static getSupportedLocations() {
    return [
      { location_code: 2840, location_name: 'United States' },
      { location_code: 2826, location_name: 'United Kingdom' },
      { location_code: 2124, location_name: 'Canada' },
      { location_code: 2036, location_name: 'Australia' },
      { location_code: 2356, location_name: 'India' },
    ];
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return [
      { language_code: 'en', language_name: 'English' },
      { language_code: 'es', language_name: 'Spanish' },
      { language_code: 'fr', language_name: 'French' },
      { language_code: 'de', language_name: 'German' },
      { language_code: 'it', language_name: 'Italian' },
    ];
  }
}