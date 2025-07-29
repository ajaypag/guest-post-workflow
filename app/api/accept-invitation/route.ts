import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { invitations, users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { UserService } from '@/lib/db/userService';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { token, name, password } = await request.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: 'Token, name, and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Find invitation by token
    const invitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    const inv = invitation[0];

    // Check if invitation was already used
    if (inv.usedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      );
    }

    // Check if invitation was revoked
    if (inv.revokedAt) {
      return NextResponse.json(
        { error: 'This invitation has been revoked' },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    const now = new Date();
    if (new Date(inv.expiresAt) < now) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if user already exists with this email
    const existingUser = await UserService.getUserByEmail(inv.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Create the user
    try {
      const newUser = await UserService.createUser({
        email: inv.email,
        name,
        password,
        role: inv.role,
        userType: inv.userType,
        isActive: true,
      });

      // Mark invitation as used
      await db
        .update(invitations)
        .set({
          usedAt: now,
          updatedAt: now,
        })
        .where(eq(invitations.id, inv.id));

      console.log(`User created successfully from invitation: ${inv.email}`);

      // Return user data (without password hash)
      const { passwordHash, ...userWithoutPassword } = newUser;
      
      return NextResponse.json({ 
        user: userWithoutPassword,
        message: 'Account created successfully'
      });

    } catch (createError: any) {
      console.error('Error creating user from invitation:', createError);
      
      // Handle specific user creation errors
      if (createError.message.includes('already exists')) {
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create user account' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}