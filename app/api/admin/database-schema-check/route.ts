import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

interface TableCheck {
  name: string;
  exists: boolean;
  description: string;
}

interface ColumnCheck {
  table: string;
  column: string;
  exists: boolean;
  description: string;
}

const REQUIRED_TABLES = [
  {
    name: 'shadow_publisher_websites',
    description: 'Links shadow publishers to extracted websites with confidence scores'
  },
  {
    name: 'publishers',
    description: 'Shadow publisher records (should exist)'
  },
  {
    name: 'websites',
    description: 'Website records (should exist)'
  },
  {
    name: 'publisher_websites',
    description: 'Regular publisher-website relationships (should exist)'
  },
  {
    name: 'publisher_offerings',
    description: 'Publisher service offerings and pricing (should exist)'
  },
  {
    name: 'email_processing_logs',
    description: 'ManyReach email processing logs (should exist)'
  }
];

const REQUIRED_COLUMNS = [
  {
    table: 'publisher_websites',
    column: 'can_edit_pricing',
    description: 'Permission for publishers to edit their own pricing'
  },
  {
    table: 'publisher_websites', 
    column: 'can_edit_availability',
    description: 'Permission for publishers to edit availability'
  },
  {
    table: 'publisher_websites',
    column: 'can_view_analytics', 
    description: 'Permission for publishers to view analytics'
  },
  {
    table: 'publisher_offerings',
    column: 'express_available',
    description: 'Whether express/rush delivery is available'
  },
  {
    table: 'publisher_offerings',
    column: 'express_price', 
    description: 'Additional cost for express delivery'
  },
  {
    table: 'publisher_offerings',
    column: 'express_days',
    description: 'Turnaround days for express delivery'
  },
  {
    table: 'email_processing_logs',
    column: 'sender_email',
    description: 'Email address of the sender for tracking'
  }
];

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Starting database schema check...');
    
    // Check tables
    const tableChecks: TableCheck[] = [];
    for (const requiredTable of REQUIRED_TABLES) {
      try {
        const result = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = '${requiredTable.name}'
          ) as exists;
        `);
        
        const exists = Boolean(result.rows[0]?.exists) || false;
        tableChecks.push({
          ...requiredTable,
          exists
        });
        
        console.log(`Table ${requiredTable.name}: ${exists ? '✅' : '❌'}`);
      } catch (error) {
        console.error(`Error checking table ${requiredTable.name}:`, error);
        tableChecks.push({
          ...requiredTable,
          exists: false
        });
      }
    }

    // Check columns (only for tables that exist)
    const columnChecks: ColumnCheck[] = [];
    for (const requiredColumn of REQUIRED_COLUMNS) {
      const tableExists = tableChecks.find(t => t.name === requiredColumn.table)?.exists;
      
      if (!tableExists) {
        columnChecks.push({
          ...requiredColumn,
          exists: false
        });
        continue;
      }

      try {
        const result = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = '${requiredColumn.table}'
            AND column_name = '${requiredColumn.column}'
          ) as exists;
        `);
        
        const exists = Boolean(result.rows[0]?.exists) || false;
        columnChecks.push({
          ...requiredColumn,
          exists
        });
        
        console.log(`Column ${requiredColumn.table}.${requiredColumn.column}: ${exists ? '✅' : '❌'}`);
      } catch (error) {
        console.error(`Error checking column ${requiredColumn.table}.${requiredColumn.column}:`, error);
        columnChecks.push({
          ...requiredColumn,
          exists: false
        });
      }
    }

    // Calculate summary
    const missingTables = tableChecks.filter(t => !t.exists).length;
    const missingColumns = columnChecks.filter(c => !c.exists).length;
    const isHealthy = missingTables === 0 && missingColumns === 0;

    const summary = {
      tables: tableChecks,
      columns: columnChecks,
      totalTables: tableChecks.length,
      missingTables,
      totalColumns: columnChecks.length, 
      missingColumns,
      isHealthy
    };

    console.log('📊 Schema check summary:', {
      totalTables: summary.totalTables,
      missingTables: summary.missingTables,
      totalColumns: summary.totalColumns,
      missingColumns: summary.missingColumns,
      isHealthy: summary.isHealthy
    });

    return NextResponse.json({
      success: true,
      result: summary
    });

  } catch (error) {
    console.error('❌ Schema check failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Schema check failed'
    }, { status: 500 });
  }
}