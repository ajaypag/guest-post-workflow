import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
    }

    const testEmail = 'test-publisher@example.com';
    
    // Check if test publisher already exists
    const [existingPublisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, testEmail))
      .limit(1);

    let publisherId: string;

    if (existingPublisher) {
      publisherId = existingPublisher.id;
      
      // Update with new claim token (using hex to avoid URL encoding issues)
      const invitationToken = crypto.randomBytes(32).toString('hex');
      
      await db
        .update(publishers)
        .set({
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          accountStatus: 'shadow', // Ensure it's in shadow status for claiming
          updatedAt: new Date()
        })
        .where(eq(publishers.id, publisherId));

      console.log('🔄 Updated claim token for existing test publisher');
    } else {
      // Create new test publisher (using hex to avoid URL encoding issues)
      const invitationToken = crypto.randomBytes(32).toString('hex');
      
      const [newPublisher] = await db
        .insert(publishers)
        .values({
          id: crypto.randomUUID(),
          email: testEmail,
          contactName: 'Test Publisher',
          companyName: 'Test Publishing Company',
          accountStatus: 'shadow',
          source: 'manyreach',
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning({ id: publishers.id });

      publisherId = newPublisher.id;
      console.log('✅ Created new test publisher');
    }

    // Get updated publisher with token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.id, publisherId))
      .limit(1);

    if (!publisher || !publisher.invitationToken) {
      throw new Error('Failed to create publisher with token');
    }

    // Generate claim URL
    const baseUrl = process.env.NEXTAUTH_URL || `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const claimUrl = `${baseUrl}/publisher/claim?token=${publisher.invitationToken}`;

    return NextResponse.json({
      success: true,
      publisher: {
        id: publisher.id,
        email: publisher.email,
        contactName: publisher.contactName,
        companyName: publisher.companyName,
        accountStatus: publisher.accountStatus,
        source: publisher.source
      },
      claimUrl,
      token: publisher.invitationToken,
      testUrls: {
        landingPage: `${baseUrl}/publisher`,
        signupPage: `${baseUrl}/publisher/signup`,
        loginPage: `${baseUrl}/publisher/login`,
        claimPage: claimUrl
      },
      message: 'Test publisher claim created successfully! Use the claimUrl to test the new claim flow.'
    });

  } catch (error) {
    console.error('❌ Error creating test publisher claim:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create test publisher claim',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}