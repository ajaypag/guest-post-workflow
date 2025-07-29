import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users } from '@/lib/db/schema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { EmailService } from '@/lib/services/emailService';
import { OrderService } from '@/lib/services/orderService';

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

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create advertiser user
    const userId = uuidv4();
    const now = new Date();

    await db.insert(users).values({
      id: userId,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      name,
      role: 'user',
      userType: 'advertiser',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // If coming from order share token, handle order approval
    if (token) {
      const order = await OrderService.getOrderByShareToken(token);
      if (order && order.status === 'pending_approval') {
        // Update order with advertiser ID
        await db.update(orders)
          .set({
            advertiserId: userId,
            updatedAt: now,
          })
          .where(eq(orders.id, order.id));

        // Advertiser now has access to the order through advertiserId

        // Approve the order
        await OrderService.updateOrderStatus(
          order.id,
          'approved',
          userId,
          'Approved during account creation'
        );

        // Invalidate the share token
        await OrderService.invalidateShareToken(order.id);
      }
    }

    // Link any existing orders by email
    const existingOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.advertiserEmail, email.toLowerCase()),
        isNull(orders.advertiserId)
      ),
    });

    for (const existingOrder of existingOrders) {
      await db.update(orders)
        .set({
          advertiserId: userId,
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