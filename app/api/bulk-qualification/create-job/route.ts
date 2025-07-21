import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { qualificationJobs, jobTargetPages, bulkSites } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { clientId, name, description, checkDepth, targetPages, sites } = await request.json();

    if (!clientId || !name || !targetPages?.length || !sites?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, name, targetPages, sites' },
        { status: 400 }
      );
    }

    const jobId = uuidv4();
    const now = new Date();

    // Create qualification job
    await db.insert(qualificationJobs).values({
      id: jobId,
      clientId,
      name,
      description: description || '',
      checkDepth: checkDepth || 'balanced',
      totalSites: sites.length,
      processedSites: 0,
      totalApiCalls: 0,
      estimatedCost: '0.00',
      createdAt: now,
      updatedAt: now
    });

    // Insert job target pages
    const jobTargetPagesData = targetPages.map((targetPageId: string) => ({
      id: uuidv4(),
      jobId,
      targetPageId,
      createdAt: now
    }));

    await db.insert(jobTargetPages).values(jobTargetPagesData);

    // Insert bulk sites
    const bulkSitesData = sites.map((site: any) => ({
      id: uuidv4(),
      jobId,
      domain: site.domain,
      url: site.url || `https://${site.domain}`,
      sourceType: site.sourceType || 'manual',
      siteName: site.siteName || site.domain,
      monthlyTraffic: site.monthlyTraffic || null,
      domainAuthority: site.domainAuthority || null,
      niche: site.niche || null,
      notes: site.notes || '',
      createdAt: now,
      updatedAt: now
    }));

    await db.insert(bulkSites).values(bulkSitesData);

    console.log(`✅ Created bulk qualification job ${jobId} with ${sites.length} sites`);

    return NextResponse.json({
      success: true,
      jobId,
      message: `Bulk qualification job "${name}" created with ${sites.length} sites`,
      data: {
        jobId,
        name,
        totalSites: sites.length,
        targetPages: targetPages.length,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Failed to create bulk qualification job:', error);
    return NextResponse.json(
      { error: 'Failed to create bulk qualification job' },
      { status: 500 }
    );
  }
}