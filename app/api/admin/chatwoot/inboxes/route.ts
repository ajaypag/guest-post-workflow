import { NextResponse } from 'next/server';
import { ChatwootService } from '@/lib/services/chatwootService';

export async function GET() {
  try {
    const inboxes = await ChatwootService.getInboxes();
    
    // Filter to only email-type inboxes
    const emailInboxes = inboxes.filter(inbox => 
      inbox.channel_type === 'email' || inbox.channel_type === 'api'
    );
    
    return NextResponse.json({
      success: true,
      inboxes: emailInboxes.map(inbox => ({
        id: inbox.id,
        name: inbox.name,
        channel_type: inbox.channel_type,
        email_address: inbox.email_address,
        smtp_enabled: inbox.smtp_enabled,
        imap_enabled: inbox.imap_enabled
      }))
    });
  } catch (error: any) {
    console.error('Failed to fetch inboxes:', error);
    return NextResponse.json({
      error: 'Failed to fetch inboxes',
      details: error.message
    }, { status: 500 });
  }
}