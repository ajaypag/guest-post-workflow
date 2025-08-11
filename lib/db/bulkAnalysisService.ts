import { db } from './connection';
import { targetPages, TargetPage } from './schema';
import { bulkAnalysisDomains, BulkAnalysisDomain, bulkAnalysisProjects } from './bulkAnalysisSchema';
import { eq, and, inArray, sql, ne, desc, asc, or, like } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export type DuplicateResolution = 'keep_both' | 'move_to_new' | 'skip' | 'update_original';

/**
 * Helper function to sanitize UUID fields (convert empty strings to null)
 */
function sanitizeUUID(value: string | null | undefined): string | null {
  if (value === '' || value === undefined) {
    return null;
  }
  return value;
}

/**
 * Helper function to deduplicate array values
 */
function deduplicateArray(arr: any[] | null | undefined): any[] | null {
  if (!arr || !Array.isArray(arr)) {
    return arr || null;
  }
  return [...new Set(arr)];
}

export interface DuplicateResolutionChoice {
  domain: string;
  existingDomainId: string;
  existingProjectId: string;
  existingProjectName: string;
  resolution: DuplicateResolution;
}

export interface BulkAnalysisInput {
  clientId: string;
  domains: string[];
  targetPageIds: string[];
  userId: string;
  manualKeywords?: string;
  projectId: string;
  airtableMetadata?: Record<string, any>; // Map of domain -> metadata
  duplicateResolutions?: DuplicateResolutionChoice[]; // How to handle duplicates
}

export interface BulkAnalysisResult extends BulkAnalysisDomain {
  targetPages?: TargetPage[];
  keywords?: string[];
}

export interface BulkAnalysisFilter {
  qualificationStatus?: 'pending' | 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified' | 'qualified_any';
  hasWorkflow?: boolean;
  search?: string;
  projectId?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export class BulkAnalysisService {
  /**
   * Clean and normalize domain
   */
  private static cleanDomain(domain: string): string {
    return domain
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/$/, '')
      .trim();
  }

  /**
   * Get all bulk analysis domains for a client
   */
  static async getClientDomains(clientId: string, projectId?: string): Promise<BulkAnalysisResult[]> {
    try {
      const conditions = [eq(bulkAnalysisDomains.clientId, clientId)];
      
      if (projectId !== undefined) {
        conditions.push(eq(bulkAnalysisDomains.projectId, projectId));
      }
      
      const domains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(and(...conditions))
        .orderBy(desc(bulkAnalysisDomains.createdAt));

      return domains;
    } catch (error) {
      console.error('Error fetching client domains:', error);
      throw error;
    }
  }

  /**
   * Get a single domain by ID
   */
  static async getDomainById(domainId: string): Promise<BulkAnalysisResult | null> {
    try {
      const domains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(eq(bulkAnalysisDomains.id, domainId))
        .limit(1);

      return domains[0] || null;
    } catch (error) {
      console.error('Error fetching domain by ID:', error);
      throw error;
    }
  }

  /**
   * Create or update bulk analysis domains with duplicate resolution
   */
  static async createOrUpdateDomains(input: BulkAnalysisInput): Promise<BulkAnalysisResult[]> {
    try {
      const { clientId, domains, targetPageIds, userId, manualKeywords, projectId, airtableMetadata, duplicateResolutions } = input;
      
      // Clean domains
      const cleanedDomains = domains.map(d => this.cleanDomain(d)).filter(Boolean);
      
      let allKeywords = new Set<string>();
      let pages: TargetPage[] = [];
      
      if (manualKeywords) {
        // Use manual keywords if provided
        const keywords = manualKeywords.split(',').map(k => k.trim()).filter(Boolean);
        keywords.forEach(k => allKeywords.add(k));
      } else if (targetPageIds && targetPageIds.length > 0) {
        // Otherwise get keywords from target pages
        pages = await db
          .select()
          .from(targetPages)
          .where(
            and(
              eq(targetPages.clientId, clientId),
              inArray(targetPages.id, targetPageIds)
            )
          );

        // Aggregate and dedupe keywords
        pages.forEach(page => {
          if (page.keywords) {
            const keywords = page.keywords.split(',').map(k => k.trim());
            keywords.forEach(k => allKeywords.add(k));
          }
        });
      }
      
      const keywordCount = allKeywords.size;

      // Prepare bulk insert/update data
      const domainRecords = cleanedDomains.map(domain => {
        const cleanDomain = this.cleanDomain(domain);
        const metadata = airtableMetadata?.[domain] || airtableMetadata?.[cleanDomain];
        
        return {
          id: uuidv4(),
          clientId,
          domain: cleanDomain,
          qualificationStatus: 'pending' as const,
          targetPageIds: deduplicateArray(targetPageIds),
          keywordCount,
          checkedBy: null,
          checkedAt: null,
          notes: null,
          projectId: sanitizeUUID(projectId),
          projectAddedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          // Add Airtable metadata if available
          ...(metadata && {
            airtableRecordId: metadata.id,
            airtableMetadata: metadata,
            airtableLastSynced: new Date(),
          }),
        };
      });

      // Insert domains with ON CONFLICT UPDATE
      const insertedDomains = await db
        .insert(bulkAnalysisDomains)
        .values(domainRecords)
        .onConflictDoUpdate({
          target: [bulkAnalysisDomains.clientId, bulkAnalysisDomains.domain],
          set: {
            targetPageIds: sql`excluded.target_page_ids`,
            keywordCount: sql`excluded.keyword_count`,
            updatedAt: new Date(),
            // Update Airtable metadata if provided
            ...(airtableMetadata && {
              airtableRecordId: sql`excluded.airtable_record_id`,
              airtableMetadata: sql`excluded.airtable_metadata`,
              airtableLastSynced: sql`excluded.airtable_last_synced`,
            }),
          },
        })
        .returning();

      // Attach keywords for response
      const results: BulkAnalysisResult[] = insertedDomains.map((domain: BulkAnalysisDomain) => ({
        ...domain,
        targetPages: pages,
        keywords: Array.from(allKeywords),
      }));

      return results;
    } catch (error) {
      console.error('Error creating/updating domains:', error);
      throw error;
    }
  }

  /**
   * Update domain qualification status
   */
  static async updateQualificationStatus(
    domainId: string,
    status: 'pending' | 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified',
    userId: string,
    notes?: string,
    isManual?: boolean,
    selectedTargetPageId?: string
  ): Promise<BulkAnalysisDomain> {
    try {
      // First, get the current domain to check if it has AI reasoning
      const [currentDomain] = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(eq(bulkAnalysisDomains.id, domainId))
        .limit(1);
      
      if (!currentDomain) {
        throw new Error('Domain not found');
      }

      const updateData: any = {
        qualificationStatus: status,
        checkedBy: userId,
        checkedAt: new Date(),
        notes: notes || null,
        updatedAt: new Date(),
        ...(selectedTargetPageId && { selectedTargetPageId }),
      };

      // If this is a manual change to an AI qualification
      if (isManual && currentDomain.aiQualificationReasoning) {
        // Check if the status is being changed from the AI's original decision
        if (currentDomain.qualificationStatus !== status) {
          // Human modified the AI's decision
          updateData.wasManuallyQualified = true;
          updateData.manuallyQualifiedBy = userId;
          updateData.manuallyQualifiedAt = new Date();
        } else {
          // Human verified/agreed with the AI's decision
          updateData.wasHumanVerified = true;
          updateData.humanVerifiedBy = userId;
          updateData.humanVerifiedAt = new Date();
        }
      }

      const [updated] = await db
        .update(bulkAnalysisDomains)
        .set(updateData)
        .where(eq(bulkAnalysisDomains.id, domainId))
        .returning();

      if (!updated) {
        throw new Error('Domain not found');
      }

      return updated;
    } catch (error) {
      console.error('Error updating qualification status:', error);
      throw error;
    }
  }

  /**
   * Get keywords for specific target pages
   */
  static async getTargetPageKeywords(targetPageIds: string[]): Promise<string[]> {
    try {
      const pages = await db
        .select({ keywords: targetPages.keywords })
        .from(targetPages)
        .where(inArray(targetPages.id, targetPageIds));

      // Aggregate and dedupe keywords
      const allKeywords = new Set<string>();
      pages.forEach(page => {
        if (page.keywords) {
          const keywords = page.keywords.split(',').map(k => k.trim());
          keywords.forEach(k => allKeywords.add(k));
        }
      });

      return Array.from(allKeywords);
    } catch (error) {
      console.error('Error fetching target page keywords:', error);
      throw error;
    }
  }

  /**
   * Get qualified domains for a client
   */
  static async getQualifiedDomains(clientId: string): Promise<BulkAnalysisResult[]> {
    try {
      const domains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(
          and(
            eq(bulkAnalysisDomains.clientId, clientId),
            or(
              eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'good_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'marginal_quality')
            )!
          )
        )
        .orderBy(desc(bulkAnalysisDomains.createdAt));

      return domains;
    } catch (error) {
      console.error('Error fetching qualified domains:', error);
      throw error;
    }
  }

  /**
   * Delete a bulk analysis domain
   */
  static async deleteDomain(domainId: string): Promise<void> {
    try {
      await db
        .delete(bulkAnalysisDomains)
        .where(eq(bulkAnalysisDomains.id, domainId));
    } catch (error) {
      console.error('Error deleting domain:', error);
      throw error;
    }
  }

  /**
   * Check if domains already exist for deduplication
   */
  static async getExistingDomains(
    clientId: string,
    domains: string[]
  ): Promise<{ domain: string; status: string }[]> {
    try {
      const cleanedDomains = domains.map(d => this.cleanDomain(d));
      
      const existing = await db
        .select({
          domain: bulkAnalysisDomains.domain,
          status: bulkAnalysisDomains.qualificationStatus,
        })
        .from(bulkAnalysisDomains)
        .where(
          and(
            eq(bulkAnalysisDomains.clientId, clientId),
            inArray(bulkAnalysisDomains.domain, cleanedDomains)
          )
        );

      return existing;
    } catch (error) {
      console.error('Error checking existing domains:', error);
      throw error;
    }
  }

  /**
   * Resolve duplicate domains based on user choices
   */
  static async resolveDuplicatesAndCreate(input: BulkAnalysisInput & {
    resolutions: DuplicateResolutionChoice[]
  }): Promise<BulkAnalysisResult[]> {
    try {
      const { clientId, domains, targetPageIds, userId, manualKeywords, projectId, resolutions } = input;
      
      const results: BulkAnalysisResult[] = [];
      const resolutionMap = new Map(resolutions.map(r => [r.domain, r]));
      
      // Get keywords for new entries
      let allKeywords = new Set<string>();
      let pages: TargetPage[] = [];
      
      if (manualKeywords) {
        const keywords = manualKeywords.split(',').map(k => k.trim()).filter(Boolean);
        keywords.forEach(k => allKeywords.add(k));
      } else if (targetPageIds && targetPageIds.length > 0) {
        pages = await db
          .select()
          .from(targetPages)
          .where(
            and(
              eq(targetPages.clientId, clientId),
              inArray(targetPages.id, targetPageIds)
            )
          );
        pages.forEach(page => {
          if (page.keywords) {
            const keywords = page.keywords.split(',').map(k => k.trim());
            keywords.forEach(k => allKeywords.add(k));
          }
        });
      }
      
      const keywordCount = allKeywords.size;
      const now = new Date();
      
      // Process each domain based on its resolution
      for (const domain of domains) {
        const cleanDomain = this.cleanDomain(domain);
        const resolution = resolutionMap.get(cleanDomain);
        
        if (!resolution) {
          // No duplicate, create new entry
          const newDomain = {
            id: uuidv4(),
            clientId,
            domain: cleanDomain,
            qualificationStatus: 'pending' as const,
            targetPageIds: deduplicateArray(targetPageIds),
            keywordCount,
            projectId: sanitizeUUID(projectId),
            projectAddedAt: now,
            createdAt: now,
            updatedAt: now,
          };
          
          const inserted = await db
            .insert(bulkAnalysisDomains)
            .values(newDomain)
            .onConflictDoUpdate({
              target: [bulkAnalysisDomains.clientId, bulkAnalysisDomains.domain],
              set: {
                targetPageIds: deduplicateArray(targetPageIds),
                keywordCount: sql`excluded.keyword_count`,
                projectId: sanitizeUUID(projectId),
                updatedAt: new Date(),
              },
            })
            .returning();
          
          if (inserted.length === 0) continue;
          
          results.push({
            ...inserted[0],
            targetPages: pages,
            keywords: Array.from(allKeywords),
          });
        } else {
          // Handle based on resolution type
          switch (resolution.resolution) {
            case 'keep_both':
              // Create new entry alongside existing one
              // Use ON CONFLICT DO NOTHING to handle constraint violation gracefully
              const duplicateDomain = {
                id: uuidv4(),
                clientId,
                domain: cleanDomain,
                qualificationStatus: 'pending' as const,
                targetPageIds: deduplicateArray(targetPageIds),
                keywordCount,
                projectId: sanitizeUUID(projectId),
                projectAddedAt: now,
                duplicateOf: sanitizeUUID(resolution.existingDomainId),
                duplicateResolution: 'keep_both' as const,
                duplicateResolvedBy: sanitizeUUID(userId),
                duplicateResolvedAt: now,
                originalProjectId: sanitizeUUID(resolution.existingProjectId),
                resolutionMetadata: {
                  originalProject: resolution.existingProjectName,
                  originalProjectId: sanitizeUUID(resolution.existingProjectId),
                },
                createdAt: now,
                updatedAt: now,
              };
              
              try {
                // For keep_both, try to insert with DO NOTHING on conflict
                // This avoids the unique constraint violation
                const insertedDup = await db
                  .insert(bulkAnalysisDomains)
                  .values(duplicateDomain)
                  .onConflictDoNothing({
                    target: [bulkAnalysisDomains.clientId, bulkAnalysisDomains.domain],
                  })
                  .returning();
                
                // If no insert happened (conflict), update existing record
                if (insertedDup.length === 0) {
                  const updated = await db
                    .update(bulkAnalysisDomains)
                    .set({
                      projectId: sanitizeUUID(projectId),
                      targetPageIds: deduplicateArray(targetPageIds),
                      keywordCount,
                      duplicateResolution: 'keep_both',
                      duplicateResolvedBy: sanitizeUUID(userId),
                      duplicateResolvedAt: now,
                      originalProjectId: sanitizeUUID(resolution.existingProjectId),
                      updatedAt: now,
                    })
                    .where(and(
                      eq(bulkAnalysisDomains.clientId, clientId),
                      eq(bulkAnalysisDomains.domain, cleanDomain)
                    ))
                    .returning();
                  
                  if (updated.length > 0) {
                    results.push({
                      ...updated[0],
                      targetPages: pages,
                      keywords: Array.from(allKeywords),
                    });
                  }
                } else {
                  results.push({
                    ...insertedDup[0],
                    targetPages: pages,
                    keywords: Array.from(allKeywords),
                  });
                }
              } catch (error: any) {
                console.error(`Failed to handle duplicate for domain ${cleanDomain}:`, error);
                // If constraint violation persists, try to update the existing record
                if (error.message?.includes('duplicate key value violates unique constraint')) {
                  try {
                    const updated = await db
                      .update(bulkAnalysisDomains)
                      .set({
                        targetPageIds: deduplicateArray(targetPageIds),
                        keywordCount,
                        duplicateResolution: 'keep_both',
                        duplicateResolvedBy: sanitizeUUID(userId),
                        duplicateResolvedAt: now,
                        originalProjectId: sanitizeUUID(resolution.existingProjectId),
                        updatedAt: now,
                      })
                      .where(
                        and(
                          eq(bulkAnalysisDomains.clientId, clientId),
                          eq(bulkAnalysisDomains.domain, cleanDomain)
                        )
                      )
                      .returning();
                    
                    if (updated.length > 0) {
                      results.push({
                        ...updated[0],
                        targetPages: pages,
                        keywords: Array.from(allKeywords),
                      });
                    }
                  } catch (updateError) {
                    console.error(`Failed to update existing domain ${cleanDomain}:`, updateError);
                  }
                }
              }
              break;
              
            case 'move_to_new':
              // Update existing entry to new project
              const [moved] = await db
                .update(bulkAnalysisDomains)
                .set({
                  projectId: sanitizeUUID(projectId),
                  targetPageIds: deduplicateArray(targetPageIds),
                  keywordCount,
                  originalProjectId: sanitizeUUID(resolution.existingProjectId),
                  duplicateResolution: 'move_to_new' as const,
                  duplicateResolvedBy: sanitizeUUID(userId),
                  duplicateResolvedAt: now,
                  resolutionMetadata: {
                    originalProject: resolution.existingProjectName,
                    movedFrom: sanitizeUUID(resolution.existingProjectId),
                  },
                  updatedAt: now,
                })
                .where(eq(bulkAnalysisDomains.id, resolution.existingDomainId))
                .returning();
              
              if (moved) {
                results.push({
                  ...moved,
                  targetPages: pages,
                  keywords: Array.from(allKeywords),
                });
              }
              break;
              
            case 'update_original':
              // Update existing entry with new data but keep in original project
              const [updated] = await db
                .update(bulkAnalysisDomains)
                .set({
                  targetPageIds: deduplicateArray(targetPageIds),
                  keywordCount,
                  duplicateResolution: 'update_original' as const,
                  duplicateResolvedBy: sanitizeUUID(userId),
                  duplicateResolvedAt: now,
                  resolutionMetadata: {
                    updatedWith: {
                      targetPageIds: deduplicateArray(targetPageIds),
                      keywordCount,
                      projectId: sanitizeUUID(projectId),
                    },
                  },
                  updatedAt: now,
                })
                .where(eq(bulkAnalysisDomains.id, resolution.existingDomainId))
                .returning();
              
              if (updated) {
                results.push({
                  ...updated,
                  targetPages: pages,
                  keywords: Array.from(allKeywords),
                });
              }
              break;
              
            case 'skip':
              // Record that we skipped this domain
              await db
                .update(bulkAnalysisDomains)
                .set({
                  duplicateResolution: 'skip' as const,
                  duplicateResolvedBy: userId,
                  duplicateResolvedAt: now,
                  resolutionMetadata: {
                    skippedForProject: projectId,
                  },
                  updatedAt: now,
                })
                .where(eq(bulkAnalysisDomains.id, resolution.existingDomainId));
              // Don't add to results since we're skipping
              break;
          }
        }
      }
      
      return results;
    } catch (error) {
      console.error('Error resolving duplicates:', error);
      throw error;
    }
  }

  /**
   * Check for duplicate domains with detailed project info
   */
  static async checkDuplicatesWithDetails(
    clientId: string,
    domains: string[],
    currentProjectId: string
  ): Promise<{
    duplicates: Array<{
      domain: string;
      existingDomainId: string;
      existingProjectId: string;
      existingProjectName: string;
      qualificationStatus: string;
      hasWorkflow: boolean;
      checkedAt?: Date;
      checkedBy?: string;
      isInCurrentProject?: boolean;
    }>;
    newDomains: string[];
    alreadyInProject: string[];
  }> {
    try {
      const cleanedDomains = domains.map(d => this.cleanDomain(d));
      
      // Get ALL existing domains (including current project)
      const allExisting = await db
        .select({
          id: bulkAnalysisDomains.id,
          domain: bulkAnalysisDomains.domain,
          projectId: bulkAnalysisDomains.projectId,
          projectName: bulkAnalysisProjects.name,
          qualificationStatus: bulkAnalysisDomains.qualificationStatus,
          hasWorkflow: bulkAnalysisDomains.hasWorkflow,
          checkedAt: bulkAnalysisDomains.checkedAt,
          checkedBy: bulkAnalysisDomains.checkedBy,
        })
        .from(bulkAnalysisDomains)
        .leftJoin(bulkAnalysisProjects, eq(bulkAnalysisDomains.projectId, bulkAnalysisProjects.id))
        .where(
          and(
            eq(bulkAnalysisDomains.clientId, clientId),
            inArray(bulkAnalysisDomains.domain, cleanedDomains)
          )
        );
      
      // Separate domains in current project vs other projects
      const inCurrentProject = allExisting.filter(e => e.projectId === currentProjectId);
      const inOtherProjects = allExisting.filter(e => e.projectId !== currentProjectId);

      // Only report duplicates from OTHER projects (not current)
      const duplicates = inOtherProjects.map(e => ({
        domain: e.domain,
        existingDomainId: e.id,
        existingProjectId: e.projectId || '',
        existingProjectName: e.projectName || 'No Project',
        qualificationStatus: e.qualificationStatus,
        hasWorkflow: e.hasWorkflow || false,
        checkedAt: e.checkedAt || undefined,
        checkedBy: e.checkedBy || undefined,
      }));

      // Domains already in the current project (skip these silently)
      const alreadyInProject = inCurrentProject.map(e => e.domain);
      
      const existingDomainNames = new Set(allExisting.map(e => e.domain));
      const newDomains = cleanedDomains.filter(d => !existingDomainNames.has(d));

      return { 
        duplicates, 
        newDomains,
        alreadyInProject,
      };
    } catch (error) {
      console.error('Error checking duplicates with details:', error);
      throw error;
    }
  }

  /**
   * Get paginated domains with filtering
   */
  static async getPaginatedDomains(
    clientId: string,
    page: number = 1,
    pageSize: number = 50,
    filters?: BulkAnalysisFilter,
    sortBy: 'createdAt' | 'domain' | 'qualificationStatus' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<PaginatedResult<BulkAnalysisResult>> {
    try {
      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const conditions = [eq(bulkAnalysisDomains.clientId, clientId)];
      
      if (filters?.projectId !== undefined) {
        conditions.push(eq(bulkAnalysisDomains.projectId, filters.projectId));
      }
      
      if (filters?.qualificationStatus) {
        if (filters.qualificationStatus === 'qualified_any') {
          conditions.push(
            or(
              eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'good_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'marginal_quality')
            )!
          );
        } else {
          conditions.push(eq(bulkAnalysisDomains.qualificationStatus, filters.qualificationStatus));
        }
      }
      
      if (filters?.hasWorkflow !== undefined) {
        conditions.push(eq(bulkAnalysisDomains.hasWorkflow, filters.hasWorkflow));
      }
      
      if (filters?.search) {
        conditions.push(like(bulkAnalysisDomains.domain, `%${filters.search}%`));
      }
      
      // Get total count
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bulkAnalysisDomains)
        .where(and(...conditions));
      
      // Get paginated data
      let orderByClause;
      
      if (sortBy === 'qualificationStatus') {
        // Custom sort order for qualification status
        const statusOrder = sql`
          CASE ${bulkAnalysisDomains.qualificationStatus}
            WHEN 'high_quality' THEN ${sortOrder === 'asc' ? 1 : 5}
            WHEN 'good_quality' THEN ${sortOrder === 'asc' ? 2 : 4}
            WHEN 'marginal_quality' THEN ${sortOrder === 'asc' ? 3 : 3}
            WHEN 'disqualified' THEN ${sortOrder === 'asc' ? 4 : 2}
            WHEN 'pending' THEN ${sortOrder === 'asc' ? 5 : 1}
            ELSE ${sortOrder === 'asc' ? 6 : 0}
          END
        `;
        orderByClause = statusOrder;
      } else {
        const orderByColumn = 
          sortBy === 'domain' ? bulkAnalysisDomains.domain :
          bulkAnalysisDomains.createdAt;
        orderByClause = sortOrder === 'desc' ? desc(orderByColumn) : asc(orderByColumn);
      }
      
      const domains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(pageSize)
        .offset(offset);
      
      return {
        data: domains,
        total: Number(count),
        page,
        pageSize,
        totalPages: Math.ceil(Number(count) / pageSize)
      };
    } catch (error) {
      console.error('Error fetching paginated domains:', error);
      throw error;
    }
  }

  /**
   * Bulk update qualification status
   */
  static async bulkUpdateStatus(
    domainIds: string[],
    status: 'pending' | 'high_quality' | 'good_quality' | 'marginal_quality' | 'disqualified',
    userId: string | null
  ): Promise<number> {
    try {
      const updateData: any = {
        qualificationStatus: status,
        updatedAt: new Date(),
      };
      
      // Only set checkedBy and checkedAt if userId is provided
      if (userId) {
        updateData.checkedBy = userId;
        updateData.checkedAt = new Date();
      }

      const result = await db
        .update(bulkAnalysisDomains)
        .set(updateData)
        .where(inArray(bulkAnalysisDomains.id, domainIds));
      
      return domainIds.length;
    } catch (error) {
      console.error('Error bulk updating status:', error);
      throw error;
    }
  }

  /**
   * Bulk delete domains
   */
  static async bulkDeleteDomains(domainIds: string[]): Promise<number> {
    try {
      await db
        .delete(bulkAnalysisDomains)
        .where(inArray(bulkAnalysisDomains.id, domainIds));
      
      return domainIds.length;
    } catch (error) {
      console.error('Error bulk deleting domains:', error);
      throw error;
    }
  }

  /**
   * Update workflow tracking for a domain
   */
  static async updateWorkflowTracking(
    domainId: string,
    workflowId: string
  ): Promise<BulkAnalysisDomain> {
    try {
      const [updated] = await db
        .update(bulkAnalysisDomains)
        .set({
          hasWorkflow: true,
          workflowId,
          workflowCreatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bulkAnalysisDomains.id, domainId))
        .returning();

      if (!updated) {
        throw new Error('Domain not found');
      }

      return updated;
    } catch (error) {
      console.error('Error updating workflow tracking:', error);
      throw error;
    }
  }

  /**
   * Refresh pending domains with latest target pages and keywords
   */
  static async refreshPendingDomains(
    clientId: string,
    targetPageIds: string[],
    manualKeywords?: string
  ): Promise<BulkAnalysisResult[]> {
    try {
      // Get all pending domains for this client
      const pendingDomains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(
          and(
            eq(bulkAnalysisDomains.clientId, clientId),
            eq(bulkAnalysisDomains.qualificationStatus, 'pending')
          )
        );

      if (pendingDomains.length === 0) {
        return [];
      }

      let allKeywords = new Set<string>();
      let pages: TargetPage[] = [];
      
      if (manualKeywords) {
        // Use manual keywords if provided
        const keywords = manualKeywords.split(',').map(k => k.trim()).filter(Boolean);
        keywords.forEach(k => allKeywords.add(k));
      } else if (targetPageIds && targetPageIds.length > 0) {
        // Otherwise get keywords from target pages
        pages = await db
          .select()
          .from(targetPages)
          .where(
            and(
              eq(targetPages.clientId, clientId),
              inArray(targetPages.id, targetPageIds)
            )
          );

        // Aggregate and dedupe keywords
        pages.forEach(page => {
          if (page.keywords) {
            const keywords = page.keywords.split(',').map(k => k.trim());
            keywords.forEach(k => allKeywords.add(k));
          }
        });
      }
      
      const keywordCount = allKeywords.size;

      // Update all pending domains with new target pages and keyword count
      const updatedDomains = [];
      for (const domain of pendingDomains) {
        const [updated] = await db
          .update(bulkAnalysisDomains)
          .set({
            targetPageIds: targetPageIds,
            keywordCount,
            updatedAt: new Date(),
          })
          .where(eq(bulkAnalysisDomains.id, domain.id))
          .returning();
        
        if (updated) {
          updatedDomains.push({
            ...updated,
            targetPages: pages,
            keywords: Array.from(allKeywords),
          });
        }
      }

      return updatedDomains;
    } catch (error) {
      console.error('Error refreshing pending domains:', error);
      throw error;
    }
  }

  /**
   * Export domains as CSV data
   */
  static async exportDomains(
    clientId: string,
    filters?: BulkAnalysisFilter
  ): Promise<string> {
    try {
      // Build where conditions
      const conditions = [eq(bulkAnalysisDomains.clientId, clientId)];
      
      if (filters?.qualificationStatus) {
        if (filters.qualificationStatus === 'qualified_any') {
          conditions.push(
            or(
              eq(bulkAnalysisDomains.qualificationStatus, 'high_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'good_quality'),
              eq(bulkAnalysisDomains.qualificationStatus, 'marginal_quality')
            )!
          );
        } else {
          conditions.push(eq(bulkAnalysisDomains.qualificationStatus, filters.qualificationStatus));
        }
      }
      
      if (filters?.hasWorkflow !== undefined) {
        conditions.push(eq(bulkAnalysisDomains.hasWorkflow, filters.hasWorkflow));
      }
      
      const domains = await db
        .select()
        .from(bulkAnalysisDomains)
        .where(and(...conditions))
        .orderBy(desc(bulkAnalysisDomains.createdAt));
      
      // Create CSV
      const headers = ['Domain', 'Status', 'Keywords', 'Has Workflow', 'Checked Date', 'Notes'];
      const rows = domains.map(d => [
        d.domain,
        d.qualificationStatus,
        (d.keywordCount || 0).toString(),
        d.hasWorkflow ? 'Yes' : 'No',
        d.checkedAt ? new Date(d.checkedAt).toLocaleDateString() : '',
        d.notes || ''
      ]);
      
      const csv = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');
      
      return csv;
    } catch (error) {
      console.error('Error exporting domains:', error);
      throw error;
    }
  }

  /**
   * Update DataForSEO analysis status for a domain
   */
  static async updateDomainDataForSeoStatus(
    domainId: string,
    hasResults: boolean,
    resultsCount?: number
  ): Promise<void> {
    try {
      const updateData: any = {
        hasDataForSeoResults: hasResults,
        dataForSeoLastAnalyzed: new Date(),
        updatedAt: new Date(),
      };
      
      if (resultsCount !== undefined) {
        updateData.dataForSeoResultsCount = resultsCount;
      }
      
      await db
        .update(bulkAnalysisDomains)
        .set(updateData)
        .where(eq(bulkAnalysisDomains.id, domainId));
      
      console.log(`Updated domain ${domainId} DataForSEO status: hasResults=${hasResults}, count=${resultsCount}`);
    } catch (error) {
      console.error('Error updating domain DataForSEO status:', error);
      throw error;
    }
  }
}