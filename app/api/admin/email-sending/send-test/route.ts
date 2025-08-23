import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';

// For testing purposes - bypass auth in local development
const isLocalDevelopment = process.env.NODE_ENV === 'development' && 
  (process.env.NEXTAUTH_URL?.includes('localhost') || !process.env.NEXTAUTH_URL);
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { shadowPublisherInvitationService } from '@/lib/services/shadowPublisherInvitationService';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  // Skip auth check for local testing
  if (!isLocalDevelopment) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { recipientEmail, publisherId, type } = body;

    console.log('[EMAIL_TEST] Starting test email send:', { recipientEmail, publisherId, type });

    let publisher;
    
    if (publisherId) {
      // Use existing publisher
      publisher = await db.query.publishers.findFirst({
        where: eq(publishers.id, publisherId)
      });
      
      if (!publisher) {
        return NextResponse.json({ 
          success: false, 
          error: 'Publisher not found' 
        }, { status: 404 });
      }
    } else {
      // Create temporary test publisher
      const testId = uuidv4();
      publisher = {
        id: testId,
        email: recipientEmail,
        contactName: 'Test Publisher',
        companyName: 'Test Company Inc.',
        accountStatus: 'shadow' as const,
        source: 'test',
        invitationToken: uuidv4(),
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    // Send the invitation email
    const result = await shadowPublisherInvitationService.sendInvitation(
      publisher.id,
      recipientEmail, // Override email to send to test address
      publisher.contactName || 'Publisher',
      publisher.invitationToken || uuidv4(),
      'test' // source
    );

    console.log('[EMAIL_TEST] Email send result:', result);

    return NextResponse.json({
      success: result.success,
      id: result.data?.id,
      error: result.error,
      details: {
        publisherId: publisher.id,
        publisherName: publisher.companyName,
        sentTo: recipientEmail,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('[EMAIL_TEST] Error sending test email:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to send test email' 
    }, { status: 500 });
  }
}