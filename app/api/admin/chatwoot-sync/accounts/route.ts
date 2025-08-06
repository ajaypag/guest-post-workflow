import { NextResponse } from 'next/server';
import { ChatwootSyncService } from '@/lib/services/chatwootSyncService';

export async function POST() {
  try {
    const result = await ChatwootSyncService.syncAccounts();
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Account sync failed:', error);
    return NextResponse.json({
      error: 'Sync failed',
      details: error.message
    }, { status: 500 });
  }
}