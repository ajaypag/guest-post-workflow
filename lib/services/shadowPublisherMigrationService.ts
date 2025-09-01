// @ts-nocheck
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { 
  publisherOfferings,
  publisherOfferingRelationships
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and, isNull, sql, or } from 'drizzle-orm';
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
        
        // 1.5 Clean up any unnamed test offerings before migration
        const unnamedOfferings = await tx
          .select()
          .from(publisherOfferings)
          .where(
            and(
              eq(publisherOfferings.publisherId, publisherId),
              or(
                isNull(publisherOfferings.offeringName),
                eq(publisherOfferings.offeringName, ''),
                eq(publisherOfferings.offeringName, 'null')
              )
            )
          );
        
        if (unnamedOfferings.length > 0) {
          console.log(`Cleaning up ${unnamedOfferings.length} unnamed test offerings before migration`);
          
          // Delete relationships first
          for (const offering of unnamedOfferings) {
            await tx
              .delete(publisherOfferingRelationships)
              .where(eq(publisherOfferingRelationships.offeringId, offering.id));
          }
          
          // Then delete the offerings
          await tx
            .delete(publisherOfferings)
            .where(
              and(
                eq(publisherOfferings.publisherId, publisherId),
                or(
                  isNull(publisherOfferings.offeringName),
                  eq(publisherOfferings.offeringName, ''),
                  eq(publisherOfferings.offeringName, 'null')
                )
              )
            );
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
            w.typical_turnaround_days,
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
              console.log(`Website relationship already exists for ${shadowRow.domain}, updating`);
              
              // Update existing relationship to ensure it's active
              await tx
                .update(publisherOfferingRelationships)
                .set({
                  isActive: true,
                  verificationStatus: 'verified',
                  updatedAt: new Date()
                })
                .where(
                  and(
                    eq(publisherOfferingRelationships.publisherId, publisherId),
                    eq(publisherOfferingRelationships.websiteId, shadowRow.website_id)
                  )
                );
              
              relationshipsCreated++;
            } else {
              // Skip creating relationship here - we'll create it with the offering below
              websitesMigrated++;
            }

            // 4. Check for existing offerings for this publisher
            const offerings = await tx
              .select()
              .from(publisherOfferings)
              .where(
                eq(publisherOfferings.publisherId, publisherId)
              );

            // Check if we already have an offering for this specific website
            // Each website should have its own offering, regardless of price
            const matchingOffering = offerings.find(o => 
              (o.attributes as any)?.websiteId === shadowRow.website_id
            );

            if (!matchingOffering && shadowRow.guest_post_cost) {
              // Create new offering from shadow data
              const offeringId = crypto.randomUUID();
              await tx.insert(publisherOfferings).values({
                id: offeringId,
                publisherId: publisherId,
                offeringType: 'guest_post',
                offeringName: `Guest Post - ${shadowRow.domain}`,
                basePrice: parseInt(shadowRow.guest_post_cost) || 0, // Convert to cents
                currency: 'USD',
                turnaroundDays: parseInt(shadowRow.typical_turnaround_days) || 7,
                currentAvailability: 'available',
                isActive: true,
                attributes: {
                  migratedAt: new Date().toISOString(),
                  shadowId: shadowRow.shadow_id,
                  websiteId: shadowRow.website_id, // Store website association
                  extractedPrice: shadowRow.guest_post_cost,
                  extractedTurnaround: shadowRow.typical_turnaround_days
                },
                createdAt: new Date(),
                updatedAt: new Date()
              });

              // CRITICAL: Create proper offering-website relationship
              const relationshipId = crypto.randomUUID();
              await tx.insert(publisherOfferingRelationships).values({
                id: relationshipId,
                publisherId: publisherId,
                offeringId: offeringId,
                websiteId: shadowRow.website_id,
                isPrimary: true,
                isActive: true,
                relationshipType: 'owner',
                verificationStatus: 'verified',
                verificationMethod: 'migration',
                contactEmail: publisher.email,
                internalNotes: `Created during shadow data migration. Shadow ID: ${shadowRow.shadow_id}`,
                createdAt: new Date(),
                updatedAt: new Date()
              });
              
              offeringsActivated++;
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