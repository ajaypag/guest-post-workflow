import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { AuthServiceServer } from '@/lib/auth-server';

interface ResearchOutput {
  analysis: string;
  gaps: any[];
  sources: any[];
  metadata: any;
}

export async function GET(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all target page intelligence records
    const records = await db
      .select()
      .from(targetPageIntelligence);

    const problemRecords = [];
    const processedRecords = [];

    for (const record of records) {
      const output = record.researchOutput as ResearchOutput | null;
      
      let needsFixing = false;
      let gapCount = 0;
      let sourceCount = 0;

      if (output) {
        // Check if this needs fixing (double-encoded JSON)
        if (typeof output.analysis === 'string' && 
            output.analysis.startsWith('{') && 
            output.analysis.includes('"analysis"')) {
          needsFixing = true;
          
          // Try to see what we would extract
          try {
            const parsed = JSON.parse(output.analysis);
            gapCount = parsed.gaps?.length || 0;
            sourceCount = parsed.sources?.length || 0;
          } catch (e) {
            // Try with escape fixes
            try {
              const fixed = output.analysis
                .replace(/\\ /g, ' ')
                .replace(/\\([^"nrt\\])/g, '$1');
              const parsed = JSON.parse(fixed);
              gapCount = parsed.gaps?.length || 0;
              sourceCount = parsed.sources?.length || 0;
            } catch (e2) {
              // Can't parse, will need manual inspection
            }
          }
        } else {
          gapCount = output.gaps?.length || 0;
          sourceCount = output.sources?.length || 0;
        }
      }

      const processedRecord = {
        id: record.id,
        targetPageId: record.targetPageId,
        briefStatus: record.briefStatus,
        researchStatus: record.researchStatus,
        researchOutput: output,
        needsFixing,
        gapCount,
        sourceCount
      };

      processedRecords.push(processedRecord);
      
      if (needsFixing) {
        problemRecords.push(processedRecord);
      }
    }

    return NextResponse.json({
      success: true,
      records: processedRecords,
      problemRecords,
      stats: {
        total: records.length,
        needsFixing: problemRecords.length,
        healthy: records.length - problemRecords.length
      }
    });

  } catch (error: any) {
    console.error('Error scanning intelligence records:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to scan records',
        details: error.message 
      },
      { status: 500 }
    );
  }
}