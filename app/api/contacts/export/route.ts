import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';

// Database configuration
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

// Create connection pool
const pool = new Pool({
  connectionString,
  ssl: false, // Coolify PostgreSQL doesn't use SSL
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filters } = body;

    // Build the query (similar to search but without pagination)
    let query = `
      SELECT 
        wc.email,
        w.domain as website_domain,
        wc.is_primary,
        wc.has_paid_guest_post,
        wc.has_swap_option,
        wc.guest_post_cost,
        wc.link_insert_cost,
        wc.requirement,
        wc.status,
        wc.last_contacted,
        wc.response_rate,
        wc.average_response_time,
        wc.notes,
        w.categories as website_categories,
        w.domain_rating,
        w.total_traffic
      FROM website_contacts wc
      JOIN websites w ON wc.website_id = w.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply same filters as search
    if (filters.searchTerm) {
      query += ` AND (wc.email ILIKE $${paramIndex} OR w.domain ILIKE $${paramIndex})`;
      params.push(`%${filters.searchTerm}%`);
      paramIndex++;
    }

    if (filters.isPrimary !== undefined) {
      query += ` AND wc.is_primary = $${paramIndex}`;
      params.push(filters.isPrimary);
      paramIndex++;
    }

    if (filters.requirement) {
      query += ` AND wc.requirement = $${paramIndex}`;
      params.push(filters.requirement);
      paramIndex++;
    }

    if (filters.minCost !== undefined) {
      query += ` AND wc.guest_post_cost >= $${paramIndex}`;
      params.push(filters.minCost);
      paramIndex++;
    }

    if (filters.maxCost !== undefined) {
      query += ` AND wc.guest_post_cost <= $${paramIndex}`;
      params.push(filters.maxCost);
      paramIndex++;
    }

    if (filters.categories && filters.categories.length > 0) {
      query += ` AND w.categories && $${paramIndex}`;
      params.push(filters.categories);
      paramIndex++;
    }

    if (filters.hasBeenContacted !== undefined) {
      if (filters.hasBeenContacted) {
        query += ` AND wc.last_contacted IS NOT NULL`;
      } else {
        query += ` AND wc.last_contacted IS NULL`;
      }
    }

    query += ` ORDER BY w.domain ASC, wc.is_primary DESC`;

    // Get contacts
    const result = await pool.query(query, params);

    // Generate CSV
    const headers = [
      'Email',
      'Website',
      'Primary Contact',
      'Domain Rating',
      'Monthly Traffic',
      'Categories',
      'Paid Guest Post',
      'Swap Option',
      'Guest Post Cost',
      'Link Insert Cost',
      'Requirement',
      'Status',
      'Last Contacted',
      'Response Rate (%)',
      'Avg Response Time (hours)',
      'Notes'
    ];

    const csvRows = [headers.join(',')];

    result.rows.forEach(row => {
      const values = [
        row.email,
        row.website_domain,
        row.is_primary ? 'Yes' : 'No',
        row.domain_rating || '',
        row.total_traffic || '',
        (row.website_categories || []).join('; '),
        row.has_paid_guest_post ? 'Yes' : 'No',
        row.has_swap_option ? 'Yes' : 'No',
        row.guest_post_cost || '',
        row.link_insert_cost || '',
        row.requirement || '',
        row.status || '',
        row.last_contacted ? new Date(row.last_contacted).toLocaleDateString() : '',
        row.response_rate || '',
        row.average_response_time || '',
        row.notes ? `"${row.notes.replace(/"/g, '""')}"` : ''
      ];
      
      csvRows.push(values.join(','));
    });

    const csv = csvRows.join('\n');

    // Return CSV as download
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="contacts-export-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting contacts:', error);
    return NextResponse.json(
      { error: 'Failed to export contacts' },
      { status: 500 }
    );
  }
}