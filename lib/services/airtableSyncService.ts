import { AirtableService } from './airtableService';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';
import { Pool } from 'pg';
import { 
  AirtableWebsite, 
  ProcessedWebsite,
  WebsiteFilters 
} from '@/types/airtable';

// Get the underlying pool from drizzle
const pool = (db as any).$client as Pool;

export class AirtableSyncService {
  /**
   * Full sync - import all websites from Airtable
   */
  static async fullSync(): Promise<{
    created: number;
    updated: number;
    errors: number;
    total: number;
  }> {
    console.log('🔄 Starting full Airtable sync...');
    
    const syncLogId = await this.createSyncLog('full', 'sync');
    const stats = {
      created: 0,
      updated: 0,
      errors: 0,
      total: 0
    };
    
    try {
      let hasMore = true;
      let offset: string | undefined;
      let pageCount = 0;
      const maxPages = 100; // Safety limit - max 10,000 records
      
      // Fetch all websites from Airtable
      while (hasMore && pageCount < maxPages) {
        pageCount++;
        console.log(`📄 Fetching page ${stats.total > 0 ? Math.floor(stats.total / 100) + 1 : 1}, offset: ${offset || 'none'}`);
        // Don't pass a limit - let Airtable handle pagination naturally
        const result = await AirtableService.searchWebsites({}, 9999, offset); // Large number to avoid maxRecords limitation
        
        console.log(`📊 Page results: ${result.websites.length} websites, hasMore: ${result.hasMore}, nextOffset: ${result.nextOffset || 'none'}`);
        
        for (const website of result.websites) {
          stats.total++;
          try {
            await this.syncWebsite(website);
            
            // Check if it's a new or updated record
            const existing = await pool.query(`
              SELECT id FROM websites WHERE airtable_id = $1
            `, [website.id]);
            
            if (existing.rowCount === 0) {
              stats.created++;
            } else {
              stats.updated++;
            }
          } catch (error) {
            console.error(`Error syncing website ${website.domain}:`, error);
            stats.errors++;
          }
        }
        
        hasMore = result.hasMore;
        offset = result.nextOffset;
        
        // Progress update every 100 records
        if (stats.total % 100 === 0) {
          console.log(`✅ Progress: ${stats.total} websites processed (${stats.created} created, ${stats.updated} updated, ${stats.errors} errors)`);
        }
        
        // Add a small delay between pages to avoid rate limiting (5 requests/second limit)
        if (hasMore) {
          await new Promise(resolve => setTimeout(resolve, 250)); // 4 requests per second to be safe
        }
      }
      
      if (pageCount >= maxPages) {
        console.warn(`⚠️ Reached maximum page limit of ${maxPages}. Some records may not have been synced.`);
      }
      
      await this.completeSyncLog(syncLogId, 'success', stats.total);
      console.log('✅ Full sync completed:', stats);
      
      return stats;
    } catch (error) {
      await this.completeSyncLog(syncLogId, 'failed', stats.total, error);
      throw error;
    }
  }
  
  /**
   * Sync a single website
   */
  static async syncWebsite(website: ProcessedWebsite): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Upsert website
      const websiteResult = await client.query(`
        INSERT INTO websites (
          airtable_id, domain, domain_rating, total_traffic,
          guest_post_cost, categories, type, website_type, niche, status,
          has_guest_post, has_link_insert, published_opportunities,
          overall_quality, airtable_created_at, airtable_updated_at,
          last_synced_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW(), NOW())
        ON CONFLICT (airtable_id) DO UPDATE SET
          domain = EXCLUDED.domain,
          domain_rating = EXCLUDED.domain_rating,
          total_traffic = EXCLUDED.total_traffic,
          guest_post_cost = EXCLUDED.guest_post_cost,
          categories = EXCLUDED.categories,
          type = EXCLUDED.type,
          website_type = EXCLUDED.website_type,
          niche = EXCLUDED.niche,
          status = EXCLUDED.status,
          has_guest_post = EXCLUDED.has_guest_post,
          has_link_insert = EXCLUDED.has_link_insert,
          published_opportunities = EXCLUDED.published_opportunities,
          overall_quality = EXCLUDED.overall_quality,
          airtable_updated_at = NOW(),
          last_synced_at = NOW()
        RETURNING id
      `, [
        website.id,
        website.domain,
        website.domainRating,
        website.totalTraffic,
        website.guestPostCost,
        website.categories,
        website.type,
        website.websiteType,
        website.niche,
        website.status,
        website.hasGuestPost,
        website.hasLinkInsert,
        website.publishedOpportunities,
        website.overallQuality
      ]);
      
      const websiteId = websiteResult.rows[0].id;
      
      // Delete existing contacts (we'll re-insert)
      await client.query(`
        DELETE FROM website_contacts WHERE website_id = $1
      `, [websiteId]);
      
      // Deduplicate contacts by email
      const uniqueContacts = new Map<string, typeof website.contacts[0]>();
      for (const contact of website.contacts) {
        if (contact.email) {
          // If duplicate, prefer the one marked as primary or with lower cost
          const existing = uniqueContacts.get(contact.email);
          if (!existing || contact.isPrimary || 
              (contact.guestPostCost && (!existing.guestPostCost || contact.guestPostCost < existing.guestPostCost))) {
            uniqueContacts.set(contact.email, contact);
          }
        }
      }
      
      // Insert unique contacts
      for (const contact of uniqueContacts.values()) {
        await client.query(`
          INSERT INTO website_contacts (
            website_id, email, is_primary, has_paid_guest_post,
            has_swap_option, guest_post_cost, link_insert_cost,
            requirement, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          websiteId,
          contact.email,
          contact.isPrimary,
          contact.hasPaidGuestPost,
          contact.hasSwapOption,
          contact.guestPostCost,
          contact.linkInsertCost,
          contact.requirement,
          'Active'
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Search websites from local database
   */
  static async searchWebsitesLocal(
    filters: WebsiteFilters & { 
      clientId?: string;
      onlyQualified?: boolean;
      onlyUnqualified?: boolean;
    },
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    websites: any[];
    total: number;
  }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;
    
    // Build filter conditions
    if (filters.minDR !== undefined) {
      conditions.push(`w.domain_rating >= $${paramIndex++}`);
      params.push(filters.minDR);
    }
    
    if (filters.maxDR !== undefined) {
      conditions.push(`w.domain_rating <= $${paramIndex++}`);
      params.push(filters.maxDR);
    }
    
    if (filters.minTraffic !== undefined) {
      conditions.push(`w.total_traffic >= $${paramIndex++}`);
      params.push(filters.minTraffic);
    }
    
    if (filters.maxTraffic !== undefined) {
      conditions.push(`w.total_traffic <= $${paramIndex++}`);
      params.push(filters.maxTraffic);
    }
    
    if (filters.minCost !== undefined) {
      conditions.push(`COALESCE(w.derived_guest_post_cost, w.guest_post_cost) >= $${paramIndex++}`);
      params.push(filters.minCost);
    }
    
    if (filters.maxCost !== undefined) {
      conditions.push(`(COALESCE(w.derived_guest_post_cost, w.guest_post_cost) <= $${paramIndex++} AND COALESCE(w.derived_guest_post_cost, w.guest_post_cost) IS NOT NULL)`);
      params.push(filters.maxCost);
    }
    
    if (filters.status && filters.status !== 'All') {
      conditions.push(`w.status = $${paramIndex++}`);
      params.push(filters.status);
    }
    
    if (filters.source) {
      conditions.push(`w.source = $${paramIndex++}`);
      params.push(filters.source);
    }
    
    if (filters.hasGuestPost === true) {
      conditions.push(`w.has_guest_post = true`);
    }
    
    if (filters.hasLinkInsert === true) {
      conditions.push(`w.has_link_insert = true`);
    }
    
    if (filters.searchTerm) {
      // Search across domain, categories, and niches
      conditions.push(`(
        w.domain ILIKE $${paramIndex} OR 
        EXISTS (
          SELECT 1 FROM unnest(w.categories) AS cat 
          WHERE cat ILIKE $${paramIndex}
        ) OR 
        EXISTS (
          SELECT 1 FROM unnest(w.niche) AS n 
          WHERE n ILIKE $${paramIndex}
        )
      )`);
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }
    
    if (filters.categories && filters.categories.length > 0) {
      conditions.push(`w.categories && $${paramIndex++}`);
      params.push(filters.categories);
    }
    
    if (filters.websiteTypes && filters.websiteTypes.length > 0) {
      conditions.push(`w.website_type && $${paramIndex++}`);
      params.push(filters.websiteTypes);
    }
    
    if (filters.niches && filters.niches.length > 0) {
      conditions.push(`w.niche && $${paramIndex++}`);
      params.push(filters.niches);
    }
    
    // Publisher offerings filter  
    if (filters.hasOfferings === true) {
      conditions.push(`EXISTS (
        SELECT 1 FROM publisher_offering_relationships por
        INNER JOIN publisher_offerings po ON po.id = por.offering_id
        WHERE por.website_id = w.id AND por.is_active = true
      )`);
    } else if (filters.hasOfferings === false) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM publisher_offering_relationships por
        INNER JOIN publisher_offerings po ON po.id = por.offering_id
        WHERE por.website_id = w.id AND por.is_active = true
      )`);
    }
    
    // Airtable metadata filters
    if (filters.airtableUpdatedAfter) {
      conditions.push(`w.airtable_updated_at >= $${paramIndex++}`);
      params.push(filters.airtableUpdatedAfter);
    }
    
    if (filters.airtableUpdatedBefore) {
      conditions.push(`w.airtable_updated_at <= $${paramIndex++}`);
      params.push(filters.airtableUpdatedBefore);
    }
    
    if (filters.lastSyncedAfter) {
      conditions.push(`w.last_synced_at >= $${paramIndex++}`);
      params.push(filters.lastSyncedAfter);
    }
    
    if (filters.lastSyncedBefore) {
      conditions.push(`w.last_synced_at <= $${paramIndex++}`);
      params.push(filters.lastSyncedBefore);
    }
    
    // Handle qualification filters
    let joinClause = '';
    if (filters.clientId && (filters.onlyQualified || filters.onlyUnqualified)) {
      if (filters.onlyQualified) {
        joinClause = `
          INNER JOIN website_qualifications wq 
          ON w.id = wq.website_id 
          AND wq.client_id = $${paramIndex++}
          AND wq.status = 'qualified'
        `;
        params.push(filters.clientId);
      } else if (filters.onlyUnqualified) {
        conditions.push(`
          NOT EXISTS (
            SELECT 1 FROM website_qualifications wq 
            WHERE wq.website_id = w.id 
            AND wq.client_id = $${paramIndex++}
            AND wq.status = 'qualified'
          )
        `);
        params.push(filters.clientId);
      }
    }
    
    const whereClause = conditions.join(' AND ');
    
    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT w.id) as total
      FROM websites w
      ${joinClause}
      WHERE ${whereClause}
    `;
    
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].total);
    
    // Get websites with contacts
    const query = `
      SELECT 
        w.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', wc.id,
              'email', wc.email,
              'isPrimary', wc.is_primary,
              'hasPaidGuestPost', wc.has_paid_guest_post,
              'hasSwapOption', wc.has_swap_option,
              'guestPostCost', wc.guest_post_cost,
              'linkInsertCost', wc.link_insert_cost,
              'requirement', wc.requirement
            )
          ) FILTER (WHERE wc.id IS NOT NULL),
          '[]'::json
        ) as contacts,
        CASE 
          WHEN wq.id IS NOT NULL THEN jsonb_build_object(
            'qualifiedAt', wq.qualified_at,
            'qualifiedBy', wq.qualified_by,
            'status', wq.status,
            'notes', wq.notes
          )
          ELSE NULL
        END as qualification,
        COALESCE(
          (
            SELECT COUNT(*)
            FROM publisher_offering_relationships por
            INNER JOIN publisher_offerings po ON po.id = por.offering_id
            WHERE por.website_id = w.id 
              AND por.is_active = true 
              AND po.is_active = true
          ),
          0
        ) as offerings_count
      FROM websites w
      LEFT JOIN website_contacts wc ON w.id = wc.website_id
      LEFT JOIN website_qualifications wq ON w.id = wq.website_id 
        AND wq.client_id = $${paramIndex}
      ${joinClause}
      WHERE ${whereClause}
      GROUP BY w.id, wq.id
      ORDER BY w.domain_rating DESC NULLS LAST
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    
    // Add client ID for qualification check (if not already added)
    if (!filters.onlyQualified) {
      params.push(filters.clientId || null);
    }
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    return {
      websites: result.rows,
      total
    };
  }
  
  /**
   * Mark websites as qualified for a client
   */
  static async qualifyWebsites(
    websiteIds: string[],
    clientId: string,
    projectId: string | null,
    userId: string,
    notes?: string
  ): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const websiteId of websiteIds) {
        await client.query(`
          INSERT INTO website_qualifications (
            website_id, client_id, project_id, qualified_by, 
            status, notes, imported_from
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (website_id, client_id, project_id) DO UPDATE SET
            qualified_at = NOW(),
            qualified_by = EXCLUDED.qualified_by,
            status = EXCLUDED.status,
            notes = EXCLUDED.notes
        `, [
          websiteId, clientId, projectId, userId,
          'qualified', notes, 'airtable'
        ]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Create sync log entry
   */
  private static async createSyncLog(
    syncType: string,
    action: string
  ): Promise<string> {
    const result = await pool.query(`
      INSERT INTO website_sync_logs (
        sync_type, action, status, started_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING id
    `, [syncType, action, 'in_progress']);
    
    return result.rows[0].id;
  }
  
  /**
   * Complete sync log entry
   */
  private static async completeSyncLog(
    id: string,
    status: string,
    recordsProcessed: number,
    error?: any
  ): Promise<void> {
    await pool.query(`
      UPDATE website_sync_logs 
      SET status = $1, completed_at = NOW(), 
          records_processed = $2, error = $3
      WHERE id = $4
    `, [status, recordsProcessed, error?.message || null, id]);
  }

  /**
   * Get detailed website information including relations
   */
  static async getWebsiteDetails(websiteId: string): Promise<any> {
    try {
      // Get website with contacts
      const websiteResult = await pool.query(`
        SELECT 
          w.*,
          COALESCE(
            json_agg(
              DISTINCT jsonb_build_object(
                'id', c.id,
                'email', c.email,
                'isPrimary', c.is_primary,
                'hasPaidGuestPost', c.has_paid_guest_post,
                'hasSwapOption', c.has_swap_option,
                'guestPostCost', c.guest_post_cost,
                'requirement', c.requirement,
                'createdAt', c.created_at
              )
            ) FILTER (WHERE c.id IS NOT NULL),
            '[]'::json
          ) as contacts
        FROM websites w
        LEFT JOIN website_contacts c ON w.id = c.website_id
        WHERE w.id = $1
        GROUP BY w.id
      `, [websiteId]);

      if (websiteResult.rows.length === 0) {
        return null;
      }

      const website = websiteResult.rows[0];

      // Get qualifications
      const qualificationsResult = await pool.query(`
        SELECT 
          q.id,
          q.client_id,
          c.name as client_name,
          q.qualified_at,
          q.qualified_by,
          u.name as qualified_by_name,
          q.status,
          q.notes
        FROM website_qualifications q
        JOIN clients c ON q.client_id = c.id
        JOIN users u ON q.qualified_by = u.id
        WHERE q.website_id = $1
        ORDER BY q.qualified_at DESC
      `, [websiteId]);

      // Get project associations
      const projectsResult = await pool.query(`
        SELECT 
          p.id,
          p.name,
          c.name as client_name,
          pw.added_at,
          pw.analysis_status
        FROM project_websites pw
        JOIN bulk_analysis_projects p ON pw.project_id = p.id
        JOIN clients c ON p.client_id = c.id
        WHERE pw.website_id = $1
        ORDER BY pw.added_at DESC
      `, [websiteId]);

      // Transform to match expected format
      return {
        id: website.id,
        airtableId: website.airtable_id,
        domain: website.domain,
        domainRating: website.domain_rating,
        totalTraffic: website.total_traffic,
        guestPostCost: website.guest_post_cost,
        categories: website.categories || [],
        type: website.type || [],
        status: website.status,
        hasGuestPost: website.has_guest_post,
        hasLinkInsert: website.has_link_insert,
        publishedOpportunities: website.published_opportunities,
        overallQuality: website.overall_quality,
        lastSyncedAt: website.last_synced_at,
        createdAt: website.created_at,
        updatedAt: website.updated_at,
        domainAuthority: website.domain_authority,
        spamScore: website.spam_score,
        organicKeywords: website.organic_keywords,
        organicTraffic: website.organic_traffic,
        referringDomains: website.referring_domains,
        language: website.language,
        country: website.country,
        notes: website.notes,
        lastOutreachDate: website.last_outreach_date,
        contacts: website.contacts,
        qualifications: qualificationsResult.rows.map(q => ({
          id: q.id,
          clientId: q.client_id,
          clientName: q.client_name,
          qualifiedAt: q.qualified_at,
          qualifiedBy: q.qualified_by,
          qualifiedByName: q.qualified_by_name || 'Unknown',
          status: q.status,
          notes: q.notes
        })),
        projects: projectsResult.rows.map(p => ({
          id: p.id,
          name: p.name,
          clientName: p.client_name,
          addedAt: p.added_at,
          analysisStatus: p.analysis_status
        }))
      };
    } catch (error) {
      console.error('Error fetching website details:', error);
      throw error;
    }
  }
}