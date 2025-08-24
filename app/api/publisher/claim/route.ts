import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/accountSchema';
import { publisherClaimHistory } from '@/lib/db/emailProcessingSchema';
import { shadowPublisherConfig } from '@/lib/config/shadowPublisherConfig';
import { shadowPublisherMigrationService } from '@/lib/services/shadowPublisherMigrationService';
import { eq, and, gte } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { z } from 'zod';
import { Resend } from 'resend';

// Validation schemas
const initiateClaimSchema = z.object({
  token: z.string().min(1),
});

const completeClaimSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
  contactName: z.string().min(1).max(255),
  companyName: z.string().optional(),
});

// GET - Validate claim token and return publisher info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (!token) {
      return NextResponse.json(
        { error: 'Claim token is required' },
        { status: 400 }
      );
    }
    
    // Find publisher by invitation token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.invitationToken, token),
          eq(publishers.accountStatus, 'shadow')
        )
      )
      .limit(1);
    
    if (!publisher) {
      return NextResponse.json(
        { error: 'Invalid or expired claim token' },
        { status: 404 }
      );
    }
    
    // Check if token has expired
    if (publisher.invitationExpiresAt && new Date() > publisher.invitationExpiresAt) {
      return NextResponse.json(
        { error: 'This claim token has expired' },
        { status: 410 }
      );
    }
    
    // Check if account is locked due to too many attempts
    if ((publisher.claimAttempts || 0) >= shadowPublisherConfig.invitation.claimMaxAttempts) {
      const lockoutTime = publisher.lastClaimAttempt
        ? new Date(publisher.lastClaimAttempt.getTime() + shadowPublisherConfig.invitation.claimLockoutMinutes * 60 * 1000)
        : null;
      
      if (lockoutTime && new Date() < lockoutTime) {
        return NextResponse.json(
          { 
            error: 'Too many claim attempts. Please try again later.',
            retryAfter: lockoutTime.toISOString()
          },
          { status: 429 }
        );
      }
    }
    
    // Return publisher preview info (safe data only)
    return NextResponse.json({
      success: true,
      publisher: {
        email: publisher.email,
        contactName: publisher.contactName || '',
        companyName: publisher.companyName || '',
        source: publisher.source,
        createdAt: publisher.createdAt,
      }
    });
    
  } catch (error) {
    console.error('Failed to validate claim token:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Complete the claim process
export async function POST(request: NextRequest) {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    const body = await request.json();
    const validation = completeClaimSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { token, password, contactName, companyName } = validation.data;
    
    // Find publisher by invitation token
    const [publisher] = await db
      .select()
      .from(publishers)
      .where(
        and(
          eq(publishers.invitationToken, token),
          eq(publishers.accountStatus, 'shadow')
        )
      )
      .limit(1);
    
    if (!publisher) {
      // Log failed attempt
      console.warn('Claim attempt with invalid token:', { token, ipAddress });
      return NextResponse.json(
        { error: 'Invalid or expired claim token' },
        { status: 404 }
      );
    }
    
    // Check if token has expired
    if (publisher.invitationExpiresAt && new Date() > publisher.invitationExpiresAt) {
      // Log expired attempt
      await logClaimAttempt(publisher.id, 'fail_claim', false, 'Token expired', ipAddress, userAgent);
      return NextResponse.json(
        { error: 'This claim token has expired' },
        { status: 410 }
      );
    }
    
    // Check if account is locked
    if ((publisher.claimAttempts || 0) >= shadowPublisherConfig.invitation.claimMaxAttempts) {
      const lockoutTime = publisher.lastClaimAttempt
        ? new Date(publisher.lastClaimAttempt.getTime() + shadowPublisherConfig.invitation.claimLockoutMinutes * 60 * 1000)
        : null;
      
      if (lockoutTime && new Date() < lockoutTime) {
        await logClaimAttempt(publisher.id, 'fail_claim', false, 'Account locked', ipAddress, userAgent);
        return NextResponse.json(
          { 
            error: 'Too many claim attempts. Please try again later.',
            retryAfter: lockoutTime.toISOString()
          },
          { status: 429 }
        );
      }
    }
    
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      
      // Update publisher to active status
      await db.update(publishers)
        .set({
          password: hashedPassword,
          contactName,
          companyName: companyName || publisher.companyName,
          accountStatus: 'active',
          status: 'active',
          emailVerified: true,
          claimedAt: new Date(),
          invitationToken: null, // Clear the token
          invitationExpiresAt: null,
          claimAttempts: 0,
          lastClaimAttempt: null,
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisher.id));
      
      // CRITICAL: Migrate shadow publisher data (websites, offerings, relationships)
      console.log('Starting shadow data migration for publisher:', publisher.id);
      let migrationResult = null;
      try {
        migrationResult = await shadowPublisherMigrationService.migratePublisherData(publisher.id);
        
        if (migrationResult.success) {
          console.log(`Shadow data migration successful: ${migrationResult.websitesMigrated} websites, ${migrationResult.offeringsActivated} offerings`);
        } else {
          console.error('Shadow data migration had errors:', migrationResult.errors);
        }
      } catch (migrationError) {
        // Log migration error but don't fail the claim
        console.error('Shadow data migration failed:', migrationError);
        // Continue with claim process even if migration fails
        // Publisher will have empty dashboard but can still login
      }
      
      // Log successful claim
      await logClaimAttempt(publisher.id, 'complete_claim', true, null, ipAddress, userAgent);
      
      // Send welcome email
      try {
        await sendWelcomeEmail(publisher.email, contactName);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the claim if email fails
      }
      
      // Include migration status in response
      const response: any = {
        success: true,
        message: 'Account successfully claimed',
        redirectUrl: '/publisher/dashboard'
      };
      
      if (migrationResult) {
        response.migration = {
          success: migrationResult.success,
          websitesMigrated: migrationResult.websitesMigrated,
          offeringsActivated: migrationResult.offeringsActivated,
          hasErrors: migrationResult.errors.length > 0
        };
      }
      
      return NextResponse.json(response);
      
    } catch (error) {
      // Increment claim attempts
      await db.update(publishers)
        .set({
          claimAttempts: (publisher.claimAttempts || 0) + 1,
          lastClaimAttempt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(publishers.id, publisher.id));
      
      // Log failed attempt
      await logClaimAttempt(
        publisher.id, 
        'fail_claim', 
        false, 
        error instanceof Error ? error.message : 'Unknown error',
        ipAddress,
        userAgent
      );
      
      throw error;
    }
    
  } catch (error) {
    console.error('Failed to complete claim:', error);
    return NextResponse.json(
      { error: 'Failed to complete claim process' },
      { status: 500 }
    );
  }
}

// Helper function to log claim attempts
async function logClaimAttempt(
  publisherId: string,
  action: string,
  success: boolean,
  failureReason: string | null,
  ipAddress: string,
  userAgent: string
) {
  try {
    await db.insert(publisherClaimHistory).values({
      id: crypto.randomUUID(),
      publisherId,
      action,
      success,
      failureReason,
      ipAddress,
      userAgent,
      verificationMethod: 'token',
      metadata: JSON.stringify({
        timestamp: new Date().toISOString(),
      }),
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to log claim attempt:', error);
  }
}

// Helper function to send welcome email
async function sendWelcomeEmail(email: string, contactName: string) {
  const resend = new Resend(process.env.RESEND_API_KEY || 're_test_key_here');
  
  const dashboardUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/publisher/dashboard`;
  
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Our Publisher Network!</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome Aboard! 🎉</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; margin-top: -1px;">
          <p style="font-size: 16px; margin-top: 0;">Hi ${contactName},</p>
          
          <p style="font-size: 16px;">
            <strong>Congratulations!</strong> Your publisher account has been successfully activated.
          </p>
          
          <p>You now have full access to:</p>
          <ul style="color: #4b5563; margin: 15px 0; padding-left: 20px;">
            <li>Manage your website listings and pricing</li>
            <li>Receive and manage guest post orders</li>
            <li>Track your earnings and performance</li>
            <li>Update your offerings and availability</li>
            <li>Access detailed analytics and reports</li>
          </ul>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Go to Your Dashboard
            </a>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #111827; font-size: 16px;">🚀 Quick Start Guide</h3>
            <ol style="color: #4b5563; margin: 10px 0; padding-left: 20px;">
              <li><strong>Complete Your Profile:</strong> Add your payment details and preferences</li>
              <li><strong>Review Your Websites:</strong> Verify your domain listings are correct</li>
              <li><strong>Set Your Pricing:</strong> Update your guest post rates and requirements</li>
              <li><strong>Configure Availability:</strong> Set your turnaround times and capacity</li>
            </ol>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; color: #92400e;">
              <strong>💡 Pro Tip:</strong> Publishers with complete profiles receive 3x more orders. 
              Take a few minutes to fill out all your information!
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px;">
            If you have any questions or need assistance, our support team is here to help. 
            Simply reply to this email or contact us through your dashboard.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          
          <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 0;">
            Guest Post Workflow System<br>
            © ${new Date().getFullYear()} All rights reserved.
          </p>
        </div>
      </body>
    </html>
  `;
  
  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'info@linkio.com',
    to: email,
    subject: 'Welcome to Our Publisher Network! 🎉',
    html: emailHtml,
  });
}