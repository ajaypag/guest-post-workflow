import { NextRequest, NextResponse } from 'next/server';
import { AirtableSyncService } from '@/lib/services/airtableSyncService';
import { WebsiteFilters } from '@/types/airtable';

export async function POST(request: NextRequest) {
  console.log('🔍 Local website search API called');
  
  try {
    const { 
      filters, 
      limit = 50, 
      offset = 0,
      clientId,
      projectId,
      onlyQualified,
      onlyUnqualified
    } = await request.json();
    
    console.log('📊 Search params:', { 
      filters, 
      limit, 
      offset, 
      clientId,
      onlyQualified,
      onlyUnqualified 
    });
    
    // Search local database
    const result = await AirtableSyncService.searchWebsitesLocal(
      {
        ...filters,
        clientId,
        onlyQualified,
        onlyUnqualified
      },
      limit,
      offset
    );
    
    console.log(`✅ Found ${result.websites.length} websites (total: ${result.total})`);
    
    // Transform to match frontend expectations
    const transformedWebsites = result.websites.map(w => ({
      id: w.id,
      airtableId: w.airtable_id,
      domain: w.domain,
      domainRating: w.domain_rating,
      totalTraffic: w.total_traffic,
      guestPostCost: w.guest_post_cost ? parseFloat(w.guest_post_cost) : null,
      categories: w.categories || [],
      type: w.type || [],
      status: w.status,
      hasGuestPost: w.has_guest_post,
      hasLinkInsert: w.has_link_insert,
      publishedOpportunities: w.published_opportunities,
      overallQuality: w.overall_quality,
      contacts: w.contacts || [],
      qualification: w.qualification,
      lastSyncedAt: w.last_synced_at
    }));
    
    return NextResponse.json({
      websites: transformedWebsites,
      total: result.total,
      hasMore: offset + limit < result.total
    });
  } catch (error: any) {
    console.error('❌ Search error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error.message },
      { status: 500 }
    );
  }
}

// Mark websites as qualified
export async function PUT(request: NextRequest) {
  try {
    const { 
      websiteIds, 
      clientId, 
      projectId,
      userId,
      notes 
    } = await request.json();
    
    console.log('✅ Qualifying websites:', { 
      count: websiteIds.length, 
      clientId, 
      projectId 
    });
    
    await AirtableSyncService.qualifyWebsites(
      websiteIds,
      clientId,
      projectId,
      userId,
      notes
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Qualification error:', error);
    return NextResponse.json(
      { error: 'Qualification failed', details: error.message },
      { status: 500 }
    );
  }
}