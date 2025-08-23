import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { 
  publisherOfferings,
  publisherOfferingRelationships
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, isNull, sql } from 'drizzle-orm';
import * as crypto from 'crypto';

// Define the shadow_publisher_websites table structure
// This should match your actual schema - adjust as needed
const shadowPublisherWebsites = {
  id: 'id',
  publisherId: 'publisher_id',
  websiteId: 'website_id',
  confidence: 'confidence',
  source: 'source',
  extractionMethod: 'extraction_method',
  verified: 'verified',
  migrationStatus: 'migration_status',
  migratedAt: 'migrated_at',
  migrationNotes: 'migration_notes',
  createdAt: 'created_at',
  updatedAt: 'updated_at'
};

export interface MigrationResult {
  success: boolean;
  websitesMigrated: number;
  offeringsActivated: number;
  relationshipsCreated: number;
  errors: string[];
  details?: any;
}

export class ShadowPublisherMigrationService {
  /**
   * Main migration function - migrates all shadow data for a publisher
   * Called when a shadow publisher claims their account
   */
  async migratePublisherData(publisherId: string): Promise<MigrationResult> {
    const errors: string[] = [];
    let websitesMigrated = 0;
    let offeringsActivated = 0;
    let relationshipsCreated = 0;

    try {
      // Use transaction for atomicity
      const result = await db.transaction(async (tx) => {
        console.log(`Starting shadow data migration for publisher: ${publisherId}`);

        // 1. Check if already migrated
        const [publisher] = await tx
          .select()
          .from(publishers)
          .where(eq(publishers.id, publisherId))
          .limit(1);

        if (!publisher) {
          throw new Error('Publisher not found');
        }

        // Skip shadow data migrated check for now since field doesn't exist
        // if (publisher.shadowDataMigrated) {
        //   console.log('Shadow data already migrated for this publisher');
        //   return {
        //     success: true,
        //     websitesMigrated: 0,
        //     offeringsActivated: 0,
        //     relationshipsCreated: 0,
        //     errors: ['Data already migrated'],
        //     details: { alreadyMigrated: true }
        //   };
        // }

        // 2. Get all shadow website relationships
        const shadowWebsiteData = await tx.execute(sql`
          SELECT 
            spw.id as shadow_id,
            spw.publisher_id,
            spw.website_id,
            spw.confidence,
            spw.source,
            spw.extraction_method,
            spw.verified,
            w.id as website_id,
            w.domain,
            w.guest_post_cost,
            w.turnaround_time,
            w.domain_rating,
            w.total_traffic
          FROM shadow_publisher_websites spw
          INNER JOIN websites w ON spw.website_id = w.id
          WHERE spw.publisher_id = ${publisherId}
            AND (spw.migration_status IS NULL OR spw.migration_status = 'pending')
        `);

        console.log(`Found ${shadowWebsiteData.rows.length} shadow websites to migrate`);

        // 3. Migrate each website relationship
        for (const shadowRow of shadowWebsiteData.rows) {
          try {
            // Mark as migrating
            await tx.execute(sql`
              UPDATE shadow_publisher_websites 
              SET migration_status = 'migrating'
              WHERE id = ${shadowRow.shadow_id}
            `);

            // Check if relationship already exists
            const existingRelationship = await tx
              .select()
              .from(publisherOfferingRelationships)
              .where(
                and(
                  eq(publisherOfferingRelationships.publisherId, publisherId),
                  eq(publisherOfferingRelationships.websiteId, shadowRow.website_id)
                )
              )
              .limit(1);

            if (existingRelationship.length > 0) {
              console.log(`Website relationship already exists for ${shadowRow.domain}, skipping`);
              
              // Mark as skipped
              await tx.execute(sql`
                UPDATE shadow_publisher_websites 
                SET 
                  migration_status = 'skipped',
                  migrated_at = CURRENT_TIMESTAMP,
                  migration_notes = 'Relationship already exists'
                WHERE id = ${shadowRow.shadow_id}
              `);
              continue;
            }

            // Create publisher-website relationship
            const newRelationshipId = crypto.randomUUID();
            await tx.insert(publisherOfferingRelationships).values({
              id: newRelationshipId,
              publisherId: publisherId,
              websiteId: shadowRow.website_id,
              relationshipType: 'contact', // Default relationship type
              verificationStatus: shadowRow.verified ? 'verified' : 'claimed',
              verificationMethod: shadowRow.confidence > 0.7 ? 'email_domain' : 'claimed',
              isActive: true,
              contactEmail: publisher.email,
              internalNotes: `Migrated from shadow data. Shadow ID: ${shadowRow.shadow_id}`,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            websitesMigrated++;

            // 4. Check for existing offerings and activate them
            const offerings = await tx
              .select()
              .from(publisherOfferings)
              .where(
                and(
                  eq(publisherOfferings.publisherId, publisherId),
                  eq(publisherOfferings.websiteId, shadowRow.website_id)
                )
              );

            if (offerings.length > 0) {
              // Activate existing offerings
              await tx
                .update(publisherOfferings)
                .set({
                  isActive: true,
                  updatedAt: new Date()
                })
                .where(
                  eq(publisherOfferings.publisherId, publisherId)
                );
              
              offeringsActivated += offerings.length;
            } else if (shadowRow.guest_post_cost) {
              // Create new offering from shadow data
              const offeringId = crypto.randomUUID();
              await tx.insert(publisherOfferings).values({
                id: offeringId,
                publisherId: publisherId,
                offeringType: 'guest_post',
                basePrice: parseInt(parseFloat(shadowRow.guest_post_cost) * 100) || 0, // Convert to cents
                currency: 'USD',
                turnaroundDays: parseInt(shadowRow.turnaround_time) || 7,
                isActive: true,
                attributes: {
                  migratedAt: new Date().toISOString(),
                  shadowId: shadowRow.shadow_id,
                  extractedPrice: shadowRow.guest_post_cost,
                  extractedTurnaround: shadowRow.turnaround_time
                },
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              offeringsActivated++;
            }

            // 5. Create publisher-offering relationship if needed
            const relationshipExists = await tx
              .select()
              .from(publisherOfferingRelationships)
              .where(
                and(
                  eq(publisherOfferingRelationships.publisherId, publisherId),
                  eq(publisherOfferingRelationships.websiteId, shadowRow.website_id)
                )
              )
              .limit(1);

            if (relationshipExists.length === 0) {
              await tx.insert(publisherOfferingRelationships).values({
                id: crypto.randomUUID(),
                publisherId: publisherId,
                websiteId: shadowRow.website_id,
                relationshipType: 'owner',
                verificationStatus: shadowRow.verified ? 'verified' : 'pending',
                verificationMethod: 'migration',
                isActive: true,
                contactEmail: publisher.email,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              relationshipsCreated++;
            }

            // 6. Mark shadow record as successfully migrated
            await tx.execute(sql`
              UPDATE shadow_publisher_websites 
              SET 
                migration_status = 'migrated',
                migrated_at = CURRENT_TIMESTAMP,
                migration_notes = 'Successfully migrated to publisher_websites'
              WHERE id = ${shadowRow.shadow_id}
            `);

          } catch (websiteError: any) {
            console.error(`Failed to migrate website ${shadowRow.domain}:`, websiteError);
            errors.push(`Website ${shadowRow.domain}: ${websiteError.message}`);
            
            // Mark as failed
            await tx.execute(sql`
              UPDATE shadow_publisher_websites 
              SET 
                migration_status = 'failed',
                migration_notes = ${websiteError.message}
              WHERE id = ${shadowRow.shadow_id}
            `);
          }
        }

        // 7. Mark publisher as migrated (fields don't exist yet, skip for now)
        await tx
          .update(publishers)
          .set({
            updatedAt: new Date()
          })
          .where(eq(publishers.id, publisherId));

        console.log(`Migration completed: ${websitesMigrated} websites, ${offeringsActivated} offerings, ${relationshipsCreated} relationships`);

        return {
          success: true,
          websitesMigrated,
          offeringsActivated,
          relationshipsCreated,
          errors
        };
      });

      return result;

    } catch (error: any) {
      console.error('Shadow publisher migration failed:', error);
      errors.push(`Migration failed: ${error.message}`);
      
      return {
        success: false,
        websitesMigrated,
        offeringsActivated,
        relationshipsCreated,
        errors
      };
    }
  }

  /**
   * Check migration status for a publisher
   */
  async getMigrationStatus(publisherId: string): Promise<{
    migrated: boolean;
    pendingWebsites: number;
    migratedWebsites: number;
    failedWebsites: number;
  }> {
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher) {
      throw new Error('Publisher not found');
    }

    // Get counts from shadow_publisher_websites
    const statusCounts = await db.execute(sql`
      SELECT 
        migration_status,
        COUNT(*) as count
      FROM shadow_publisher_websites
      WHERE publisher_id = ${publisherId}
      GROUP BY migration_status
    `);

    const counts = {
      pending: 0,
      migrated: 0,
      failed: 0
    };

    for (const row of statusCounts.rows) {
      const status = row.migration_status || 'pending';
      counts[status as keyof typeof counts] = parseInt(row.count as string);
    }

    return {
      migrated: false, // publisher.shadowDataMigrated || false,
      pendingWebsites: counts.pending,
      migratedWebsites: counts.migrated,
      failedWebsites: counts.failed
    };
  }

  /**
   * Retry failed migrations for a publisher
   */
  async retryFailedMigrations(publisherId: string): Promise<MigrationResult> {
    // Reset failed status to pending
    await db.execute(sql`
      UPDATE shadow_publisher_websites
      SET 
        migration_status = 'pending',
        migration_notes = CONCAT(migration_notes, ' | Retry attempted at: ', CURRENT_TIMESTAMP)
      WHERE publisher_id = ${publisherId}
        AND migration_status = 'failed'
    `);

    // Retry migration
    return this.migratePublisherData(publisherId);
  }

  /**
   * Archive old migrated shadow data (for cleanup)
   */
  async archiveMigratedData(daysOld: number = 90): Promise<number> {
    const result = await db.execute(sql`
      WITH archived AS (
        INSERT INTO shadow_publisher_websites_archive
        SELECT 
          id, publisher_id, website_id, confidence, source, 
          extraction_method, verified, migration_status, 
          migrated_at, migration_notes, created_at, updated_at,
          CURRENT_TIMESTAMP as archived_at
        FROM shadow_publisher_websites
        WHERE migration_status = 'migrated'
          AND migrated_at < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        RETURNING id
      )
      DELETE FROM shadow_publisher_websites
      WHERE id IN (SELECT id FROM archived)
      RETURNING id
    `);

    return result.rows.length;
  }
}

// Export singleton instance
export const shadowPublisherMigrationService = new ShadowPublisherMigrationService();