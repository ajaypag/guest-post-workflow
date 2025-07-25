import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface CacheAnalysisResult {
  newKeywords: string[];
  existingKeywords: string[];
  existingResults: any[];
  shouldRefreshAll: boolean;
  daysSinceLastAnalysis: number | null;
  apiCallsSaved: number;
}

export class DataForSeoCacheService {
  private static readonly CACHE_EXPIRY_DAYS = 30; // Results older than 30 days should be refreshed
  private static readonly MIN_REFRESH_HOURS = 24; // Don't refresh if analyzed within 24 hours

  /**
   * Track keyword search in history (including zero-result searches)
   */
  static async trackKeywordSearch(
    domainId: string,
    keywords: string[],
    hasResults: boolean,
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<void> {
    try {
      // First ensure the table exists
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS keyword_search_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bulk_analysis_domain_id UUID NOT NULL REFERENCES bulk_analysis_domains(id) ON DELETE CASCADE,
          keyword TEXT NOT NULL,
          location_code INTEGER NOT NULL DEFAULT 2840,
          language_code VARCHAR(10) NOT NULL DEFAULT 'en',
          has_results BOOLEAN NOT NULL DEFAULT FALSE,
          searched_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(bulk_analysis_domain_id, keyword, location_code, language_code)
        )
      `);
      
      // Insert keywords into search history
      for (const keyword of keywords) {
        await db.execute(sql`
          INSERT INTO keyword_search_history 
          (bulk_analysis_domain_id, keyword, location_code, language_code, has_results, searched_at)
          VALUES (${domainId}::uuid, ${keyword}, ${locationCode}, ${languageCode}, ${hasResults}, NOW())
          ON CONFLICT (bulk_analysis_domain_id, keyword, location_code, language_code) 
          DO UPDATE SET 
            has_results = CASE WHEN keyword_search_history.has_results THEN keyword_search_history.has_results ELSE ${hasResults} END,
            searched_at = NOW()
        `);
      }
    } catch (error) {
      console.error('Error tracking keyword search:', error);
    }
  }

  /**
   * Check which keywords need to be analyzed vs which can use cached data
   */
  static async analyzeKeywordCache(
    domainId: string,
    requestedKeywords: string[],
    locationCode: number = 2840,
    languageCode: string = 'en'
  ): Promise<CacheAnalysisResult> {
    try {
      // First check keyword search history to see which keywords have been searched before
      let searchHistoryResult: any = { rows: [] };
      try {
        searchHistoryResult = await db.execute(sql`
          SELECT keyword, has_results, searched_at
          FROM keyword_search_history
          WHERE bulk_analysis_domain_id = ${domainId}::uuid
            AND location_code = ${locationCode}
            AND language_code = ${languageCode}
            AND keyword = ANY(ARRAY[${sql.join(requestedKeywords.map(k => sql`${k}`), sql`, `)}]::text[])
        `);
      } catch (error: any) {
        console.warn('keyword_search_history table might not exist yet:', error.message);
        // Continue without search history
      }
      
      const searchedKeywordsMap = new Map<string, { hasResults: boolean; searchedAt: Date }>();
      searchHistoryResult.rows.forEach((row: any) => {
        searchedKeywordsMap.set(row.keyword, {
          hasResults: row.has_results,
          searchedAt: new Date(row.searched_at)
        });
      });

      // Get domain info including searched keywords
      let domainResult: any = { rows: [] };
      try {
        // First ensure columns exist
        await db.execute(sql`
          ALTER TABLE bulk_analysis_domains
          ADD COLUMN IF NOT EXISTS dataforseo_searched_keywords TEXT[] DEFAULT '{}',
          ADD COLUMN IF NOT EXISTS dataforseo_last_full_analysis_at TIMESTAMP,
          ADD COLUMN IF NOT EXISTS dataforseo_total_api_calls INTEGER DEFAULT 0,
          ADD COLUMN IF NOT EXISTS dataforseo_incremental_api_calls INTEGER DEFAULT 0
        `);
        
        domainResult = await db.execute(sql`
          SELECT 
            dataforseo_searched_keywords as "searchedKeywords",
            dataforseo_last_full_analysis_at as "lastFullAnalysis",
            dataforseo_total_api_calls as "totalApiCalls"
          FROM bulk_analysis_domains
          WHERE id = ${domainId}::uuid
          LIMIT 1
        `);
      } catch (error: any) {
        console.warn('Error getting domain info:', error.message);
      }

      if (!domainResult.rows || !domainResult.rows.length) {
        // Domain not found, analyze all keywords
        return {
          newKeywords: requestedKeywords,
          existingKeywords: [],
          existingResults: [],
          shouldRefreshAll: false,
          daysSinceLastAnalysis: null,
          apiCallsSaved: 0,
        };
      }

      const domain = domainResult.rows[0] as any;
      const searchedKeywords = domain.searchedKeywords || [];
      const lastAnalysis = domain.lastFullAnalysis;

      // Calculate days since last analysis
      let daysSinceLastAnalysis = null;
      let shouldRefreshAll = false;

      if (lastAnalysis) {
        const hoursSinceLastAnalysis = 
          (Date.now() - new Date(lastAnalysis).getTime()) / (1000 * 60 * 60);
        daysSinceLastAnalysis = Math.floor(hoursSinceLastAnalysis / 24);

        // Check if we should refresh all data
        if (daysSinceLastAnalysis > this.CACHE_EXPIRY_DAYS) {
          shouldRefreshAll = true;
        } else if (hoursSinceLastAnalysis < this.MIN_REFRESH_HOURS) {
          // Too soon to refresh, use all cached data
          const existingInRequested = requestedKeywords.filter(k => 
            searchedKeywords.includes(k)
          );
          
          if (existingInRequested.length > 0) {
            const existingResults = await this.getExistingResults(
              domainId, 
              existingInRequested
            );
            
            return {
              newKeywords: requestedKeywords.filter(k => !searchedKeywords.includes(k)),
              existingKeywords: existingInRequested,
              existingResults,
              shouldRefreshAll: false,
              daysSinceLastAnalysis,
              apiCallsSaved: existingInRequested.length > 0 ? 1 : 0,
            };
          }
        }
      }

      if (shouldRefreshAll) {
        // Data is stale, refresh everything
        return {
          newKeywords: requestedKeywords,
          existingKeywords: [],
          existingResults: [],
          shouldRefreshAll: true,
          daysSinceLastAnalysis,
          apiCallsSaved: 0,
        };
      }

      // Determine which keywords are new vs existing using search history
      const newKeywords: string[] = [];
      const existingKeywords: string[] = [];
      
      for (const keyword of requestedKeywords) {
        const searchHistory = searchedKeywordsMap.get(keyword);
        
        if (!searchHistory) {
          // Never searched before
          newKeywords.push(keyword);
        } else {
          // Check if the search is recent enough
          const hoursSinceSearch = (Date.now() - searchHistory.searchedAt.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSearch < this.MIN_REFRESH_HOURS) {
            // Recently searched, use cached data (even if no results)
            existingKeywords.push(keyword);
          } else if (daysSinceLastAnalysis && daysSinceLastAnalysis > this.CACHE_EXPIRY_DAYS) {
            // Data is stale, need to refresh
            newKeywords.push(keyword);
          } else {
            // Use cached data
            existingKeywords.push(keyword);
          }
        }
      }

      // Get existing results for keywords we already have
      const existingResults = existingKeywords.length > 0 
        ? await this.getExistingResults(domainId, existingKeywords)
        : [];

      return {
        newKeywords,
        existingKeywords,
        existingResults,
        shouldRefreshAll: false,
        daysSinceLastAnalysis,
        apiCallsSaved: existingKeywords.length > 0 ? 1 : 0,
      };
    } catch (error) {
      console.error('Error analyzing keyword cache:', error);
      // On error, analyze all keywords
      return {
        newKeywords: requestedKeywords,
        existingKeywords: [],
        existingResults: [],
        shouldRefreshAll: false,
        daysSinceLastAnalysis: null,
        apiCallsSaved: 0,
      };
    }
  }

  /**
   * Get existing results from the database
   */
  private static async getExistingResults(
    domainId: string,
    keywords: string[]
  ): Promise<any[]> {
    try {
      const results = await db.execute(sql`
        SELECT DISTINCT ON (keyword) 
          keyword,
          position,
          search_volume,
          url,
          cpc::float,
          competition,
          analysis_date,
          is_incremental
        FROM keyword_analysis_results
        WHERE bulk_analysis_domain_id = ${domainId}::uuid
          AND keyword = ANY(ARRAY[${sql.join(keywords.map(k => sql`${k}`), sql`, `)}]::text[])
        ORDER BY keyword, analysis_date DESC
      `);

      return results.rows.map(r => ({
        keyword: r.keyword,
        position: r.position,
        searchVolume: r.search_volume,
        url: r.url,
        cpc: r.cpc,
        competition: r.competition,
        analysisDate: r.analysis_date,
        isFromCache: true,
      }));
    } catch (error) {
      console.error('Error fetching existing results:', error);
      return [];
    }
  }

  /**
   * Update the searched keywords list after an analysis
   */
  static async updateSearchedKeywords(
    domainId: string,
    newKeywords: string[],
    isFullAnalysis: boolean = false
  ): Promise<void> {
    try {
      // Get current searched keywords
      const domainResult = await db.execute(sql`
        SELECT 
          dataforseo_searched_keywords as "searchedKeywords",
          dataforseo_total_api_calls as "totalApiCalls",
          dataforseo_incremental_api_calls as "incrementalApiCalls"
        FROM bulk_analysis_domains
        WHERE id = ${domainId}::uuid
        LIMIT 1
      `);

      if (!domainResult.rows || !domainResult.rows.length) return;

      const domain = domainResult.rows[0] as any;
      const currentKeywords = domain.searchedKeywords || [];
      const totalApiCalls = domain.totalApiCalls || 0;
      const incrementalApiCalls = domain.incrementalApiCalls || 0;

      // Merge keywords, removing duplicates
      const updatedKeywords = Array.from(new Set([...currentKeywords, ...newKeywords]));

      // Update the domain record
      const updateData: any = {
        dataforseo_searched_keywords: updatedKeywords,
        dataforseo_total_api_calls: totalApiCalls + 1,
        updated_at: new Date(),
      };

      if (isFullAnalysis) {
        updateData.dataforseo_last_full_analysis_at = new Date();
      } else {
        updateData.dataforseo_incremental_api_calls = incrementalApiCalls + 1;
      }

      // Use raw SQL for update with proper array syntax
      if (isFullAnalysis) {
        await db.execute(sql`
          UPDATE bulk_analysis_domains
          SET 
            dataforseo_searched_keywords = ARRAY[${sql.join(updatedKeywords.map(k => sql`${k}`), sql`, `)}]::text[],
            dataforseo_total_api_calls = ${updateData.dataforseo_total_api_calls},
            dataforseo_last_full_analysis_at = ${updateData.dataforseo_last_full_analysis_at},
            updated_at = ${updateData.updated_at}
          WHERE id = ${domainId}::uuid
        `);
      } else {
        await db.execute(sql`
          UPDATE bulk_analysis_domains
          SET 
            dataforseo_searched_keywords = ARRAY[${sql.join(updatedKeywords.map(k => sql`${k}`), sql`, `)}]::text[],
            dataforseo_total_api_calls = ${updateData.dataforseo_total_api_calls},
            dataforseo_incremental_api_calls = ${updateData.dataforseo_incremental_api_calls},
            updated_at = ${updateData.updated_at}
          WHERE id = ${domainId}::uuid
        `);
      }
    } catch (error) {
      console.error('Error updating searched keywords:', error);
    }
  }

  /**
   * Generate a batch ID for grouping analysis results
   */
  static generateBatchId(): string {
    return uuidv4();
  }

  /**
   * Get cache statistics for a domain
   */
  static async getCacheStats(domainId: string): Promise<{
    totalKeywordsCached: number;
    lastFullAnalysis: Date | null;
    totalApiCalls: number;
    incrementalApiCalls: number;
    cacheHitRate: number;
  }> {
    try {
      const domainResult = await db.execute(sql`
        SELECT 
          dataforseo_searched_keywords as "searchedKeywords",
          dataforseo_last_full_analysis_at as "lastFullAnalysis",
          dataforseo_total_api_calls as "totalApiCalls",
          dataforseo_incremental_api_calls as "incrementalApiCalls"
        FROM bulk_analysis_domains
        WHERE id = ${domainId}::uuid
        LIMIT 1
      `);

      if (!domainResult.rows || !domainResult.rows.length) {
        return {
          totalKeywordsCached: 0,
          lastFullAnalysis: null,
          totalApiCalls: 0,
          incrementalApiCalls: 0,
          cacheHitRate: 0,
        };
      }

      const domain = domainResult.rows[0] as any;
      const totalApiCalls = domain.totalApiCalls || 0;
      const incrementalApiCalls = domain.incrementalApiCalls || 0;
      const cacheHitRate = totalApiCalls > 0 
        ? (incrementalApiCalls / totalApiCalls) * 100 
        : 0;

      return {
        totalKeywordsCached: domain.searchedKeywords?.length || 0,
        lastFullAnalysis: domain.lastFullAnalysis,
        totalApiCalls,
        incrementalApiCalls,
        cacheHitRate: Math.round(cacheHitRate),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalKeywordsCached: 0,
        lastFullAnalysis: null,
        totalApiCalls: 0,
        incrementalApiCalls: 0,
        cacheHitRate: 0,
      };
    }
  }
}