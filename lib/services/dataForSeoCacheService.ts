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
   * Check which keywords need to be analyzed vs which can use cached data
   */
  static async analyzeKeywordCache(
    domainId: string,
    requestedKeywords: string[]
  ): Promise<CacheAnalysisResult> {
    try {
      // Get domain info including searched keywords
      // For now, use raw SQL query until schema is updated
      const domainResult = await db.execute(sql`
        SELECT 
          dataforseo_searched_keywords as "searchedKeywords",
          dataforseo_last_full_analysis_at as "lastFullAnalysis",
          dataforseo_total_api_calls as "totalApiCalls"
        FROM bulk_analysis_domains
        WHERE id = ${domainId}::uuid
        LIMIT 1
      `);

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

      // Determine which keywords are new vs existing
      const newKeywords = requestedKeywords.filter(k => !searchedKeywords.includes(k));
      const existingKeywords = requestedKeywords.filter(k => searchedKeywords.includes(k));

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
          AND keyword = ANY(${keywords}::text[])
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

      // Use raw SQL for update
      await db.execute(sql`
        UPDATE bulk_analysis_domains
        SET 
          dataforseo_searched_keywords = ${updatedKeywords}::text[],
          dataforseo_total_api_calls = ${updateData.dataforseo_total_api_calls},
          ${isFullAnalysis 
            ? sql`dataforseo_last_full_analysis_at = ${updateData.dataforseo_last_full_analysis_at},`
            : sql`dataforseo_incremental_api_calls = ${updateData.dataforseo_incremental_api_calls},`
          }
          updated_at = ${updateData.updated_at}
        WHERE id = ${domainId}::uuid
      `);
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