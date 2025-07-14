import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function POST() {
  try {
    console.log('🟡 Starting agentic versioning migration...');

    // Check if version columns already exist
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

    if ((checkArticleSectionsVersion.rows && checkArticleSectionsVersion.rows.length > 0) ||
        (checkAgentSessionsVersion.rows && checkAgentSessionsVersion.rows.length > 0)) {
      return NextResponse.json({
        success: false,
        error: 'Version columns already exist'
      });
    }

    // Add version column to article_sections
    await db.execute(`
      ALTER TABLE "article_sections" 
      ADD COLUMN "version" integer NOT NULL DEFAULT 1;
    `);

    // Add version column to agent_sessions
    await db.execute(`
      ALTER TABLE "agent_sessions" 
      ADD COLUMN "version" integer NOT NULL DEFAULT 1;
    `);

    console.log('✅ Agentic versioning migration completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Version columns added to agentic workflow tables successfully'
    });

  } catch (error: any) {
    console.error('🔴 Error during agentic versioning migration:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to add version columns', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    console.log('🟡 Starting agentic versioning rollback...');

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

    if ((!checkArticleSectionsVersion.rows || checkArticleSectionsVersion.rows.length === 0) &&
        (!checkAgentSessionsVersion.rows || checkAgentSessionsVersion.rows.length === 0)) {
      return NextResponse.json({
        success: false,
        error: 'Version columns do not exist'
      });
    }

    // Remove version columns
    await db.execute(`ALTER TABLE "article_sections" DROP COLUMN IF EXISTS "version";`);
    await db.execute(`ALTER TABLE "agent_sessions" DROP COLUMN IF EXISTS "version";`);

    console.log('✅ Agentic versioning rollback completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Version columns removed successfully'
    });

  } catch (error: any) {
    console.error('🔴 Error during agentic versioning rollback:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to remove version columns', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}