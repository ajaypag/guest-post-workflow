import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { sql } from 'drizzle-orm';

export async function POST() {
  try {
    console.log('Starting polish tables migration...');
    
    // Start a transaction
    await db.execute(sql`BEGIN`);
    
    try {
      // Check if tables already exist first
      const checkSessionsResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sessions'
      `);
      
      const checkSectionsResult = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sections'
      `);

      const sessionsExists = (checkSessionsResult as any).rows?.length > 0 || (checkSessionsResult as any).length > 0;
      const sectionsExists = (checkSectionsResult as any).rows?.length > 0 || (checkSectionsResult as any).length > 0;
      
      console.log('Pre-migration check:', { 
        sessionsExists, 
        sectionsExists,
        sessionsResult: checkSessionsResult,
        sectionsResult: checkSectionsResult
      });

      if (sessionsExists && sectionsExists) {
        await db.execute(sql`ROLLBACK`);
        return NextResponse.json({
          success: true,
          message: 'Polish tables already exist',
          details: {
            sessionsExists: true,
            sectionsExists: true
          }
        });
      }

      // Drop tables if they partially exist
      if (sectionsExists && !sessionsExists) {
        console.log('Dropping orphaned polish_sections table...');
        await db.execute(sql`DROP TABLE IF EXISTS polish_sections CASCADE`);
      }

      // Create polish_sessions table first
      if (!sessionsExists) {
        console.log('Creating polish_sessions table...');
        await db.execute(sql`
          CREATE TABLE polish_sessions (
            id UUID PRIMARY KEY,
            workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            version INTEGER NOT NULL DEFAULT 1,
            step_id VARCHAR(100) NOT NULL DEFAULT 'final-polish',
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            total_sections INTEGER DEFAULT 0,
            completed_sections INTEGER DEFAULT 0,
            original_article TEXT,
            research_context TEXT,
            brand_conflicts_found INTEGER DEFAULT 0,
            polish_metadata JSONB,
            error_message TEXT,
            started_at TIMESTAMP,
            completed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
          )
        `);
        console.log('polish_sessions table created');
      }

      // Create polish_sections table
      if (!sectionsExists) {
        console.log('Creating polish_sections table...');
        await db.execute(sql`
          CREATE TABLE polish_sections (
            id UUID PRIMARY KEY,
            polish_session_id UUID NOT NULL REFERENCES polish_sessions(id) ON DELETE CASCADE,
            workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
            version INTEGER NOT NULL DEFAULT 1,
            section_number INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            original_content TEXT,
            polished_content TEXT,
            strengths TEXT,
            weaknesses TEXT,
            brand_conflicts TEXT,
            polish_approach VARCHAR(100),
            engagement_score INTEGER,
            clarity_score INTEGER,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            polish_metadata JSONB,
            error_message TEXT,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL
          )
        `);
        console.log('polish_sections table created');
      }

      // Commit the transaction
      await db.execute(sql`COMMIT`);
      console.log('Transaction committed');

      // Verify tables were created
      const finalCheckSessions = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sessions'
      `);
      
      const finalCheckSections = await db.execute(sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'polish_sections'
      `);

      const finalSessionsExists = (finalCheckSessions as any).rows?.length > 0 || (finalCheckSessions as any).length > 0;
      const finalSectionsExists = (finalCheckSections as any).rows?.length > 0 || (finalCheckSections as any).length > 0;
      
      console.log('Post-migration verification:', { 
        finalSessionsExists, 
        finalSectionsExists,
        finalSessionsResult: finalCheckSessions,
        finalSectionsResult: finalCheckSections
      });

      if (!finalSessionsExists || !finalSectionsExists) {
        throw new Error(`Table creation verification failed. Sessions exists: ${finalSessionsExists}, Sections exists: ${finalSectionsExists}`);
      }

      console.log('Polish tables created successfully');

      return NextResponse.json({
        success: true,
        message: 'Polish tables created successfully',
        details: {
          sessionsExists: finalSessionsExists,
          sectionsExists: finalSectionsExists
        }
      });

    } catch (error) {
      // Rollback on any error
      await db.execute(sql`ROLLBACK`);
      throw error;
    }

  } catch (error) {
    console.error('Error creating polish tables:', error);
    console.error('Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create polish tables',
        details: error instanceof Error ? error.message : 'Unknown error',
        fullError: error instanceof Error ? error.stack : error
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Drop polish_sections first (has foreign key to polish_sessions)
    await db.execute(sql`DROP TABLE IF EXISTS polish_sections CASCADE`);
    
    // Drop polish_sessions
    await db.execute(sql`DROP TABLE IF EXISTS polish_sessions CASCADE`);

    console.log('Polish tables removed successfully');

    return NextResponse.json({
      success: true,
      message: 'Polish tables removed successfully'
    });

  } catch (error) {
    console.error('Error removing polish tables:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to remove polish tables',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}