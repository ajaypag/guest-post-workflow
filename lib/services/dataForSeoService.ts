import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { DataForSeoCacheService } from './dataForSeoCacheService';
import { dataForSeoApiLogs } from '@/lib/db/dataForSeoLogsSchema';

export interface DataForSeoKeywordResult {
  keyword: string;
  position: number;
  searchVolume: number | null;
  url: string;
  cpc: number | null;
  competition: string | null;
  isFromCache?: boolean;
}

export interface DataForSeoAnalysisResult {
  domainId: string;
  domain: string;
  keywords: DataForSeoKeywordResult[];
  totalFound: number;
  status: 'success' | 'error';
  error?: string;
  taskId?: string;
}

export class DataForSeoService {
  private static readonly API_BASE_URL = 'https://api.dataforseo.com/v3';
  private static readonly REGEX_CHAR_LIMIT = 1000;
  
  /**
   * Escape special regex characters in a keyword
   */
  private static escapeRegex(keyword: string): string {
    return keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Create keyword batches that fit within the regex character limit
   */
  private static createKeywordBatches(keywords: string[]): string[][] {
    const batches: string[][] = [];
    let currentBatch: string[] = [];
    let currentLength = 0;
    
    for (const keyword of keywords) {
      const escapedKeyword = this.escapeRegex(keyword);
      // Add 1 for the pipe separator (except for first keyword)
      const keywordLength = escapedKeyword.length + (currentBatch.length > 0 ? 1 : 0);
      
      if (currentLength + keywordLength > this.REGEX_CHAR_LIMIT) {
        // Start a new batch
        if (currentBatch.length > 0) {
          batches.push(currentBatch);
          currentBatch = [keyword];
          currentLength = escapedKeyword.length;
        } else {
          // Single keyword exceeds limit - add it alone and warn
          console.warn(`Keyword exceeds character limit: "${keyword}" (${escapedKeyword.length} chars)`);
          batches.push([keyword]);
          currentLength = 0;
        }
      } else {
        currentBatch.push(keyword);
        currentLength += keywordLength;
      }
    }
    
    // Add the last batch
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }
  
  /**
   * Make a single DataForSEO API request
   */
  private static async makeDataForSeoRequest(
    apiUrl: string,
    requestBody: any[],
    auth: string,
    domainId: string,
    cleanDomain: string,
    keywordCount: number,
    locationCode: number,
    languageCode: string,
    isIncremental: boolean
  ): Promise<{ results: DataForSeoKeywordResult[]; taskId: string; cost: number }> {
    console.log('DataForSEO request body:', JSON.stringify(requestBody, null, 2));
    
    // Log the request before making it
    const logEntry = await db.insert(dataForSeoApiLogs).values({
      endpoint: apiUrl,
      requestPayload: requestBody[0],
      domainId: domainId.startsWith('temp-') ? null : domainId,
      domain: cleanDomain,
      keywordCount,
      locationCode,
      languageCode,
      requestType: isIncremental ? 'incremental' : 'full',
    }).returning({ id: dataForSeoApiLogs.id }).catch(err => {
      console.error('Failed to log DataForSEO request:', err);
      return null;
    });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('DataForSEO API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('DataForSEO API error response:', errorText);
      
      // Log error
      if (logEntry?.[0]?.id) {
        await db.execute(sql`
          UPDATE dataforseo_api_logs 
          SET 
            response_status = ${response.status},
            error_message = ${errorText},
            responded_at = NOW()
          WHERE id = ${logEntry[0].id}
        `).catch(err => {
          console.error('Failed to update DataForSEO error log:', err);
        });
      }
      
      throw new Error(`DataForSEO API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('DataForSEO API response preview:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
    
    // Extract task ID for audit tracking  
    const taskId = data.tasks?.[0]?.id || '';
    console.log('DataForSEO Task ID:', taskId);
    
    // Update log entry with response data
    if (logEntry?.[0]?.id) {
      await db.execute(sql`
        UPDATE dataforseo_api_logs 
        SET 
          task_id = ${taskId},
          response_status = ${response.status},
          response_data = ${JSON.stringify(data)}::jsonb,
          responded_at = NOW(),
          cost = ${data.cost || 0}
        WHERE id = ${logEntry[0].id}
      `).catch(err => {
        console.error('Failed to update DataForSEO log:', err);
      });
    }
    
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
      
      console.log(`Found ${results.length} keywords in response`);
    }
    
    return {
      results,
      taskId,
      cost: data.cost || 0
    };
  }
  
  /**
   * Analyze domain with smart caching - checks existing data first
   */
  static async analyzeDomainWithCache(
    domainId: string,
    domain: string,
    keywords: string[],
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<DataForSeoAnalysisResult & { cacheInfo?: any }> {
    console.log('DataForSeoService.analyzeDomainWithCache called with:', {
      domainId,
      domain,
      keywordsCount: keywords.length,
    });

    try {
      // Check cache first
      const cacheAnalysis = await DataForSeoCacheService.analyzeKeywordCache(
        domainId,
        keywords
      );

      console.log('Cache analysis result:', {
        newKeywords: cacheAnalysis.newKeywords.length,
        existingKeywords: cacheAnalysis.existingKeywords.length,
        shouldRefreshAll: cacheAnalysis.shouldRefreshAll,
        apiCallsSaved: cacheAnalysis.apiCallsSaved,
      });

      let allResults: DataForSeoKeywordResult[] = [];
      let newResults: DataForSeoKeywordResult[] = [];
      let status: 'success' | 'error' = 'success';
      let error: string | undefined;
      let taskId: string | undefined;

      // If we need to analyze new keywords
      if (cacheAnalysis.newKeywords.length > 0 || cacheAnalysis.shouldRefreshAll) {
        const keywordsToAnalyze = cacheAnalysis.shouldRefreshAll 
          ? keywords 
          : cacheAnalysis.newKeywords;

        const analysisResult = await this.analyzeDomain(
          domainId,
          domain,
          keywordsToAnalyze,
          locationCode,
          languageCode,
          true // isIncremental
        );

        newResults = analysisResult.keywords;
        status = analysisResult.status;
        error = analysisResult.error;
        taskId = analysisResult.taskId;

        // Always track keyword searches, even if no results found
        // This prevents re-checking keywords that return zero results
        if (status === 'success') {
          // Track the search in history
          const hasResults = newResults.length > 0;
          await DataForSeoCacheService.trackKeywordSearch(
            domainId,
            keywordsToAnalyze,
            hasResults,
            locationCode,
            languageCode
          );
          
          // Update the main searched keywords list
          await DataForSeoCacheService.updateSearchedKeywords(
            domainId,
            keywordsToAnalyze,
            cacheAnalysis.shouldRefreshAll
          );
        }
      }

      // Merge results: cached + new
      if (!cacheAnalysis.shouldRefreshAll && cacheAnalysis.existingResults.length > 0) {
        // Convert cached results to the expected format
        const cachedResults: DataForSeoKeywordResult[] = cacheAnalysis.existingResults.map((r: any) => ({
          keyword: r.keyword,
          position: r.position,
          searchVolume: r.searchVolume,
          url: r.url,
          cpc: r.cpc,
          competition: r.competition,
          isFromCache: true,
        }));
        
        allResults = [...cachedResults, ...newResults];
      } else {
        allResults = newResults;
      }

      // Sort by position
      allResults.sort((a, b) => a.position - b.position);

      return {
        domainId,
        domain,
        keywords: allResults.slice(0, 50), // Return first 50 for initial display
        totalFound: allResults.length,
        status,
        error,
        taskId,
        cacheInfo: {
          newKeywords: cacheAnalysis.newKeywords.length,
          cachedKeywords: cacheAnalysis.existingKeywords.length,
          apiCallsSaved: cacheAnalysis.apiCallsSaved,
          daysSinceLastAnalysis: cacheAnalysis.daysSinceLastAnalysis,
        },
      };
    } catch (error: any) {
      console.error('DataForSEO analysis with cache error:', error);
      
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
   * Analyze a single domain for keywords (original method)
   */
  static async analyzeDomain(
    domainId: string,
    domain: string,
    keywords: string[],
    locationCode: number = 2840,
    languageCode: string = 'en',
    isIncremental: boolean = false
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

      // Clean domain - remove protocol and trailing slash
      const cleanDomain = domain
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .replace(/\/$/, '');
      
      const apiUrl = `${this.API_BASE_URL}/dataforseo_labs/google/ranked_keywords/live`;
      let allResults: DataForSeoKeywordResult[] = [];
      let allTaskIds: string[] = [];
      let totalCost = 0;

      // If no keywords specified, fetch all domain keywords
      if (!keywords || keywords.length === 0) {
        console.log('No keywords specified, fetching all domain keywords');
        
        const requestBody = [{
          target: cleanDomain,
          location_code: locationCode,
          language_code: languageCode,
          limit: 500
        }];
        
        const singleResult = await this.makeDataForSeoRequest(
          apiUrl,
          requestBody,
          auth,
          domainId,
          cleanDomain,
          0, // No keywords
          locationCode,
          languageCode,
          isIncremental
        );
        
        allResults = singleResult.results;
        allTaskIds.push(singleResult.taskId);
        totalCost = singleResult.cost;
      } else {
        // Create keyword batches for regex filtering
        const keywordBatches = this.createKeywordBatches(keywords);
        console.log(`Created ${keywordBatches.length} keyword batches for ${keywords.length} total keywords`);
        
        // Make API calls for each batch
        for (let i = 0; i < keywordBatches.length; i++) {
          const batch = keywordBatches[i];
          const regex = batch.map(k => this.escapeRegex(k)).join('|');
          
          console.log(`Batch ${i + 1}/${keywordBatches.length}: ${batch.length} keywords, regex length: ${regex.length}`);
          
          const requestBody = [{
            target: cleanDomain,
            location_code: locationCode,
            language_code: languageCode,
            filters: [
              ["keyword_data.keyword", "regex", regex]
            ],
            limit: 500
          }];
          
          try {
            const batchResult = await this.makeDataForSeoRequest(
              apiUrl,
              requestBody,
              auth,
              domainId,
              cleanDomain,
              batch.length,
              locationCode,
              languageCode,
              isIncremental
            );
            
            allResults = allResults.concat(batchResult.results);
            allTaskIds.push(batchResult.taskId);
            totalCost += batchResult.cost;
            
            console.log(`Batch ${i + 1} completed: found ${batchResult.results.length} keywords`);
          } catch (error: any) {
            console.error(`Batch ${i + 1} failed:`, error.message);
            // Continue with other batches even if one fails
          }
        }
        
        console.log(`Total results from all batches: ${allResults.length}`);
      }

      // Store results in the database for pagination
      if (allResults.length > 0) {
        const batchId = isIncremental ? DataForSeoCacheService.generateBatchId() : null;
        await this.storeResults(domainId, allResults, locationCode, languageCode, batchId, isIncremental);
      }

      // Update domain status
      await this.updateDomainAnalysisStatus(domainId, 'analyzed', allResults.length);

      return {
        domainId,
        domain,
        keywords: allResults.slice(0, 50), // Return only first 50 for initial display
        totalFound: allResults.length,
        status: 'success',
        taskId: allTaskIds.join(','), // Join multiple task IDs
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
    languageCode: string,
    batchId: string | null = null,
    isIncremental: boolean = false
  ): Promise<void> {
    // Skip database storage for temporary domains
    if (domainId.startsWith('temp-')) {
      console.log('Skipping database storage for temporary domain:', domainId);
      return;
    }
    
    try {
      const analysisDate = new Date();
      const batchSize = 100;
      
      // Insert in batches to avoid query size limits
      for (let i = 0; i < results.length; i += batchSize) {
        const batch = results.slice(i, i + batchSize);
        const values = batch.map(r => {
          const batchIdValue = batchId ? `'${batchId}'::uuid` : 'NULL';
          return `(gen_random_uuid(), '${domainId}'::uuid, '${r.keyword.replace(/'/g, "''")}', ${r.position}, ${r.searchVolume || 'NULL'}, '${r.url.replace(/'/g, "''")}', NULL, ${r.cpc || 'NULL'}, '${r.competition || 'UNKNOWN'}', ${locationCode}, '${languageCode}', '${analysisDate.toISOString()}', NOW(), ${batchIdValue}, ${isIncremental})`;
        }).join(',');
        
        await db.execute(sql.raw(`
          INSERT INTO keyword_analysis_results 
          (id, bulk_analysis_domain_id, keyword, position, search_volume, url, keyword_difficulty, cpc, competition, location_code, language_code, analysis_date, created_at, analysis_batch_id, is_incremental)
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
    // Skip database update for temporary domains
    if (domainId.startsWith('temp-')) {
      console.log('Skipping database update for temporary domain:', domainId);
      return;
    }
    
    try {
      await db.execute(sql`
        UPDATE bulk_analysis_domains 
        SET 
          dataforseo_status = ${status},
          dataforseo_keywords_found = ${keywordsFound},
          dataforseo_analyzed_at = NOW(),
          dataforseo_results_count = ${keywordsFound},
          has_dataforseo_results = ${keywordsFound > 0},
          dataforseo_last_analyzed = NOW(),
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