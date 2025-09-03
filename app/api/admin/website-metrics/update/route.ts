import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { eq, sql } from 'drizzle-orm';
import { normalizeDomain } from '@/lib/utils/domainNormalizer';

interface MetricUpdate {
  domain: string;
  domainRating?: number;
  totalTraffic?: number;
}

export async function POST(request: NextRequest) {
  try {
    // TODO: Add proper auth check
    // For now, allow access for testing

    const { updates } = await request.json();
    
    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: 'Updates must be an array' },
        { status: 400 }
      );
    }

    let updated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each update
    for (const update of updates) {
      try {
        // Normalize domain
        const normalizedDomain = normalizeDomain(update.domain);
        
        // Check if website exists
        const existing = await db
          .select({ id: websites.id })
          .from(websites)
          .where(eq(websites.domain, normalizedDomain))
          .limit(1);
        
        if (existing.length === 0) {
          errorDetails.push(`Website not found: ${normalizedDomain}`);
          errors++;
          continue;
        }

        // Build update object
        const updateData: any = {
          updatedAt: new Date()
        };

        // Only update if value is provided (not null or undefined)
        if (update.domainRating !== undefined && update.domainRating !== null) {
          updateData.domainRating = update.domainRating;
        }
        
        if (update.totalTraffic !== undefined && update.totalTraffic !== null) {
          updateData.totalTraffic = update.totalTraffic;
        }

        // Only update if there are metrics to update
        if (updateData.domainRating !== undefined || updateData.totalTraffic !== undefined) {
          await db
            .update(websites)
            .set(updateData)
            .where(eq(websites.domain, normalizedDomain));
          
          updated++;
        }
        
      } catch (error) {
        console.error(`Error updating ${update.domain}:`, error);
        errorDetails.push(`Failed to update ${update.domain}`);
        errors++;
      }
    }

    // Log results
    console.log(`Metrics update complete: ${updated} updated, ${errors} errors`);
    if (errorDetails.length > 0) {
      console.log('Error details:', errorDetails);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updated} websites${errors > 0 ? ` (${errors} errors)` : ''}`,
      updated,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined
    });

  } catch (error) {
    console.error('Error updating website metrics:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update website metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}