import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    console.log('🟡 Checking agentic versioning status...');

    // Check if version columns exist
    const checkArticleSectionsVersion = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'article_sections' AND column_name = 'version';
    `);

    const checkAgentSessionsVersion = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'agent_sessions' AND column_name = 'version';
    `);

    const articleSectionsHasVersion = checkArticleSectionsVersion.rows && checkArticleSectionsVersion.rows.length > 0;
    const agentSessionsHasVersion = checkAgentSessionsVersion.rows && checkAgentSessionsVersion.rows.length > 0;

    if (articleSectionsHasVersion && agentSessionsHasVersion) {
      console.log('✅ Both version columns exist');
      return NextResponse.json({
        exists: true,
        message: 'Version columns exist in both article_sections and agent_sessions tables'
      });
    } else if (!articleSectionsHasVersion && !agentSessionsHasVersion) {
      console.log('ℹ️ No version columns exist');
      return NextResponse.json({
        exists: false,
        message: 'Version columns do not exist in either table'
      });
    } else {
      console.log('⚠️ Partial version columns exist');
      return NextResponse.json({
        exists: false,
        message: `Partial state: article_sections has version: ${articleSectionsHasVersion}, agent_sessions has version: ${agentSessionsHasVersion}`
      });
    }

  } catch (error: any) {
    console.error('🔴 Error checking agentic versioning status:', error);
    
    return NextResponse.json(
      { 
        exists: false,
        error: 'Failed to check version columns status', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}