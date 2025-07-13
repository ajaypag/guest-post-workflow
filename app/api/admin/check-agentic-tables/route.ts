import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

export async function GET() {
  try {
    // Check if article_sections table exists
    const checkArticleSections = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'article_sections';
    `);

    // Check if agent_sessions table exists
    const checkAgentSessions = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'agent_sessions';
    `);

    const articleSectionsExists = checkArticleSections.rows && checkArticleSections.rows.length > 0;
    const agentSessionsExists = checkAgentSessions.rows && checkAgentSessions.rows.length > 0;
    const bothExist = articleSectionsExists && agentSessionsExists;

    return NextResponse.json({
      exists: bothExist,
      details: {
        article_sections: articleSectionsExists,
        agent_sessions: agentSessionsExists
      },
      message: bothExist 
        ? 'Both agentic workflow tables exist' 
        : `Missing tables: ${!articleSectionsExists ? 'article_sections ' : ''}${!agentSessionsExists ? 'agent_sessions' : ''}`.trim()
    });

  } catch (error: any) {
    console.error('Error checking agentic tables:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to check agentic tables', 
        details: error.message,
        exists: false
      },
      { status: 500 }
    );
  }
}