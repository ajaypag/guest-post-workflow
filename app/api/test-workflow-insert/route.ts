import { NextResponse } from 'next/server';
import { Pool } from 'pg';

export async function POST() {
  try {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const pool = new Pool({
      connectionString,
      ssl: false,
    });

    // Test the exact same insert that's failing
    const testData = {
      id: '9a417b71-b35e-4971-9b94-f72988b0a363',
      client_name: 'Vanta',
      client_url: 'https://vanta.com',
      target_domain: '',
      current_step: 0,
      user_id: '97aca16f-8b81-44ad-a532-a6e3fa96cbfc',
      created_by_name: 'Ajay Paghdal',
      created_by_email: 'ajay@outreachlabs.com',
      client_id: '156d153f-59d0-49e6-8b41-884445511c8d',
      created_at: '2025-07-02T18:39:42.315Z',
      updated_at: '2025-07-02T18:39:42.315Z'
    };

    console.log('Testing workflow insert with data:', testData);

    // First, check if the workflows table exists and its structure
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'workflows'
      ORDER BY ordinal_position;
    `);

    console.log('Workflows table structure:', tableInfo.rows);

    // Check if the client_id exists in clients table (might be the issue)
    const clientCheck = await pool.query('SELECT id FROM clients WHERE id = $1', [testData.client_id]);
    console.log('Client exists:', clientCheck.rows.length > 0);

    // Try the actual insert
    const insertQuery = `
      INSERT INTO workflows (
        id, client_name, client_url, target_domain, current_step, 
        user_id, created_by_name, created_by_email, client_id, 
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `;

    const result = await pool.query(insertQuery, [
      testData.id,
      testData.client_name,
      testData.client_url,
      testData.target_domain,
      testData.current_step,
      testData.user_id,
      testData.created_by_name,
      testData.created_by_email,
      testData.client_id,
      testData.created_at,
      testData.updated_at
    ]);

    await pool.end();

    return NextResponse.json({
      success: true,
      message: 'Workflow inserted successfully',
      tableStructure: tableInfo.rows,
      clientExists: clientCheck.rows.length > 0,
      insertedWorkflow: result.rows[0]
    });

  } catch (error) {
    console.error('Test insert error:', error);
    
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      detail: (error as any)?.detail,
      hint: (error as any)?.hint,
      position: (error as any)?.position,
      constraint: (error as any)?.constraint
    };

    return NextResponse.json({
      error: 'Test insert failed',
      errorDetails,
      fullError: error
    }, { status: 500 });
  }
}