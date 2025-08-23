/**
 * Bulk Migration Script: Websites to Publishers
 * 
 * This script migrates existing websites and contacts to the new publisher system
 * creating shadow publishers, draft offerings, and relationships
 */

import { db } from '@/lib/db/connection';
import { 
  websites, 
  publishers, 
  publisherOfferings,
  publisherWebsites,
  publisherPerformance
} from '@/lib/db/schema';
import { eq, sql, and, isNotNull, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

interface MigrationStats {
  totalWebsites: number;
  uniquePublishers: number;
  shadowPublishersCreated: number;
  offeringsCreated: number;
  relationshipsCreated: number;
  errors: Array<{ type: string; message: string; data?: any }>;
  skipped: Array<{ reason: string; data: any }>;
}

interface PublisherMapping {
  publisherCompany: string;
  websites: Array<{
    id: string;
    domain: string;
    guestPostCost: number | null;
    avgResponseTimeHours: number | null;
    successRatePercentage: number | null;
    contactData?: {
      contactId: string;
      isPrimary: boolean;
      linkInsertCost: number | null;
      requirement: string | null;
      status: string | null;
    };
  }>;
  contactEmail?: string;
  contactName?: string;
  lastActivity?: Date;
  publisherId?: string; // Store the created publisher ID
}

class WebsiteToPublisherMigrator {
  private stats: MigrationStats = {
    totalWebsites: 0,
    uniquePublishers: 0,
    shadowPublishersCreated: 0,
    offeringsCreated: 0,
    relationshipsCreated: 0,
    errors: [],
    skipped: []
  };

  private dryRun: boolean;
  private batchSize: number;

  constructor(options: { dryRun?: boolean; batchSize?: number } = {}) {
    this.dryRun = options.dryRun ?? false;
    this.batchSize = options.batchSize ?? 10;
  }

  /**
   * Main migration entry point
   */
  async migrate(): Promise<MigrationStats> {
    console.log('🚀 Starting publisher migration...');
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    
    try {
      // Step 1: Analyze existing data
      const publisherMappings = await this.analyzeWebsiteData();
      
      // Step 2: Validate data quality
      await this.validateData(publisherMappings);
      
      // Step 3: Create shadow publishers
      await this.createShadowPublishers(publisherMappings);
      
      // Step 4: Create draft offerings
      await this.createDraftOfferings(publisherMappings);
      
      // Step 5: Create relationships
      await this.createPublisherRelationships(publisherMappings);
      
      // Step 6: Migrate performance data
      await this.migratePerformanceData(publisherMappings);
      
      // Step 7: Generate report
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      this.stats.errors.push({
        type: 'FATAL',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    return this.stats;
  }

  /**
   * Step 1: Analyze website_contacts and group by contact email (future publishers)
   */
  private async analyzeWebsiteData(): Promise<PublisherMapping[]> {
    console.log('📊 Analyzing website data...');
    
    // Get all websites with their contacts
    const websiteContacts = await db.execute(sql`
      SELECT 
        w.id as website_id,
        w.domain,
        w.guest_post_cost,
        w.avg_response_time_hours,
        w.success_rate_percentage,
        w.updated_at,
        wc.id as contact_id,
        wc.email,
        wc.is_primary,
        wc.guest_post_cost as contact_guest_post_cost,
        wc.link_insert_cost,
        wc.requirement,
        wc.status,
        wc.response_rate,
        wc.average_response_time
      FROM ${websites} w
      INNER JOIN website_contacts wc ON w.id = wc.website_id
      WHERE wc.email IS NOT NULL
      ORDER BY wc.email, w.domain
    `);
    
    this.stats.totalWebsites = websiteContacts.rows.length;
    console.log(`Found ${websiteContacts.rows.length} websites with contact information`);
    
    // Group by contact email (each unique email becomes a publisher)
    const publisherMap = new Map<string, PublisherMapping>();
    
    for (const row of websiteContacts.rows as any[]) {
      const publisherKey = (row.email as string).toLowerCase().trim();
      
      if (!publisherMap.has(publisherKey)) {
        publisherMap.set(publisherKey, {
          publisherCompany: row.email, // Use email as company name initially
          websites: [],
          lastActivity: row.updated_at,
          contactEmail: row.email
        });
      }
      
      const mapping = publisherMap.get(publisherKey)!;
      mapping.websites.push({
        id: row.website_id,
        domain: row.domain,
        guestPostCost: row.contact_guest_post_cost || row.guest_post_cost,
        avgResponseTimeHours: row.average_response_time || row.avg_response_time_hours,
        successRatePercentage: row.response_rate || row.success_rate_percentage,
        contactData: {
          contactId: row.contact_id,
          isPrimary: row.is_primary,
          linkInsertCost: row.link_insert_cost,
          requirement: row.requirement,
          status: row.status
        }
      });
      
      // Update last activity
      if (row.updated_at && (!mapping.lastActivity || row.updated_at > mapping.lastActivity)) {
        mapping.lastActivity = row.updated_at;
      }
    }
    
    this.stats.uniquePublishers = publisherMap.size;
    console.log(`Identified ${publisherMap.size} unique publishers`);
    
    return Array.from(publisherMap.values());
  }

  /**
   * Step 2: Validate data quality
   */
  private async validateData(mappings: PublisherMapping[]): Promise<void> {
    console.log('✅ Validating data quality...');
    
    for (const mapping of mappings) {
      // Check for missing critical data
      if (!mapping.publisherCompany) {
        this.stats.skipped.push({
          reason: 'Missing publisher company name',
          data: mapping
        });
        continue;
      }
      
      // Check for suspicious data
      const suspiciousPrices = mapping.websites.filter(
        w => w.guestPostCost && (w.guestPostCost < 10 || w.guestPostCost > 10000)
      );
      
      if (suspiciousPrices.length > 0) {
        this.stats.errors.push({
          type: 'SUSPICIOUS_PRICING',
          message: `Publisher ${mapping.publisherCompany} has suspicious pricing`,
          data: suspiciousPrices
        });
      }
      
      // Validate email if available
      if (mapping.contactEmail && !this.isValidEmail(mapping.contactEmail)) {
        this.stats.errors.push({
          type: 'INVALID_EMAIL',
          message: `Invalid email for ${mapping.publisherCompany}`,
          data: mapping.contactEmail
        });
      }
    }
    
    console.log(`Validation complete. ${this.stats.errors.length} issues found.`);
  }

  /**
   * Step 3: Create shadow publishers
   */
  private async createShadowPublishers(mappings: PublisherMapping[]): Promise<void> {
    console.log('👤 Creating shadow publishers...');
    
    for (let i = 0; i < mappings.length; i += this.batchSize) {
      const batch = mappings.slice(i, i + this.batchSize);
      
      for (const mapping of batch) {
        try {
          // Check if publisher already exists
          const existingPublisher = await db
            .select()
            .from(publishers)
            .where(eq(publishers.companyName, mapping.publisherCompany))
            .limit(1);
          
          if (existingPublisher.length > 0) {
            console.log(`Publisher already exists: ${mapping.publisherCompany}`);
            mapping.publisherId = existingPublisher[0].id; // Store existing ID
            continue;
          }
          
          // Calculate confidence score
          const confidenceScore = this.calculateConfidenceScore(mapping);
          
          // Create shadow publisher
          const publisherId = uuidv4();
          const publisherData = {
            id: publisherId,
            companyName: mapping.publisherCompany,
            email: mapping.contactEmail || `noreply+${mapping.publisherCompany.replace(/\s+/g, '_').toLowerCase()}@shadow.linkio.com`,
            contactName: mapping.contactName || mapping.publisherCompany,
            accountStatus: 'shadow' as const,
            source: 'legacy_migration',
            emailVerified: false,
            confidenceScore,
            invitationToken: uuidv4(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          if (!this.dryRun) {
            await db.insert(publishers).values({
              ...publisherData,
              confidenceScore: publisherData.confidenceScore.toString()
            } as any);
            this.stats.shadowPublishersCreated++;
          } else {
            console.log(`[DRY RUN] Would create publisher:`, publisherData.companyName);
            this.stats.shadowPublishersCreated++;
          }
          
          // Store the publisher ID for later use
          mapping.publisherId = publisherId;
          
        } catch (error) {
          this.stats.errors.push({
            type: 'PUBLISHER_CREATION_ERROR',
            message: `Failed to create publisher: ${mapping.publisherCompany}`,
            data: error
          });
        }
      }
      
      // Progress update
      console.log(`Progress: ${Math.min(i + this.batchSize, mappings.length)}/${mappings.length} publishers processed`);
    }
  }

  /**
   * Step 4: Create draft offerings
   */
  private async createDraftOfferings(mappings: PublisherMapping[]): Promise<void> {
    console.log('💰 Creating draft offerings...');
    
    for (const mapping of mappings) {
      // Use the stored publisher ID
      if (!mapping.publisherId) {
        console.log(`No publisher ID stored for: ${mapping.publisherCompany}`);
        continue;
      }
      
      const publisherId = mapping.publisherId;
      
      // Create offerings for each website
      for (const website of mapping.websites) {
        if (!website.guestPostCost) continue;
        
        const offeringData = {
          id: uuidv4(),
          publisherId,
          offeringType: 'guest_post',
          basePrice: Math.round(website.guestPostCost * 100), // Convert dollars to cents
          currency: 'USD',
          turnaroundDays: null, // Unknown - let publishers set this
          currentAvailability: 'available',
          expressAvailable: false,
          expressPrice: null,
          expressDays: null,
          offeringName: `Guest Post - ${website.domain}`,
          minWordCount: null, // Unknown - let publishers set this
          maxWordCount: null, // Unknown - let publishers set this
          niches: [],
          languages: ['en'],
          attributes: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          if (!this.dryRun) {
            await db.insert(publisherOfferings).values(offeringData);
            this.stats.offeringsCreated++;
          } else {
            console.log(`[DRY RUN] Would create offering for:`, website.domain);
            this.stats.offeringsCreated++;
          }
        } catch (error) {
          console.error(`❌ Error creating offering for ${website.domain}:`, error);
          this.stats.errors.push({
            type: 'OFFERING_CREATION_ERROR',
            message: `Failed to create offering for ${website.domain}: ${error instanceof Error ? error.message : String(error)}`,
            data: error
          });
        }
      }
    }
  }

  /**
   * Step 5: Create publisher-website relationships
   */
  private async createPublisherRelationships(mappings: PublisherMapping[]): Promise<void> {
    console.log('🔗 Creating publisher-website relationships...');
    
    for (const mapping of mappings) {
      // Get the publisher ID
      const publisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.companyName, mapping.publisherCompany))
        .limit(1);
      
      if (publisher.length === 0) continue;
      
      const publisherId = publisher[0].id;
      
      // Create relationships for each website
      for (const website of mapping.websites) {
        const relationshipData = {
          id: uuidv4(),
          publisherId,
          websiteId: website.id,
          confidenceScore: this.calculateConfidenceScore(mapping),
          source: 'legacy_migration',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        try {
          if (!this.dryRun) {
            await db.insert(publisherWebsites).values(relationshipData);
            this.stats.relationshipsCreated++;
          } else {
            console.log(`[DRY RUN] Would create relationship:`, website.domain);
            this.stats.relationshipsCreated++;
          }
        } catch (error) {
          this.stats.errors.push({
            type: 'RELATIONSHIP_CREATION_ERROR',
            message: `Failed to create relationship for ${website.domain}`,
            data: error
          });
        }
      }
    }
  }

  /**
   * Step 6: Migrate performance data
   */
  private async migratePerformanceData(mappings: PublisherMapping[]): Promise<void> {
    console.log('📈 Migrating performance data...');
    
    for (const mapping of mappings) {
      // Get the publisher ID
      const publisher = await db
        .select()
        .from(publishers)
        .where(eq(publishers.companyName, mapping.publisherCompany))
        .limit(1);
      
      if (publisher.length === 0) continue;
      
      const publisherId = publisher[0].id;
      
      // Aggregate performance metrics
      const avgResponseTime = this.calculateAverage(
        mapping.websites.map(w => w.avgResponseTimeHours).filter(Boolean) as number[]
      );
      
      const avgSuccessRate = this.calculateAverage(
        mapping.websites.map(w => w.successRatePercentage).filter(Boolean) as number[]
      );
      
      if (avgResponseTime || avgSuccessRate) {
        const performanceData = {
          id: uuidv4(),
          publisherId,
          websiteId: mapping.websites[0].id, // Use first website as reference
          metricType: 'aggregate',
          metricName: 'response_time_hours',
          metricValue: avgResponseTime || 0,
          successRate: avgSuccessRate || 0,
          periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Last 30 days
          periodEnd: new Date().toISOString().split('T')[0],
          source: 'legacy_migration',
          createdAt: new Date()
        };
        
        try {
          if (!this.dryRun) {
            await db.insert(publisherPerformance).values(performanceData);
          } else {
            console.log(`[DRY RUN] Would migrate performance for:`, mapping.publisherCompany);
          }
        } catch (error) {
          this.stats.errors.push({
            type: 'PERFORMANCE_MIGRATION_ERROR',
            message: `Failed to migrate performance for ${mapping.publisherCompany}`,
            data: error
          });
        }
      }
    }
  }

  /**
   * Helper: Calculate confidence score based on data quality
   */
  private calculateConfidenceScore(mapping: PublisherMapping): number {
    let score = 0.5; // Base score
    
    // Has pricing data
    if (mapping.websites.some(w => w.guestPostCost)) score += 0.2;
    
    // Has performance data
    if (mapping.websites.some(w => w.successRatePercentage && w.successRatePercentage > 80)) score += 0.2;
    
    // Recent activity (within 6 months)
    if (mapping.lastActivity && 
        mapping.lastActivity > new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Helper: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Helper: Calculate average
   */
  private calculateAverage(numbers: number[]): number | null {
    if (numbers.length === 0) return null;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Generate migration report
   */
  private generateReport(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📋 MIGRATION REPORT');
    console.log('='.repeat(60));
    console.log(`Mode: ${this.dryRun ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Total Websites: ${this.stats.totalWebsites}`);
    console.log(`Unique Publishers: ${this.stats.uniquePublishers}`);
    console.log(`Shadow Publishers Created: ${this.stats.shadowPublishersCreated}`);
    console.log(`Offerings Created: ${this.stats.offeringsCreated}`);
    console.log(`Relationships Created: ${this.stats.relationshipsCreated}`);
    console.log(`Errors: ${this.stats.errors.length}`);
    console.log(`Skipped: ${this.stats.skipped.length}`);
    
    if (this.stats.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      this.stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. [${error.type}] ${error.message}`);
      });
    }
    
    console.log('='.repeat(60));
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSize = parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '10');
  
  console.log('Publisher Migration Tool');
  console.log('========================');
  
  const migrator = new WebsiteToPublisherMigrator({
    dryRun,
    batchSize
  });
  
  const stats = await migrator.migrate();
  
  // Save stats to file
  const fs = await import('fs');
  const reportPath = `./migration-report-${new Date().toISOString().slice(0, 10)}.json`;
  fs.writeFileSync(reportPath, JSON.stringify(stats, null, 2));
  console.log(`\n📄 Report saved to: ${reportPath}`);
  
  process.exit(stats.errors.length > 0 ? 1 : 0);
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { WebsiteToPublisherMigrator, type MigrationStats };