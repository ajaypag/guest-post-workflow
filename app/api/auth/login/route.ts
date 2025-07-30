import { NextRequest, NextResponse } from 'next/server';
import { UserService } from '@/lib/db/userService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db/connection';
import { advertisers } from '@/lib/db/advertiserSchema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // First try to find user in users table (internal team)
    let user = await UserService.verifyPassword(email, password);
    let userType = 'internal';
    let token: string;
    
    if (!user) {
      // If not found in users table, check advertisers table
      const advertiser = await db.query.advertisers.findFirst({
        where: eq(advertisers.email, email.toLowerCase()),
      });
      
      if (advertiser) {
        // Verify advertiser password
        const isPasswordValid = await bcrypt.compare(password, advertiser.password);
        if (isPasswordValid && (advertiser.status === 'active' || advertiser.status === 'pending')) {
          // Create user object from advertiser
          user = {
            id: advertiser.id,
            email: advertiser.email,
            name: advertiser.contactName,
            role: 'advertiser',
            isActive: true,
            userType: 'advertiser',
            passwordHash: advertiser.password,
            lastLogin: advertiser.lastLoginAt,
            createdAt: advertiser.createdAt,
            updatedAt: advertiser.updatedAt,
          };
          userType = 'advertiser';
          
          // Update last login
          await db
            .update(advertisers)
            .set({ lastLoginAt: new Date() })
            .where(eq(advertisers.id, advertiser.id));
        }
      }
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Create JWT token
    token = await AuthServiceServer.createSession(user);
    
    // Create response first
    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        userType: userType
      }
    });

    // Set cookie on the response
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Log environment for debugging
    console.log('🔐 Setting cookie with:', {
      name: 'auth-token',
      value: token.substring(0, 20) + '...',
      httpOnly: true,
      secure: isProduction,
      nodeEnv: process.env.NODE_ENV,
      sameSite: 'lax',
      path: '/',
      domain: process.env.COOKIE_DOMAIN || undefined,
    });
    
    response.cookies.set({
      name: 'auth-token',
      value: token,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      // Add domain if specified in env
      ...(process.env.COOKIE_DOMAIN && { domain: process.env.COOKIE_DOMAIN })
    });

    console.log('🔐 Login successful, cookie set for:', user.email);
    console.log('🔐 Response headers:', response.headers.get('set-cookie'));

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}