/**
 * Publisher Migration Data Validation Utilities
 * 
 * Provides comprehensive data quality checks and validation
 * for the publisher migration process
 */

import { db } from '@/lib/db/connection';
import { websites, publishers, publisherOfferings } from '@/lib/db/schema';
import { sql, eq, and, isNotNull, isNull, count } from 'drizzle-orm';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  category: string;
  message: string;
  affectedCount?: number;
  data?: any;
  suggestion?: string;
}

export interface ValidationReport {
  timestamp: Date;
  totalIssues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: ValidationIssue[];
  summary: {
    totalWebsites: number;
    websitesWithPublisher: number;
    websitesWithoutPublisher: number;
    uniquePublishers: number;
    duplicateEmails: number;
    invalidPricing: number;
    orphanWebsites: number;
  };
  readyForMigration: boolean;
}

export class PublisherMigrationValidator {
  private issues: ValidationIssue[] = [];
  
  /**
   * Run comprehensive validation
   */
  async validateAll(): Promise<ValidationReport> {
    console.log('🔍 Starting comprehensive validation...');
    
    // Reset issues
    this.issues = [];
    
    // Run all validation checks
    const summary = {
      totalWebsites: await this.countTotalWebsites(),
      websitesWithPublisher: await this.countWebsitesWithPublisher(),
      websitesWithoutPublisher: 0,
      uniquePublishers: await this.countUniquePublishers(),
      duplicateEmails: 0,
      invalidPricing: 0,
      orphanWebsites: 0
    };
    
    summary.websitesWithoutPublisher = summary.totalWebsites - summary.websitesWithPublisher;
    
    // Run validation checks
    await this.checkDuplicateEmails();
    await this.checkOrphanWebsites();
    await this.checkInvalidPricing();
    await this.checkMissingContactInfo();
    await this.checkDuplicatePublisherNames();
    await this.checkExistingPublishers();
    await this.checkDataCompleteness();
    await this.checkPerformanceMetrics();
    
    // Count issues by type
    const errors = this.issues.filter(i => i.type === 'error').length;
    const warnings = this.issues.filter(i => i.type === 'warning').length;
    const info = this.issues.filter(i => i.type === 'info').length;
    
    // Update summary with issue counts
    summary.duplicateEmails = this.issues.find(i => i.category === 'DUPLICATE_EMAILS')?.affectedCount || 0;
    summary.invalidPricing = this.issues.find(i => i.category === 'INVALID_PRICING')?.affectedCount || 0;
    summary.orphanWebsites = this.issues.find(i => i.category === 'ORPHAN_WEBSITES')?.affectedCount || 0;
    
    const report: ValidationReport = {
      timestamp: new Date(),
      totalIssues: this.issues.length,
      errors,
      warnings,
      info,
      issues: this.issues,
      summary,
      readyForMigration: errors === 0
    };
    
    return report;
  }
  
  /**
   * Check for duplicate email addresses in contacts
   */
  async checkDuplicateEmails(): Promise<void> {
    const result = await db.execute(sql`
      SELECT 
        LOWER(TRIM(email)) as email,
        COUNT(*) as count
      FROM website_contacts
      WHERE email IS NOT NULL
      GROUP BY LOWER(TRIM(email))
      HAVING COUNT(*) > 1
    `);
    
    if (result.rows.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'DUPLICATE_EMAILS',
        message: `Found ${result.rows.length} duplicate email addresses in contacts`,
        affectedCount: result.rows.length,
        data: result.rows,
        suggestion: 'Review and merge duplicate accounts before migration'
      });
    }
  }
  
  /**
   * Check for websites without contacts (true orphans)
   */
  async checkOrphanWebsites(): Promise<void> {
    const orphans = await db.execute(sql`
      SELECT w.id, w.domain
      FROM ${websites} w
      LEFT JOIN website_contacts wc ON w.id = wc.website_id
      WHERE wc.website_id IS NULL
    `);
    
    if (orphans.rows.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'ORPHAN_WEBSITES',
        message: `Found ${orphans.rows.length} websites with no contacts`,
        affectedCount: orphans.rows.length,
        data: orphans.rows.slice(0, 10), // Show first 10
        suggestion: 'These websites have no contact data and cannot be migrated'
      });
    }
  }
  
  /**
   * Check for invalid pricing data
   */
  async checkInvalidPricing(): Promise<void> {
    // Check for negative prices
    const negativePrices = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost
      })
      .from(websites)
      .where(sql`${websites.guestPostCost} < 0`);
    
    if (negativePrices.length > 0) {
      this.issues.push({
        type: 'error',
        category: 'INVALID_PRICING',
        message: `Found ${negativePrices.length} websites with negative pricing`,
        affectedCount: negativePrices.length,
        data: negativePrices,
        suggestion: 'Fix negative prices before migration'
      });
    }
    
    // Check for unrealistic prices
    const unrealisticPrices = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        guestPostCost: websites.guestPostCost
      })
      .from(websites)
      .where(sql`${websites.guestPostCost} > 10000`);
    
    if (unrealisticPrices.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'UNREALISTIC_PRICING',
        message: `Found ${unrealisticPrices.length} websites with prices over $10,000`,
        affectedCount: unrealisticPrices.length,
        data: unrealisticPrices,
        suggestion: 'Verify these high prices are correct'
      });
    }
  }
  
  /**
   * Check for missing contact information
   */
  async checkMissingContactInfo(): Promise<void> {
    const result = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT w.publisher_company) as publishers_without_contact
      FROM ${websites} w
      WHERE w.publisher_company IS NOT NULL
      AND w.primary_contact_id IS NULL
    `);
    
    const count = Number(result.rows[0]?.publishers_without_contact || 0);
    
    if (count > 0) {
      this.issues.push({
        type: 'info',
        category: 'MISSING_CONTACTS',
        message: `${count} publishers have no contact information`,
        affectedCount: count,
        suggestion: 'Shadow publishers will be created with placeholder emails'
      });
    }
  }
  
  /**
   * Check for duplicate publisher names (case variations)
   */
  async checkDuplicatePublisherNames(): Promise<void> {
    const result = await db.execute(sql`
      SELECT 
        LOWER(TRIM(publisher_company)) as normalized_name,
        COUNT(DISTINCT publisher_company) as variations,
        STRING_AGG(DISTINCT publisher_company, ', ') as names
      FROM ${websites}
      WHERE publisher_company IS NOT NULL
      GROUP BY LOWER(TRIM(publisher_company))
      HAVING COUNT(DISTINCT publisher_company) > 1
    `);
    
    if (result.rows.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'DUPLICATE_PUBLISHER_NAMES',
        message: `Found ${result.rows.length} publisher names with case/spacing variations`,
        affectedCount: result.rows.length,
        data: result.rows,
        suggestion: 'Names will be normalized during migration'
      });
    }
  }
  
  /**
   * Check for publishers that already exist in the new system
   */
  async checkExistingPublishers(): Promise<void> {
    const result = await db.execute(sql`
      SELECT 
        p.company_name,
        p.account_status,
        p.created_at,
        COUNT(po.id) as offering_count
      FROM ${publishers} p
      LEFT JOIN ${publisherOfferings} po ON po.publisher_id = p.id
      WHERE p.source != 'legacy_migration'
      GROUP BY p.id, p.company_name, p.account_status, p.created_at
    `);
    
    if (result.rows.length > 0) {
      this.issues.push({
        type: 'info',
        category: 'EXISTING_PUBLISHERS',
        message: `${result.rows.length} publishers already exist in the new system`,
        affectedCount: result.rows.length,
        data: result.rows,
        suggestion: 'These will be skipped during migration'
      });
    }
  }
  
  /**
   * Check overall data completeness
   */
  async checkDataCompleteness(): Promise<void> {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN publisher_company IS NOT NULL THEN 1 END) as has_publisher,
        COUNT(CASE WHEN guest_post_cost IS NOT NULL THEN 1 END) as has_pricing,
        COUNT(CASE WHEN primary_contact_id IS NOT NULL THEN 1 END) as has_contact,
        COUNT(CASE WHEN domain_rating IS NOT NULL THEN 1 END) as has_metrics,
        COUNT(CASE WHEN 
          publisher_company IS NOT NULL 
          AND guest_post_cost IS NOT NULL 
        THEN 1 END) as migration_ready
      FROM ${websites}
    `);
    
    const row = stats.rows[0] as any;
    const completeness = (row.migration_ready / row.total) * 100;
    
    this.issues.push({
      type: 'info',
      category: 'DATA_COMPLETENESS',
      message: `${completeness.toFixed(1)}% of websites are migration-ready`,
      data: {
        total: row.total,
        hasPublisher: row.has_publisher,
        hasPricing: row.has_pricing,
        hasContact: row.has_contact,
        hasMetrics: row.has_metrics,
        migrationReady: row.migration_ready
      },
      suggestion: completeness < 50 
        ? 'Consider enriching data before migration' 
        : 'Data completeness is acceptable'
    });
  }
  
  /**
   * Check performance metrics validity
   */
  async checkPerformanceMetrics(): Promise<void> {
    // Check for invalid response times
    const invalidResponseTimes = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        avgResponseTimeHours: websites.avgResponseTimeHours
      })
      .from(websites)
      .where(
        sql`${websites.avgResponseTimeHours} < 0 OR ${websites.avgResponseTimeHours} > 168`
      );
    
    if (invalidResponseTimes.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'INVALID_METRICS',
        message: `${invalidResponseTimes.length} websites have invalid response times`,
        affectedCount: invalidResponseTimes.length,
        data: invalidResponseTimes.slice(0, 5),
        suggestion: 'Response times should be between 0-168 hours (1 week)'
      });
    }
    
    // Check for invalid success rates
    const invalidSuccessRates = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        successRatePercentage: websites.successRatePercentage
      })
      .from(websites)
      .where(
        sql`${websites.successRatePercentage} < 0 OR ${websites.successRatePercentage} > 100`
      );
    
    if (invalidSuccessRates.length > 0) {
      this.issues.push({
        type: 'warning',
        category: 'INVALID_METRICS',
        message: `${invalidSuccessRates.length} websites have invalid success rates`,
        affectedCount: invalidSuccessRates.length,
        data: invalidSuccessRates.slice(0, 5),
        suggestion: 'Success rates should be between 0-100%'
      });
    }
  }
  
  /**
   * Helper: Count total websites
   */
  private async countTotalWebsites(): Promise<number> {
    const result = await db.select({ count: count() }).from(websites);
    return Number(result[0]?.count || 0);
  }
  
  /**
   * Helper: Count websites with contacts (ready for migration)
   */
  private async countWebsitesWithPublisher(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT w.id) as count
      FROM ${websites} w
      INNER JOIN website_contacts wc ON w.id = wc.website_id
    `);
    return Number(result.rows[0]?.count || 0);
  }
  
  /**
   * Helper: Count unique contacts (future publishers)
   */
  private async countUniquePublishers(): Promise<number> {
    const result = await db.execute(sql`
      SELECT COUNT(DISTINCT LOWER(TRIM(email))) as count
      FROM website_contacts
      WHERE email IS NOT NULL
    `);
    return Number(result.rows[0]?.count || 0);
  }
  
  /**
   * Generate HTML report
   */
  generateHTMLReport(report: ValidationReport): string {
    const statusColor = report.readyForMigration ? '#10b981' : '#ef4444';
    const statusText = report.readyForMigration ? 'Ready for Migration' : 'Issues Need Resolution';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <title>Publisher Migration Validation Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 2rem; background: #f9fafb; }
    .container { max-width: 1200px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #111827; border-bottom: 2px solid #e5e7eb; padding-bottom: 1rem; }
    .status { padding: 1rem; border-radius: 6px; margin: 1rem 0; }
    .status.ready { background: #d1fae5; border: 1px solid #34d399; }
    .status.not-ready { background: #fee2e2; border: 1px solid #f87171; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .stat { padding: 1rem; background: #f3f4f6; border-radius: 6px; }
    .stat-label { font-size: 0.875rem; color: #6b7280; }
    .stat-value { font-size: 1.5rem; font-weight: bold; color: #111827; }
    .issues { margin: 2rem 0; }
    .issue { padding: 1rem; margin: 0.5rem 0; border-left: 4px solid; border-radius: 4px; background: #f9fafb; }
    .issue.error { border-color: #ef4444; background: #fef2f2; }
    .issue.warning { border-color: #f59e0b; background: #fffbeb; }
    .issue.info { border-color: #3b82f6; background: #eff6ff; }
    .issue-header { display: flex; justify-content: space-between; align-items: center; }
    .issue-type { padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: bold; text-transform: uppercase; }
    .issue-type.error { background: #ef4444; color: white; }
    .issue-type.warning { background: #f59e0b; color: white; }
    .issue-type.info { background: #3b82f6; color: white; }
    .suggestion { margin-top: 0.5rem; padding: 0.5rem; background: white; border-radius: 4px; font-size: 0.875rem; color: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📋 Publisher Migration Validation Report</h1>
    
    <div class="status ${report.readyForMigration ? 'ready' : 'not-ready'}">
      <strong style="color: ${statusColor}">${statusText}</strong>
      <div>Generated: ${report.timestamp.toLocaleString()}</div>
    </div>
    
    <div class="stats">
      <div class="stat">
        <div class="stat-label">Total Websites</div>
        <div class="stat-value">${report.summary.totalWebsites}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Unique Publishers</div>
        <div class="stat-value">${report.summary.uniquePublishers}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Ready for Migration</div>
        <div class="stat-value">${report.summary.websitesWithPublisher}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Orphan Websites</div>
        <div class="stat-value">${report.summary.orphanWebsites}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Total Issues</div>
        <div class="stat-value">${report.totalIssues}</div>
      </div>
      <div class="stat">
        <div class="stat-label">Errors</div>
        <div class="stat-value" style="color: #ef4444">${report.errors}</div>
      </div>
    </div>
    
    <div class="issues">
      <h2>Issues Found</h2>
      ${report.issues.map(issue => `
        <div class="issue ${issue.type}">
          <div class="issue-header">
            <div>
              <span class="issue-type ${issue.type}">${issue.type}</span>
              <strong style="margin-left: 1rem">${issue.category}</strong>
            </div>
            ${issue.affectedCount ? `<span>Affected: ${issue.affectedCount}</span>` : ''}
          </div>
          <div style="margin-top: 0.5rem">${issue.message}</div>
          ${issue.suggestion ? `<div class="suggestion">💡 ${issue.suggestion}</div>` : ''}
        </div>
      `).join('')}
    </div>
  </div>
</body>
</html>
    `;
  }
}

// Export singleton instance
export const migrationValidator = new PublisherMigrationValidator();