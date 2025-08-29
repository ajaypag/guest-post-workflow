import pLimit from 'p-limit';
import { DataForSeoService } from './dataForSeoService';
import { AIQualificationService } from './aiQualificationService';
import { BulkAnalysisService } from '@/lib/db/bulkAnalysisService';
import { db } from '@/lib/db/connection';
import { bulkAnalysisDomains } from '@/lib/db/bulkAnalysisSchema';
import { eq, and, inArray, or, sql } from 'drizzle-orm';
import { targetPages } from '@/lib/db/schema';

interface DomainQualificationProgress {
  domainId: string;
  domain: string;
  stage: 'pending' | 'dataforseo_running' | 'dataforseo_complete' | 'ai_running' | 'completed' | 'error';
  dataForSeoStatus?: 'success' | 'error' | 'skipped';
  aiStatus?: 'success' | 'error' | 'skipped';
  targetMatchStatus?: 'success' | 'error' | 'skipped'; // New field
  error?: string;
  keywordsFound?: number;
  qualificationStatus?: string;
  suggestedTargetUrl?: string; // New field
  timings?: {
    dataForSeoMs?: number;
    aiMs?: number;
    targetMatchMs?: number; // New field
    totalMs?: number;
  };
}

interface MasterQualificationOptions {
  locationCode?: number;
  languageCode?: string;
  onProgress?: (progress: DomainQualificationProgress) => void;
  skipDataForSeo?: boolean;
  skipAI?: boolean;
  skipTargetMatching?: boolean; // New option to control target matching
  targetPageIds?: string[]; // Optional: specific target pages to match against
}

interface DomainGroup {
  needsBoth: any[];
  needsDataForSeoOnly: any[];
  needsAIOnly: any[];
  alreadyComplete: any[];
}

export class MasterQualificationService {
  // Optimized concurrency limits based on API documentation and testing
  private static readonly DOMAIN_CONCURRENT_LIMIT = 20; // Overall concurrent domains
  private static readonly DATAFORSEO_CONCURRENT_LIMIT = 25; // DataForSEO allows 30, we use 25 for safety
  private static readonly OPENAI_CONCURRENT_LIMIT = 8; // O3 model seems to handle 8-10 well
  
  // Create limiters
  private static dataForSeoLimiter = pLimit(this.DATAFORSEO_CONCURRENT_LIMIT);
  private static openAILimiter = pLimit(this.OPENAI_CONCURRENT_LIMIT);
  private static domainLimiter = pLimit(this.DOMAIN_CONCURRENT_LIMIT);

  /**
   * Resolve mixed UUID/URL targetPageIds to proper UUIDs by looking up URLs in target_pages table
   */
  private static async resolveTargetPageIds(targetPageIds: string[]): Promise<string[]> {
    if (!targetPageIds || targetPageIds.length === 0) {
      return [];
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const resolvedIds: string[] = [];
    const urlsToLookup: string[] = [];

    // Separate UUIDs from URLs
    for (const id of targetPageIds) {
      if (uuidRegex.test(id)) {
        resolvedIds.push(id);
      } else {
        urlsToLookup.push(id);
        console.log(`🔍 Need to resolve URL to UUID: ${id}`);
      }
    }

    // Look up UUIDs for URLs
    if (urlsToLookup.length > 0) {
      try {
        const targetPageRecords = await db
          .select({ id: targetPages.id, url: targetPages.url })
          .from(targetPages)
          .where(inArray(targetPages.url, urlsToLookup));

        for (const record of targetPageRecords) {
          resolvedIds.push(record.id);
          console.log(`✅ Resolved URL ${record.url} → UUID ${record.id}`);
        }

        // Log any URLs that couldn't be resolved
        const resolvedUrls = targetPageRecords.map(r => r.url);
        const unresolvedUrls = urlsToLookup.filter(url => !resolvedUrls.includes(url));
        for (const url of unresolvedUrls) {
          console.warn(`⚠️ Could not find target page record for URL: ${url}`);
        }
      } catch (error) {
        console.error('Error resolving target page URLs to UUIDs:', error);
      }
    }

    console.log(`📊 Resolved ${targetPageIds.length} input IDs → ${resolvedIds.length} valid UUIDs`);
    return resolvedIds;
  }

  /**
   * Master qualification with intelligent batching and high concurrency
   */
  static async qualifyDomains(
    clientId: string,
    domainIds: string[],
    options: MasterQualificationOptions = {}
  ): Promise<DomainQualificationProgress[]> {
    const startTime = Date.now();
    console.log(`🚀 Master qualification starting for ${domainIds.length} domains`);
    
    // Get domains and categorize by what they need
    const domainGroups = await this.categorizeDomains(clientId, domainIds, options);
    
    console.log(`📊 Domain breakdown:
      - Need both: ${domainGroups.needsBoth.length}
      - DataForSEO only: ${domainGroups.needsDataForSeoOnly.length}
      - AI only: ${domainGroups.needsAIOnly.length}
      - Already complete: ${domainGroups.alreadyComplete.length}`);

    const allResults: DomainQualificationProgress[] = [];
    
    // Process each group optimally
    const promises: Promise<DomainQualificationProgress[]>[] = [];
    
    // Group 1: Domains needing both (process DataForSEO first, then AI)
    if (domainGroups.needsBoth.length > 0) {
      promises.push(this.processDomainsBoth(domainGroups.needsBoth, clientId, options));
    }
    
    // Group 2: DataForSEO only (max concurrency)
    if (domainGroups.needsDataForSeoOnly.length > 0) {
      promises.push(this.processDomainsDataForSeoOnly(domainGroups.needsDataForSeoOnly, clientId, options));
    }
    
    // Group 3: AI only (controlled concurrency)
    if (domainGroups.needsAIOnly.length > 0) {
      promises.push(this.processDomainsAIOnly(domainGroups.needsAIOnly, clientId, options));
    }
    
    // Wait for all groups to complete
    const results = await Promise.all(promises);
    results.forEach(groupResults => allResults.push(...groupResults));
    
    // Add already complete domains to results
    domainGroups.alreadyComplete.forEach(domain => {
      allResults.push({
        domainId: domain.id,
        domain: domain.domain,
        stage: 'completed',
        dataForSeoStatus: 'skipped',
        aiStatus: 'skipped',
        qualificationStatus: domain.qualificationStatus
      });
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`✅ Master qualification complete in ${(totalTime / 1000).toFixed(2)}s`);
    console.log(`⚡ Average time per domain: ${(totalTime / domainIds.length).toFixed(0)}ms`);
    
    return allResults;
  }

  /**
   * Categorize domains by what processing they need
   */
  private static async categorizeDomains(
    clientId: string,
    domainIds: string[],
    options: MasterQualificationOptions
  ): Promise<DomainGroup> {
    const domains = await db
      .select()
      .from(bulkAnalysisDomains)
      .where(
        and(
          eq(bulkAnalysisDomains.clientId, clientId),
          inArray(bulkAnalysisDomains.id, domainIds)
        )
      );

    const groups: DomainGroup = {
      needsBoth: [],
      needsDataForSeoOnly: [],
      needsAIOnly: [],
      alreadyComplete: []
    };

    domains.forEach(domain => {
      const hasDataForSeo = domain.hasDataForSeoResults;
      const needsDataForSeo = !options.skipDataForSeo && !hasDataForSeo;
      const needsAI = !options.skipAI && domain.qualificationStatus === 'pending';
      
      // AI REQUIRES DataForSEO results to work properly
      if (needsAI && !hasDataForSeo && !options.skipDataForSeo) {
        // Force both - AI needs DataForSEO data
        groups.needsBoth.push(domain);
      } else if (needsDataForSeo && !needsAI) {
        groups.needsDataForSeoOnly.push(domain);
      } else if (needsAI && hasDataForSeo) {
        // Only run AI if we already have DataForSEO results
        groups.needsAIOnly.push(domain);
      } else {
        groups.alreadyComplete.push(domain);
      }
    });

    return groups;
  }

  /**
   * Process domains that need both DataForSEO and AI
   */
  private static async processDomainsBoth(
    domains: any[],
    clientId: string,
    options: MasterQualificationOptions
  ): Promise<DomainQualificationProgress[]> {
    // First run DataForSEO for all domains with high concurrency
    console.log(`🔍 Running DataForSEO for ${domains.length} domains...`);
    const dataForSeoResults = await this.runDataForSeoBatch(domains, options);
    
    // Then run AI qualification for successful DataForSEO results
    const domainsForAI = domains.filter(d => {
      const result = dataForSeoResults.find(r => r.domainId === d.id);
      return result && result.dataForSeoStatus === 'success';
    });
    
    console.log(`🤖 Running AI qualification for ${domainsForAI.length} domains...`);
    const aiResults = await this.runAIBatch(domainsForAI, clientId, options);
    
    // Merge results
    return dataForSeoResults.map(dfResult => {
      const aiResult = aiResults.find(r => r.domainId === dfResult.domainId);
      if (aiResult) {
        return {
          ...dfResult,
          ...aiResult,
          stage: 'completed' as const,
          timings: {
            ...dfResult.timings,
            ...aiResult.timings,
            totalMs: (dfResult.timings?.dataForSeoMs || 0) + (aiResult.timings?.aiMs || 0)
          }
        };
      }
      return dfResult;
    });
  }

  /**
   * Process domains that only need DataForSEO
   */
  private static async processDomainsDataForSeoOnly(
    domains: any[],
    clientId: string,
    options: MasterQualificationOptions
  ): Promise<DomainQualificationProgress[]> {
    console.log(`🔍 Running DataForSEO only for ${domains.length} domains...`);
    return this.runDataForSeoBatch(domains, options);
  }

  /**
   * Process domains that only need AI qualification
   */
  private static async processDomainsAIOnly(
    domains: any[],
    clientId: string,
    options: MasterQualificationOptions
  ): Promise<DomainQualificationProgress[]> {
    console.log(`🤖 Running AI qualification only for ${domains.length} domains...`);
    return this.runAIBatch(domains, clientId, options);
  }

  /**
   * Run DataForSEO analysis with high concurrency
   */
  private static async runDataForSeoBatch(
    domains: any[],
    options: MasterQualificationOptions
  ): Promise<DomainQualificationProgress[]> {
    const promises = domains.map(domain => 
      this.domainLimiter(() => 
        this.dataForSeoLimiter(async () => {
          const startTime = Date.now();
          const progress: DomainQualificationProgress = {
            domainId: domain.id,
            domain: domain.domain,
            stage: 'dataforseo_running'
          };

          try {
            options.onProgress?.(progress);
            
            // Handle mixed UUID/URL targetPageIds by mapping URLs to UUIDs
            const resolvedTargetPageIds = await this.resolveTargetPageIds(domain.targetPageIds as string[]);
            
            const keywords = await BulkAnalysisService.getTargetPageKeywords(resolvedTargetPageIds);
            const result = await DataForSeoService.analyzeDomainWithCache(
              domain.id,
              domain.domain,
              keywords,
              options.locationCode || 2840,
              options.languageCode || 'en'
            );

            progress.dataForSeoStatus = result.status;
            progress.keywordsFound = result.totalFound;
            progress.stage = 'dataforseo_complete';
            progress.timings = { dataForSeoMs: Date.now() - startTime };

            if (result.status === 'success' && result.totalFound > 0) {
              await BulkAnalysisService.updateDomainDataForSeoStatus(domain.id, true);
            }
          } catch (error: any) {
            console.error(`DataForSEO error for ${domain.domain}:`, error);
            progress.dataForSeoStatus = 'error';
            progress.error = error.message;
            progress.stage = 'error';
          }

          options.onProgress?.(progress);
          return progress;
        })
      )
    );

    return Promise.all(promises);
  }

  /**
   * Run AI qualification with controlled concurrency
   */
  private static async runAIBatch(
    domains: any[],
    clientId: string,
    options: MasterQualificationOptions
  ): Promise<DomainQualificationProgress[]> {
    // Get necessary data for AI qualification
    const domainIds = domains.map(d => d.id);
    
    // Get client context - filter by specific target pages if provided
    let clientTargetPages;
    if (options.targetPageIds && options.targetPageIds.length > 0) {
      // Use only specified target pages
      clientTargetPages = await db
        .select()
        .from(targetPages)
        .where(
          and(
            eq(targetPages.clientId, clientId),
            eq(targetPages.status, 'active'),
            inArray(targetPages.id, options.targetPageIds)
          )
        );
      console.log(`🎯 Using ${clientTargetPages.length} specific target pages for matching`);
    } else {
      // Use all active target pages for the client
      clientTargetPages = await db
        .select()
        .from(targetPages)
        .where(
          and(
            eq(targetPages.clientId, clientId),
            eq(targetPages.status, 'active')
          )
        );
      console.log(`🎯 Using all ${clientTargetPages.length} client target pages for matching`);
    }

    // Get DataForSEO results
    const results = await db.execute(sql`
      SELECT 
        bulk_analysis_domain_id as "domainId",
        keyword,
        position,
        search_volume as "searchVolume",
        url
      FROM keyword_analysis_results
      WHERE bulk_analysis_domain_id = ANY(${sql`ARRAY[${sql.join(domainIds, sql`, `)}]::uuid[]`})
      ORDER BY position ASC, search_volume DESC
    `);

    // Group results by domain
    const resultsByDomain = new Map<string, any[]>();
    (results.rows || []).forEach((result: any) => {
      if (!resultsByDomain.has(result.domainId)) {
        resultsByDomain.set(result.domainId, []);
      }
      resultsByDomain.get(result.domainId)!.push(result);
    });

    // Prepare client context
    const clientContext = {
      targetPages: clientTargetPages.map(page => ({
        url: page.url,
        keywords: page.keywords ? page.keywords.split(',').map(k => k.trim()) : [],
        description: page.description || undefined
      })),
      clientKeywords: clientTargetPages
        .flatMap(page => page.keywords ? page.keywords.split(',').map(k => k.trim()) : [])
        .filter((v, i, a) => a.indexOf(v) === i)
    };

    // Process with AI service
    const aiService = new AIQualificationService();
    const domainData = domains.map(domain => ({
      domainId: domain.id,
      domain: domain.domain,
      keywordRankings: (resultsByDomain.get(domain.id) || []).map(r => ({
        keyword: r.keyword,
        position: r.position || 100,
        searchVolume: r.searchVolume || 0,
        url: r.url || ''
      }))
    }));

    // Use AI service's built-in concurrency (10 at a time)
    const qualifications = await aiService.qualifyDomains(domainData, clientContext);

    // Run target matching for qualified domains (unless skipped)
    let targetMatches: any[] = [];
    if (!options.skipTargetMatching) {
      const qualifiedDomains = qualifications
        .filter(q => ['high_quality', 'good_quality'].includes(q.qualification))
        .map(q => ({
          domain: domainData.find(d => d.domainId === q.domainId)!,
          qualification: q
        }));

      if (qualifiedDomains.length > 0) {
        console.log(`🎯 Running target URL matching for ${qualifiedDomains.length} qualified domains...`);
        try {
          targetMatches = await aiService.matchTargetUrls(
            qualifiedDomains,
            clientContext,
            (completed, total) => {
              console.log(`Target matching progress: ${completed}/${total}`);
            }
          );
          console.log(`✅ Target matched ${targetMatches.length} domains`);
        } catch (error) {
          console.error('Target matching error:', error);
          // Don't fail the whole process if target matching fails
        }
      }
    }

    // Update database and prepare results
    const updatePromises = qualifications.map(qual => {
      // Extract topic reasoning from the main reasoning if present
      const reasoningParts = qual.reasoning.match(/\(b\)\s*(.+)/);
      const topicReasoning = reasoningParts ? reasoningParts[1] : null;
      
      // Find target match for this domain if exists
      const targetMatch = targetMatches.find(tm => tm.domainId === qual.domainId);
      
      const updateData: any = {
        qualificationStatus: qual.qualification,
        aiQualificationReasoning: qual.reasoning,
        overlapStatus: qual.overlapStatus,
        authorityDirect: qual.authorityDirect,
        authorityRelated: qual.authorityRelated,
        topicScope: qual.topicScope,
        topicReasoning: topicReasoning,
        evidence: qual.evidence,
        aiQualifiedAt: new Date(),
        updatedAt: new Date()
      };
      
      // Add target matching data if available
      if (targetMatch) {
        updateData.suggestedTargetUrl = targetMatch.best_target_url;
        updateData.targetMatchData = targetMatch;
        updateData.targetMatchedAt = new Date();
      }
      
      return this.openAILimiter(() =>
        db
          .update(bulkAnalysisDomains)
          .set(updateData)
          .where(eq(bulkAnalysisDomains.id, qual.domainId))
      );
    });

    await Promise.all(updatePromises);

    // Convert to progress format
    return qualifications.map(qual => {
      const targetMatch = targetMatches.find(tm => tm.domainId === qual.domainId);
      return {
        domainId: qual.domainId,
        domain: qual.domain,
        stage: 'completed' as const,
        aiStatus: 'success' as const,
        targetMatchStatus: targetMatch ? 'success' as const : 'skipped' as const,
        qualificationStatus: qual.qualification,
        suggestedTargetUrl: targetMatch?.best_target_url,
        timings: { aiMs: 0, targetMatchMs: 0 } // AI service doesn't provide timing
      };
    });
  }

  /**
   * Get smart selection filters for bulk operations
   */
  static async getSmartSelectionFilters(clientId: string): Promise<{
    allPendingDataForSeo: string[];
    allPendingAI: string[];
    allPendingBoth: string[];
    allWithErrors: string[];
  }> {
    const domains = await db
      .select({
        id: bulkAnalysisDomains.id,
        hasDataForSeo: bulkAnalysisDomains.hasDataForSeoResults,
        qualificationStatus: bulkAnalysisDomains.qualificationStatus
      })
      .from(bulkAnalysisDomains)
      .where(eq(bulkAnalysisDomains.clientId, clientId));

    return {
      allPendingDataForSeo: domains
        .filter(d => !d.hasDataForSeo)
        .map(d => d.id),
      
      allPendingAI: domains
        .filter(d => d.qualificationStatus === 'pending')
        .map(d => d.id),
      
      allPendingBoth: domains
        .filter(d => !d.hasDataForSeo && d.qualificationStatus === 'pending')
        .map(d => d.id),
      
      allWithErrors: [] // No error tracking without dataForSeoStatus column
    };
  }
}