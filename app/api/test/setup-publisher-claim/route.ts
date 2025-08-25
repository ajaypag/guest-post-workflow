import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, contactName, companyName } = body;
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Setting up publisher claim for: ${email}`);
    
    // Check if publisher already exists
    const [existingPublisher] = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, email))
      .limit(1);

    let publisherId: string;
    const invitationToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    if (existingPublisher) {
      console.log('✅ Found existing publisher, updating claim token');
      publisherId = existingPublisher.id;
      
      // Update with new claim token and reset to shadow status
      await db
        .update(publishers)
        .set({
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: expiresAt,
          accountStatus: 'shadow', // Reset to shadow for claiming
          status: 'shadow',
          contactName: contactName || existingPublisher.contactName,
          companyName: companyName || existingPublisher.companyName,
          claimAttempts: 0, // Reset attempts
          lastClaimAttempt: null,
          updatedAt: new Date()
        })
        .where(eq(publishers.id, publisherId));

      console.log('🔄 Updated existing publisher with new claim token');
    } else {
      // Create new publisher
      publisherId = crypto.randomUUID();
      
      await db
        .insert(publishers)
        .values({
          id: publisherId,
          email: email,
          contactName: contactName || 'Publisher',
          companyName: companyName || null,
          accountStatus: 'shadow',
          status: 'shadow',
          source: 'manual_setup',
          invitationToken,
          invitationSentAt: new Date(),
          invitationExpiresAt: expiresAt,
          emailVerified: false,
          claimAttempts: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      console.log('✅ Created new shadow publisher');
    }

    // Generate claim URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3002';
    const claimUrl = `${baseUrl}/publisher/claim?token=${invitationToken}`;

    return NextResponse.json({
      success: true,
      publisherId,
      email,
      contactName: contactName || 'Publisher',
      companyName,
      claimUrl,
      token: invitationToken,
      expiresAt: expiresAt.toISOString()
    });
    
  } catch (error) {
    console.error('Failed to setup publisher claim:', error);
    return NextResponse.json(
      { error: 'Failed to setup publisher claim' },
      { status: 500 }
    );
  }
}