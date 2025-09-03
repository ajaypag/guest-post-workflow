import { NextRequest, NextResponse } from 'next/server';
import { ManyReachPollingService } from '@/lib/services/manyReachPollingService';
import { requireInternalUser } from '@/lib/auth/middleware';

export async function POST(request: NextRequest) {
  try {
    const authCheck = await requireInternalUser(request);
    if (authCheck instanceof NextResponse) {
      return authCheck;
    }
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    
    const pollingService = new ManyReachPollingService();
    
    if (campaignId) {
      // Poll specific campaign
      const result = await pollingService.pollCampaignForReplies(campaignId);
      return NextResponse.json(result);
    } else {
      // Poll all campaigns
      const results = await pollingService.pollAllCampaigns();
      return NextResponse.json(results);
    }
  } catch (error) {
    console.error('Polling error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Polling failed' },
      { status: 500 }
    );
  }
}