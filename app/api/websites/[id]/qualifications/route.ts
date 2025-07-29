import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { sessionStorage } from '@/lib/userStorage';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    
    const qualifications = await pool.query(`
      SELECT 
        q.id,
        q.client_id as "clientId",
        c.name as "clientName",
        q.qualified_at as "qualifiedAt",
        q.qualified_by as "qualifiedBy",
        u.name as "qualifiedByName",
        q.status,
        q.notes
      FROM website_qualifications q
      JOIN clients c ON q.client_id = c.id
      JOIN users u ON q.qualified_by = u.id
      WHERE q.website_id = $1
      ORDER BY q.qualified_at DESC
    `, [params.id]);

    return NextResponse.json({ qualifications: qualifications.rows });
  } catch (error) {
    console.error('Error fetching qualifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch qualifications' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { clientId, status, notes, userId } = await req.json();

    if (!clientId || !status || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if qualification already exists
    const existing = await pool.query(`
      SELECT id FROM website_qualifications 
      WHERE website_id = $1 AND client_id = $2
    `, [params.id, clientId]);

    let result;
    if (existing.rows.length > 0) {
      // Update existing qualification
      result = await pool.query(`
        UPDATE website_qualifications
        SET status = $1, notes = $2, qualified_by = $3, qualified_at = NOW()
        WHERE id = $4
        RETURNING id
      `, [status, notes, userId, existing.rows[0].id]);
    } else {
      // Create new qualification
      result = await pool.query(`
        INSERT INTO website_qualifications (
          website_id, client_id, qualified_by, status, notes, qualified_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id
      `, [params.id, clientId, userId, status, notes]);
    }

    return NextResponse.json({ 
      success: true, 
      qualificationId: result.rows[0].id 
    });
  } catch (error) {
    console.error('Error saving qualification:', error);
    return NextResponse.json(
      { error: 'Failed to save qualification' },
      { status: 500 }
    );
  }
}