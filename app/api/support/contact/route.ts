import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { subject, category, priority, message } = await request.json();

    // Validate required fields
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Subject and message are required' },
        { status: 400 }
      );
    }

    // For now, just log the support request
    // In a real application, you would:
    // 1. Save to database
    // 2. Send email notification to support team
    // 3. Send confirmation email to user
    
    const supportRequest = {
      id: `support_${Date.now()}`,
      userId: session.userId,
      userEmail: session.email,
      userName: session.name,
      companyName: session.companyName,
      subject: subject.trim(),
      category: category || 'general',
      priority: priority || 'medium',
      message: message.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };

    console.log('Support request received:', supportRequest);

    // TODO: Save to database
    // await db.insert(supportTickets).values(supportRequest);

    // TODO: Send notification emails
    // await emailService.sendSupportNotification(supportRequest);

    return NextResponse.json({
      success: true,
      message: 'Support request submitted successfully',
      ticketId: supportRequest.id
    });

  } catch (error) {
    console.error('Support contact error:', error);
    return NextResponse.json(
      { error: 'Failed to submit support request' },
      { status: 500 }
    );
  }
}