import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { ShadowPublisherInvitationService } from '@/lib/services/shadowPublisherInvitationService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and internal user permission
    const session = await AuthServiceServer.getSession(request);
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access required' },
        { status: 401 }
      );
    }

    const { id: publisherId } = await params;
    
    if (!publisherId) {
      return NextResponse.json(
        { error: 'Publisher ID is required' },
        { status: 400 }
      );
    }

    // Send invitation using the service
    const invitationService = new ShadowPublisherInvitationService();
    const success = await invitationService.sendInvitation(publisherId);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to send invitation. Publisher may not exist or invitation was already sent recently.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully'
    });

  } catch (error) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}