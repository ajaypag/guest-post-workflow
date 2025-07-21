import { db } from '@/lib/db/connection';
import { v4 as uuidv4 } from 'uuid';

// DataForSEO API types based on documentation
interface DataForSEOResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: DataForSEOTask[];
}

interface DataForSEOTask {
  id: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  result_count: number;
  path: string[];
  data: any;
  result: RankedKeywordItem[];
}

interface RankedKeywordItem {
  se_type: string;
  keyword_data: {
    keyword: string;
    keyword_info: {
      search_volume: number;
      cpc: number;
      competition: number;
      competition_level: string;
      keyword_difficulty: number;
    };
    search_intent_info: {
      main_intent: string;
      foreign_intent: string[];
    };
    monthly_searches: Array<{
      year: number;
      month: number;
      search_volume: number;
    }>;
  };
  ranked_serp_element: {
    se_domain: string;
    serp_item: {
      se_type: string;
      rank_group: number;
      rank_absolute: number;
      position: string;
      xpath: string;
      domain: string;
      title: string;
      url: string;
      breadcrumb: string;
      website_name: string;
    };
    check_url: string;
    serp_url: string;
    website_name: string;
  };
}

// Our simplified data structure for storage
export interface RankedKeywordResult {
  keyword: string;
  rank_absolute: number;
  search_engine: string;
  keyword_difficulty: number;
  search_volume: number;
  cpc: number;
  competition_level: string;
  ranking_url: string;
  domain: string;
  topic_match: string;
  site_id: string;
  collected_at: Date;
}

export class DataForSEOService {
  private apiLogin: string;
  private apiPassword: string;
  private baseURL: string = 'https://api.dataforseo.com/v3';

  constructor() {
    this.apiLogin = process.env.DATAFORSEO_LOGIN!;
    this.apiPassword = process.env.DATAFORSEO_PASSWORD!;
    
    if (!this.apiLogin || !this.apiPassword) {
      throw new Error('DataForSEO credentials not configured');
    }
  }

  // Get ranked keywords for a domain with topic filter
  async getRankedKeywords(
    domain: string,
    topicFilter: string,
    locationName: string = 'United States',
    languageCode: string = 'en',
    limit: number = 100
  ): Promise<RankedKeywordItem[]> {
    try {
      const requestBody = {
        target: domain,
        location_name: locationName,
        language_code: languageCode,
        limit: limit,
        filters: [
          ["keyword", "like", `%${topicFilter}%`]
        ],
        order_by: ["ranked_serp_element.serp_item.rank_group,asc"]
      };

      console.log(`📡 Calling DataForSEO API for ${domain} with filter: ${topicFilter}`);
      
      const response = await fetch(`${this.baseURL}/dataforseo_labs/google/ranked_keywords/live`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString('base64'),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([requestBody])
      });

      if (!response.ok) {
        throw new Error(`DataForSEO API error: ${response.status} ${response.statusText}`);
      }

      const data: DataForSEOResponse = await response.json();
      
      if (data.status_code !== 20000) {
        throw new Error(`DataForSEO API error: ${data.status_message}`);
      }

      if (!data.tasks || data.tasks.length === 0) {
        console.log(`⚠️ No tasks returned for ${domain} with filter: ${topicFilter}`);
        return [];
      }

      const task = data.tasks[0];
      if (task.status_code !== 20000) {
        throw new Error(`DataForSEO task error: ${task.status_message}`);
      }

      console.log(`✅ Found ${task.result?.length || 0} ranked keywords for ${domain} (${topicFilter})`);
      console.log(`💰 API call cost: $${data.cost}`);
      
      return task.result || [];
    } catch (error) {
      console.error('DataForSEO API error:', error);
      throw error;
    }
  }

  // Get ranked keywords for multiple topic filters
  async getRankedKeywordsBulk(
    domain: string,
    topicFilters: string[],
    locationName: string = 'United States',
    languageCode: string = 'en',
    limitPerTopic: number = 50
  ): Promise<{ topicFilter: string; results: RankedKeywordItem[] }[]> {
    const results = [];
    
    console.log(`🔄 Processing ${topicFilters.length} topic filters for ${domain}`);
    
    for (const topicFilter of topicFilters) {
      try {
        const topicResults = await this.getRankedKeywords(
          domain,
          topicFilter,
          locationName,
          languageCode,
          limitPerTopic
        );
        
        results.push({
          topicFilter,
          results: topicResults
        });
        
        // Small delay between API calls to be respectful
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Failed to get rankings for ${domain} with filter ${topicFilter}:`, error);
        results.push({
          topicFilter,
          results: []
        });
      }
    }
    
    return results;
  }

  // Convert API response to our storage format
  transformToStorageFormat(
    apiResults: RankedKeywordItem[],
    siteId: string,
    topicMatch: string
  ): RankedKeywordResult[] {
    return apiResults.map(item => ({
      keyword: item.keyword_data.keyword,
      rank_absolute: item.ranked_serp_element.serp_item.rank_absolute,
      search_engine: item.se_type,
      keyword_difficulty: item.keyword_data.keyword_info?.keyword_difficulty || 0,
      search_volume: item.keyword_data.keyword_info?.search_volume || 0,
      cpc: item.keyword_data.keyword_info?.cpc || 0,
      competition_level: item.keyword_data.keyword_info?.competition_level || 'UNKNOWN',
      ranking_url: item.ranked_serp_element.serp_item.url,
      domain: item.ranked_serp_element.serp_item.domain,
      topic_match: topicMatch,
      site_id: siteId,
      collected_at: new Date()
    }));
  }

  // Store ranking data in database using Drizzle ORM
  async storeRankingData(rankingData: RankedKeywordResult[]): Promise<void> {
    if (rankingData.length === 0) {
      console.log('📝 No ranking data to store');
      return;
    }

    try {
      // Import here to avoid circular dependencies
      const { db } = await import('@/lib/db/connection');
      const { siteRankings } = await import('@/lib/db/schema');
      
      // Convert to Drizzle insert format
      const insertData = rankingData.map(data => ({
        id: uuidv4(),
        siteId: data.site_id,
        jobId: data.site_id, // This will be overridden by the calling code
        keyword: data.keyword.substring(0, 500), // Respect VARCHAR limit
        rankAbsolute: data.rank_absolute,
        searchEngine: data.search_engine,
        keywordDifficulty: data.keyword_difficulty,
        searchVolume: data.search_volume,
        cpc: data.cpc ? data.cpc.toString() : null,
        competitionLevel: data.competition_level,
        rankingUrl: data.ranking_url,
        domain: data.domain.substring(0, 255), // Respect VARCHAR limit
        topicMatch: data.topic_match.substring(0, 100), // Respect VARCHAR limit
        collectedAt: data.collected_at
      }));

      // Insert in batches to avoid overwhelming the database
      const batchSize = 100;
      for (let i = 0; i < insertData.length; i += batchSize) {
        const batch = insertData.slice(i, i + batchSize);
        await db.insert(siteRankings).values(batch);
      }
      
      console.log(`✅ Stored ${rankingData.length} ranking records in database`);
    } catch (error) {
      console.error('❌ Failed to store ranking data:', error);
      throw error;
    }
  }

  // Main method: Collect and store rankings for a site
  async collectSiteRankings(
    siteId: string,
    domain: string,
    topicFilters: string[],
    options: {
      locationName?: string;
      languageCode?: string;
      limitPerTopic?: number;
    } = {}
  ): Promise<{
    totalKeywords: number;
    totalApiCalls: number;
    totalCost: number;
    resultsByTopic: { [topic: string]: number };
  }> {
    const {
      locationName = 'United States',
      languageCode = 'en',
      limitPerTopic = 50
    } = options;

    console.log(`🚀 Starting ranking collection for ${domain}`);
    console.log(`📋 Topic filters: ${topicFilters.join(', ')}`);

    const bulkResults = await this.getRankedKeywordsBulk(
      domain,
      topicFilters,
      locationName,
      languageCode,
      limitPerTopic
    );

    let totalKeywords = 0;
    let totalCost = 0;
    const resultsByTopic: { [topic: string]: number } = {};
    const allRankingData: RankedKeywordResult[] = [];

    // Process results from each topic filter
    for (const { topicFilter, results } of bulkResults) {
      const transformedData = this.transformToStorageFormat(results, siteId, topicFilter);
      allRankingData.push(...transformedData);
      
      resultsByTopic[topicFilter] = results.length;
      totalKeywords += results.length;
    }

    // Store all ranking data
    if (allRankingData.length > 0) {
      await this.storeRankingData(allRankingData);
    }

    console.log(`🎉 Collection complete for ${domain}:`);
    console.log(`   • Total keywords found: ${totalKeywords}`);
    console.log(`   • API calls made: ${topicFilters.length}`);
    console.log(`   • Results by topic:`, resultsByTopic);

    return {
      totalKeywords,
      totalApiCalls: topicFilters.length,
      totalCost, // Will need to track this from API responses
      resultsByTopic
    };
  }

  // Utility: Get available locations for API calls
  async getAvailableLocations(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseURL}/dataforseo_labs/locations`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data.tasks?.[0]?.result || [];
    } catch (error) {
      console.error('Failed to get locations:', error);
      return [];
    }
  }

  // Utility: Check API usage/credits
  async checkApiUsage(): Promise<any> {
    try {
      const response = await fetch(`${this.baseURL}/user`, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${this.apiLogin}:${this.apiPassword}`).toString('base64'),
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      return data.tasks?.[0]?.result || {};
    } catch (error) {
      console.error('Failed to check API usage:', error);
      return null;
    }
  }
}

export const dataForSEOService = new DataForSEOService();