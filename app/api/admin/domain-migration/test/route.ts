import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/schema';
import { sql, eq } from 'drizzle-orm';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

export async function POST(request: Request) {
  try {
    const { domain } = await request.json();
    
    if (!domain) {
      return NextResponse.json(
        { success: false, error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Normalize the domain using our utility
    const normalizedResult = normalizeDomain(domain);
    
    // Check if this normalized domain exists in database
    const existingWebsites = await db.execute(sql`
      SELECT id, domain, normalized_domain, domain_rating
      FROM websites
      WHERE normalized_domain = ${normalizedResult.domain}
      OR domain = ${domain}
    `);

    // Find exact match and duplicates
    const exactMatch = existingWebsites.rows.find(
      (w: any) => w.domain === domain
    );
    
    const duplicates = existingWebsites.rows.filter(
      (w: any) => w.normalized_domain === normalizedResult.domain && w.domain !== domain
    );

    return NextResponse.json({
      success: true,
      result: {
        original: domain,
        normalized: normalizedResult.domain,
        subdomain: normalizedResult.subdomain,
        isWww: normalizedResult.isWww,
        protocol: normalizedResult.protocol,
        existingWebsite: exactMatch || null,
        duplicates: duplicates.length > 0 ? duplicates : null
      }
    });
  } catch (error) {
    console.error('Test normalization error:', error);
    return NextResponse.json(
      { success: false, error: `Test failed: ${error}` },
      { status: 500 }
    );
  }
}