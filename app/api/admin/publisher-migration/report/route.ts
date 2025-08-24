import { NextRequest, NextResponse } from 'next/server';
import { migrationValidator } from '@/lib/utils/publisherMigrationValidation';

/**
 * GET /api/admin/publisher-migration/report
 * 
 * Generates and downloads an HTML migration report
 */
export async function GET(request: NextRequest) {
  try {
    console.log('📄 Generating migration report...');
    
    // Run validation to get current state
    const validationReport = await migrationValidator.validateAll();
    
    // Generate HTML report
    const htmlReport = migrationValidator.generateHTMLReport(validationReport);
    
    console.log('✅ Report generated successfully');
    
    // Return as downloadable HTML file
    return new NextResponse(htmlReport, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename="publisher-migration-report-${new Date().toISOString().slice(0, 10)}.html"`
      }
    });
    
  } catch (error) {
    console.error('❌ Failed to generate report:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate report', 
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}