import { NextRequest, NextResponse } from 'next/server';
import { WebsiteToPublisherMigrator } from '../../../../../scripts/migrate-websites-to-publishers';

/**
 * POST /api/admin/publisher-migration/execute
 * 
 * Executes the publisher migration process
 * 
 * Request body:
 * - dryRun: boolean - Whether to run in dry-run mode
 * - batchSize: number - Optional batch size for processing
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dryRun = true, batchSize = 10 } = body;
    
    console.log(`🚀 Starting publisher migration (${dryRun ? 'DRY RUN' : 'LIVE'})...`);
    
    const migrator = new WebsiteToPublisherMigrator({
      dryRun,
      batchSize
    });
    
    const stats = await migrator.migrate();
    
    console.log('📊 Migration completed with stats:', {
      shadowPublishersCreated: stats.shadowPublishersCreated,
      offeringsCreated: stats.offeringsCreated,
      relationshipsCreated: stats.relationshipsCreated,
      errors: stats.errors.length,
      skipped: stats.skipped.length
    });
    
    return NextResponse.json({
      success: true,
      dryRun,
      stats,
      message: dryRun 
        ? 'Dry run completed successfully' 
        : 'Migration completed successfully'
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Migration failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}