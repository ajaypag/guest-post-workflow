import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { 
  publisherOfferingRelationships,
  publisherEmailClaims 
} from '@/lib/db/publisherSchemaActual';
import { websites } from '@/lib/db/websiteSchema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// POST /api/publisher/websites/[id]/verify - Initiate verification
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: websiteId } = await params;
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!session.publisherId) {
      return NextResponse.json(
        { error: 'Invalid publisher session' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { method, token } = body;

    if (!method || !token) {
      return NextResponse.json(
        { error: 'Method and token are required' },
        { status: 400 }
      );
    }

    // Check if publisher has a relationship with this website
    const relationships = await db
      .select()
      .from(publisherOfferingRelationships)
      .where(and(
        eq(publisherOfferingRelationships.websiteId, websiteId),
        eq(publisherOfferingRelationships.publisherId, session.publisherId)
      ))
      .limit(1);
    
    const relationship = relationships[0];

    if (!relationship) {
      return NextResponse.json(
        { error: 'You do not have a relationship with this website' },
        { status: 403 }
      );
    }

    // Get website details
    const websiteData = await db
      .select()
      .from(websites)
      .where(eq(websites.id, websiteId))
      .limit(1);
    
    const website = websiteData[0];

    if (!website) {
      return NextResponse.json(
        { error: 'Website not found' },
        { status: 404 }
      );
    }

    // Handle different verification methods
    switch (method) {
      case 'email':
        // Create email claim record
        await db.insert(publisherEmailClaims).values({
          id: uuidv4(),
          publisherId: session.publisherId,
          websiteId: websiteId,
          emailDomain: website.domain,
          verificationToken: token,
          verificationSentAt: new Date(),
          status: 'pending',
          claimSource: 'publisher_portal',
          claimConfidence: 'high',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // In production, send actual email
        // For now, we'll simulate it
        console.log(`Sending verification email to admin@${website.domain} with token: ${token}`);
        
        // Update relationship status to pending
        await db.update(publisherOfferingRelationships)
          .set({
            verificationStatus: 'pending',
            verificationMethod: 'email',
            updatedAt: new Date()
          })
          .where(eq(publisherOfferingRelationships.id, relationship.id));

        return NextResponse.json({
          success: true,
          message: `Verification email sent to admin@${website.domain}`
        });

      case 'dns':
      case 'meta':
      case 'file':
        // For these methods, just store the token and method
        // The actual verification will happen when they check status
        await db.update(publisherOfferingRelationships)
          .set({
            verificationStatus: 'pending',
            verificationMethod: method,
            customTerms: {
              ...((relationship.customTerms as any) || {}),
              verificationToken: token,
              verificationInitiated: new Date().toISOString()
            },
            updatedAt: new Date()
          })
          .where(eq(publisherOfferingRelationships.id, relationship.id));

        return NextResponse.json({
          success: true,
          message: `${method} verification initiated. Please complete the setup and check status.`
        });

      default:
        return NextResponse.json(
          { error: 'Invalid verification method' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error initiating verification:', error);
    return NextResponse.json(
      { error: 'Failed to initiate verification' },
      { status: 500 }
    );
  }
}