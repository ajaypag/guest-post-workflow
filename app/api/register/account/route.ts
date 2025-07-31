import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { EmailService } from '@/lib/services/emailService';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { token, email, contactName, companyName, password } = data;

    if (!token || !email || !contactName || !password) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Verify the invitation
    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        eq(invitations.targetTable, 'accounts'),
        eq(invitations.email, email.toLowerCase()),
        isNull(invitations.usedAt),
        isNull(invitations.revokedAt)
      )
    });

    if (!invitation) {
      return NextResponse.json({ 
        error: 'Invalid invitation' 
      }, { status: 400 });
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json({ 
        error: 'This invitation has expired' 
      }, { status: 400 });
    }

    // Check if account already exists
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase())
    });

    if (existingAccount) {
      return NextResponse.json({ 
        error: 'An account with this email already exists' 
      }, { status: 400 });
    }

    // Start transaction
    const result = await db.transaction(async (tx) => {
      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create the account
      const [newAccount] = await tx.insert(accounts).values({
        id: uuidv4(),
        email: email.toLowerCase(),
        password: hashedPassword,
        contactName,
        companyName: companyName || '',
        status: 'active', // Set to active since they accepted invitation
        emailVerified: true, // Email is verified through invitation
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Mark invitation as used
      await tx.update(invitations)
        .set({ 
          usedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(invitations.id, invitation.id));

      return newAccount;
    });

    // Send welcome email
    try {
      await EmailService.sendAccountWelcome({
        email: result.email,
        name: result.contactName,
        company: result.companyName || undefined
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the registration if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}