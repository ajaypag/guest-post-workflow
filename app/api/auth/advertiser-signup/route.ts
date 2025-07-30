import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/services/emailService';
import { OrderService } from '@/lib/services/orderService';
import { AuthServiceServer } from '@/lib/auth-server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { email, password, name, company, phone, token } = data;

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await db.query.accounts.findFirst({
      where: eq(accounts.email, email.toLowerCase()),
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create account
    const accountId = uuidv4();
    const now = new Date();

    await db.insert(accounts).values({
      id: accountId,
      email: email.toLowerCase(),
      password: hashedPassword,
      contactName: name,
      companyName: company || '',
      phone: phone || null,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });

    // If coming from order share token, handle order approval
    if (token) {
      const order = await OrderService.getOrderByShareToken(token);
      if (order && order.status === 'pending_approval') {
        // Update order with account ID
        await db.update(orders)
          .set({
            accountId: accountId,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        // Account now has access to the order through accountId

        // Approve the order
        await OrderService.updateOrderStatus(
          order.id,
          'approved',
          accountId,
          'Approved during account creation'
        );

        // Invalidate the share token
        await OrderService.invalidateShareToken(order.id);
      }
    }

    // Link any existing orders by email
    const existingOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.accountEmail, email.toLowerCase()),
        isNull(orders.accountId)
      ),
    });

    for (const existingOrder of existingOrders) {
      await db.update(orders)
        .set({
          accountId: accountId,
          updatedAt: now,
        })
        .where(eq(orders.id, existingOrder.id));
    }

    // Send welcome email
    try {
      await EmailService.sendAdvertiserWelcome({
        email,
        name,
        company: company || undefined,
      });
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail registration if email fails
    }

    // Create session and set cookie
    const accountData = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });

    if (accountData) {
      // Create user object from account for session
      const user = {
        id: accountData.id,
        email: accountData.email,
        name: accountData.contactName,
        role: 'account' as const,
        isActive: true,
        userType: 'account' as const,
        passwordHash: accountData.password,
        lastLogin: accountData.lastLoginAt,
        createdAt: accountData.createdAt,
        updatedAt: accountData.updatedAt,
      };
      
      const token = await AuthServiceServer.createSession(user);
      
      // Set cookie
      const cookieStore = await cookies();
      cookieStore.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
      });

      console.log('🔐 Account signup successful, cookie set for:', email);
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      hasOrdersLinked: existingOrders.length > 0,
    });
  } catch (error) {
    console.error('Advertiser signup error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}