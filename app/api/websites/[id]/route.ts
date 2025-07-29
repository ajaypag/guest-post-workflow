import { NextRequest, NextResponse } from 'next/server';
import { AirtableSyncService } from '@/lib/services/airtableSyncService';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const website = await AirtableSyncService.getWebsiteDetails(params.id);

    if (!website) {
      return NextResponse.json({ error: 'Website not found' }, { status: 404 });
    }

    return NextResponse.json(website);
  } catch (error) {
    console.error('Error fetching website details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch website details' },
      { status: 500 }
    );
  }
}