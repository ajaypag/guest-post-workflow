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
    const { filters, limit = 50, offset = 0 } = body;

    // Build the query
    let query = `
      SELECT 
        wc.id,
        wc.email,
        wc.website_id,
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
        w.domain as website_domain,
        w.categories as website_categories
      FROM website_contacts wc
      JOIN websites w ON wc.website_id = w.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Apply filters
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

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM (${query}) as total`;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Add ordering and pagination
    query += ` ORDER BY wc.is_primary DESC, w.domain ASC`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    // Get contacts
    const result = await pool.query(query, params);

    // Format contacts
    const contacts = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      websiteId: row.website_id,
      websiteDomain: row.website_domain,
      websiteCategories: row.website_categories || [],
      isPrimary: row.is_primary,
      hasPaidGuestPost: row.has_paid_guest_post,
      hasSwapOption: row.has_swap_option,
      guestPostCost: row.guest_post_cost,
      linkInsertCost: row.link_insert_cost,
      requirement: row.requirement,
      status: row.status,
      lastContacted: row.last_contacted,
      responseRate: row.response_rate,
      averageResponseTime: row.average_response_time,
      notes: row.notes
    }));

    // Get stats
    const statsQuery = `
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(*) FILTER (WHERE is_primary = true) as primary_contacts,
        AVG(guest_post_cost) FILTER (WHERE guest_post_cost IS NOT NULL) as average_cost,
        COUNT(*) FILTER (WHERE has_swap_option = true) as swap_available,
        COUNT(*) FILTER (WHERE has_paid_guest_post = true AND has_swap_option = false) as paid_only,
        AVG(response_rate) FILTER (WHERE response_rate IS NOT NULL) as average_response_rate
      FROM website_contacts
    `;
    const statsResult = await pool.query(statsQuery);
    const stats = {
      totalContacts: parseInt(statsResult.rows[0].total_contacts),
      primaryContacts: parseInt(statsResult.rows[0].primary_contacts),
      averageCost: Math.round(statsResult.rows[0].average_cost || 0),
      swapAvailable: parseInt(statsResult.rows[0].swap_available),
      paidOnly: parseInt(statsResult.rows[0].paid_only),
      averageResponseRate: Math.round(statsResult.rows[0].average_response_rate || 0)
    };

    return NextResponse.json({
      contacts,
      total,
      stats
    });
  } catch (error) {
    console.error('Error searching contacts:', error);
    return NextResponse.json(
      { error: 'Failed to search contacts' },
      { status: 500 }
    );
  }
}