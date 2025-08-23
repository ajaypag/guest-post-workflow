import { NextRequest, NextResponse } from 'next/server';
import { migrationValidator } from '@/lib/utils/publisherMigrationValidation';

/**
 * POST /api/admin/publisher-migration/validate
 * 
 * Runs comprehensive data validation for publisher migration
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting publisher migration validation...');
    
    const report = await migrationValidator.validateAll();
    
    console.log(`✅ Validation complete: ${report.totalIssues} issues found`);
    console.log(`   - Errors: ${report.errors}`);
    console.log(`   - Warnings: ${report.warnings}`);
    console.log(`   - Info: ${report.info}`);
    console.log(`   - Ready for migration: ${report.readyForMigration}`);
    
    return NextResponse.json(report);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return NextResponse.json(
      { 
        error: 'Validation failed', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}