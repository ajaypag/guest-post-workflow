import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Verification token is required' },
        { status: 400 }
      );
    }

    // Find publisher with this verification token
    const publisher = await db.query.publishers.findFirst({
      where: and(
        eq(publishers.emailVerificationToken, token),
        eq(publishers.emailVerified, false)
      )
    });

    if (!publisher) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Update publisher to verified and active
    await db
      .update(publishers)
      .set({
        emailVerified: true,
        status: 'active',
        emailVerificationToken: null, // Clear the token
        updatedAt: new Date()
      })
      .where(eq(publishers.id, publisher.id));

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully. You can now sign in to your account.',
      user: {
        id: publisher.id,
        email: publisher.email,
        name: publisher.contactName,
        userType: 'publisher',
        status: 'active'
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred during verification' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find unverified publisher
    const publisher = await db.query.publishers.findFirst({
      where: and(
        eq(publishers.email, email.toLowerCase()),
        eq(publishers.emailVerified, false)
      )
    });

    if (!publisher) {
      return NextResponse.json(
        { error: 'No unverified account found with this email' },
        { status: 404 }
      );
    }

    // Generate new verification token
    const { v4: uuidv4 } = await import('uuid');
    const newToken = uuidv4();

    // Update token in database
    await db
      .update(publishers)
      .set({
        emailVerificationToken: newToken,
        updatedAt: new Date()
      })
      .where(eq(publishers.id, publisher.id));

    // Send new verification email
    try {
      const { EmailService } = await import('@/lib/services/emailService');
      await EmailService.send('notification', {
        to: email.toLowerCase(),
        subject: 'Verify Your Publisher Account',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Verify Your Publisher Account</h2>
            <p>Hello ${publisher.contactName},</p>
            <p>You requested a new verification email. Please click the button below to verify your account.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/verify?token=${newToken}" 
                 style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #6b7280;">${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/verify?token=${newToken}</p>
            <p>This link will expire in 24 hours.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              Best regards,<br>
              The Publisher Platform Team
            </p>
          </div>
        `
      });

      return NextResponse.json({
        success: true,
        message: 'Verification email sent successfully. Please check your inbox.'
      });

    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred while resending verification' },
      { status: 500 }
    );
  }
}