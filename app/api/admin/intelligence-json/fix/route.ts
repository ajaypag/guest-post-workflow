import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { targetPageIntelligence } from '@/lib/db/targetPageIntelligenceSchema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';

interface ResearchOutput {
  analysis: string;
  gaps: any[];
  sources: any[];
  metadata: any;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await AuthServiceServer.getSession();
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { recordId } = await request.json();
    
    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID required' },
        { status: 400 }
      );
    }

    // Get the specific record
    const records = await db
      .select()
      .from(targetPageIntelligence)
      .where(eq(targetPageIntelligence.id, recordId))
      .limit(1);

    if (records.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Record not found',
          recordId 
        },
        { status: 404 }
      );
    }

    const record = records[0];
    const output = record.researchOutput as ResearchOutput | null;

    if (!output) {
      return NextResponse.json({
        success: false,
        message: 'No research output to fix',
        recordId
      });
    }

    // Check if this needs fixing
    if (typeof output.analysis === 'string' && 
        output.analysis.startsWith('{') && 
        output.analysis.includes('"analysis"')) {
      
      let fixedOutput: ResearchOutput | null = null;
      let fixMethod = '';

      // Try Method 1: Direct JSON parse
      try {
        const parsed = JSON.parse(output.analysis);
        if (parsed.analysis) {
          fixedOutput = {
            analysis: parsed.analysis,
            gaps: parsed.gaps || [],
            sources: parsed.sources || [],
            metadata: output.metadata || {}
          };
          fixMethod = 'Direct JSON parse';
        }
      } catch (e1) {
        // Try Method 2: Fix malformed escape sequences
        try {
          const fixed = output.analysis
            .replace(/\\ /g, ' ')  // Replace backslash-space with space
            .replace(/\\([^"nrt\\])/g, '$1'); // Remove invalid escapes
          
          const parsed = JSON.parse(fixed);
          if (parsed.analysis) {
            fixedOutput = {
              analysis: parsed.analysis,
              gaps: parsed.gaps || [],
              sources: parsed.sources || [],
              metadata: output.metadata || {}
            };
            fixMethod = 'Fixed escape sequences';
          }
        } catch (e2) {
          // Try Method 3: More aggressive unescaping
          try {
            const unescaped = output.analysis
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\')
              .replace(/\\n/g, '\n')
              .replace(/\\t/g, '\t');
            
            const parsed = JSON.parse(unescaped);
            if (parsed.analysis) {
              fixedOutput = {
                analysis: parsed.analysis,
                gaps: parsed.gaps || [],
                sources: parsed.sources || [],
                metadata: output.metadata || {}
              };
              fixMethod = 'Aggressive unescape';
            }
          } catch (e3) {
            return NextResponse.json({
              success: false,
              message: `Failed to fix JSON: ${e3}`,
              recordId
            });
          }
        }
      }

      if (fixedOutput) {
        // Update the record
        await db.update(targetPageIntelligence)
          .set({
            researchOutput: fixedOutput
          })
          .where(eq(targetPageIntelligence.id, recordId));
        
        return NextResponse.json({
          success: true,
          message: `Fixed using ${fixMethod}`,
          recordId,
          gapsExtracted: fixedOutput.gaps.length,
          sourcesExtracted: fixedOutput.sources.length
        });
      }
    } else {
      return NextResponse.json({
        success: false,
        message: 'Record does not need fixing',
        recordId,
        currentGaps: output.gaps?.length || 0
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Unable to process record',
      recordId
    });

  } catch (error: any) {
    console.error('Error fixing intelligence record:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Server error: ${error.message}`,
        recordId: request.body
      },
      { status: 500 }
    );
  }
}