import { NextResponse } from 'next/server';
import { WorkflowEmailService } from '@/lib/services/workflowEmailService';
import { ChatwootService } from '@/lib/services/chatwootService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recipientEmail, recipientName, inboxId, testMode = false } = body;

    if (!recipientEmail) {
      return NextResponse.json({
        error: 'Recipient email is required'
      }, { status: 400 });
    }

    // In test mode, just verify connection
    if (testMode) {
      // Test 1: Can we connect to Chatwoot?
      const testConnection = await fetch(`${process.env.CHATWOOT_API_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}`, {
        headers: {
          'api_access_token': process.env.CHATWOOT_API_KEY!,
          'Content-Type': 'application/json'
        }
      });

      if (!testConnection.ok) {
        return NextResponse.json({
          error: 'Failed to connect to Chatwoot',
          details: await testConnection.text()
        }, { status: 500 });
      }

      // Test 2: Can we get inbox details?
      const inboxResponse = await fetch(
        `${process.env.CHATWOOT_API_URL}/api/v1/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/inboxes/${process.env.CHATWOOT_INBOX_ID}`,
        {
          headers: {
            'api_access_token': process.env.CHATWOOT_API_KEY!,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!inboxResponse.ok) {
        return NextResponse.json({
          error: 'Invalid inbox configuration',
          details: 'Check CHATWOOT_INBOX_ID in environment variables'
        }, { status: 500 });
      }

      const inbox = await inboxResponse.json();

      return NextResponse.json({
        success: true,
        connection: 'OK',
        inbox: {
          id: inbox.id,
          name: inbox.name,
          channel_type: inbox.channel_type
        }
      });
    }

    // Send test email
    const result = await WorkflowEmailService.sendGuestPostEmail({
      workflowId: 'test-workflow-' + Date.now(),
      orderId: 'test-order-' + Date.now(),
      orderItemId: 'test-item-' + Date.now(),
      recipientEmail,
      recipientName: recipientName || 'Test Recipient',
      subject: 'Test Email from PostFlow via Chatwoot',
      body: `Hi there,

This is a test email sent from PostFlow through Chatwoot integration.

If you're receiving this, it means our email integration is working correctly!

${inboxId ? `\nSent using inbox ID: ${inboxId}` : 'Sent using default inbox'}

Best regards,
PostFlow Team`,
      inboxId, // Pass the selected inbox ID
      metadata: {
        articleTitle: 'Test Article'
      }
    });

    if (result.sent) {
      // Get conversation details
      const status = await WorkflowEmailService.getEmailStatus(result.conversationId!);
      
      return NextResponse.json({
        success: true,
        result: {
          ...result,
          conversationUrl: `${process.env.CHATWOOT_APP_URL}/app/accounts/${process.env.CHATWOOT_ACCOUNT_ID}/conversations/${result.conversationId}/messages`,
          status
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Test email failed:', error);
    return NextResponse.json({
      error: 'Test failed',
      details: error.message
    }, { status: 500 });
  }
}

// Get email sending status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json({
        error: 'Conversation ID is required'
      }, { status: 400 });
    }

    const status = await WorkflowEmailService.getEmailStatus(parseInt(conversationId));
    
    return NextResponse.json({
      success: true,
      status
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get status',
      details: error.message
    }, { status: 500 });
  }
}