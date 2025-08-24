import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { publishers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { AuthServiceServer } from '@/lib/auth-server';
import { EmailService } from '@/lib/services/emailService';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    // Only internal users can create publishers via this endpoint
    if (!session || session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'Unauthorized - Internal access only' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      companyName,
      email,
      contactName,
      phone,
      tier,
      status,
      website,
      description,
      address,
      city,
      state,
      zipCode,
      country,
      sendInviteEmail
    } = body;

    // Validate required fields
    if (!companyName || !email) {
      return NextResponse.json(
        { error: 'Company name and email are required' },
        { status: 400 }
      );
    }

    // Check if publisher already exists
    const existingPublisher = await db
      .select()
      .from(publishers)
      .where(eq(publishers.email, email))
      .limit(1);

    if (existingPublisher.length > 0) {
      return NextResponse.json(
        { error: 'A publisher with this email already exists' },
        { status: 409 }
      );
    }

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Create publisher
    const newPublisher = await db
      .insert(publishers)
      .values({
        id: crypto.randomUUID(),
        companyName: companyName || null,
        email,
        contactName,
        phone: phone || null,
        status: status || 'pending',
        password: passwordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    const publisher = newPublisher[0];

    // Send welcome email if requested
    if (sendInviteEmail && publisher) {
      try {
        await EmailService.send('notification', {
          to: email,
          subject: 'Welcome to the Publisher Portal',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Welcome to the Publisher Portal!</h2>
              
              <p>Hi ${contactName || companyName},</p>
              
              <p>Your publisher account has been created successfully. Here are your login details:</p>
              
              <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 2px 6px; border-radius: 4px;">${tempPassword}</code></p>
                <p><strong>Login URL:</strong> <a href="${process.env.NEXTAUTH_URL}/publisher/login">${process.env.NEXTAUTH_URL}/publisher/login</a></p>
              </div>
              
              <p><strong>Important:</strong> Please log in and change your password immediately for security.</p>
              
              <h3 style="color: #1f2937;">Next Steps:</h3>
              <ol>
                <li>Log in to your publisher portal</li>
                <li>Change your password</li>
                <li>Complete your profile information</li>
                <li>Add your websites and create service offerings</li>
              </ol>
              
              <p>If you have any questions, please don't hesitate to contact our support team.</p>
              
              <p>Best regards,<br>
              The Publisher Platform Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the entire request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Publisher created successfully',
      publisher: {
        id: publisher.id,
        companyName: publisher.companyName,
        email: publisher.email,
        contactName: publisher.contactName,
        status: publisher.status,
      },
      ...(sendInviteEmail ? {
        tempPassword: tempPassword,
        note: 'Temporary password has been sent via email'
      } : {})
    });

  } catch (error) {
    console.error('Error creating publisher:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create publisher',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}