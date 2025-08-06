import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// POST - Create account and claim order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const { email, password, contactName, companyName, phone } = await request.json();

    // Validate required fields
    if (!email || !password || !contactName || !companyName) {
      return NextResponse.json({ 
        error: 'Email, password, contact name, and company name are required' 
      }, { status: 400 });
    }

    // Validate password length
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }

    // Start transaction
    return await db.transaction(async (tx) => {
      // Find order by share token
      const [order] = await tx.select().from(orders).where(eq(orders.shareToken, token));
      
      if (!order) {
        throw new Error('Invalid or expired link');
      }

      // Check if token is expired
      if (order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date()) {
        throw new Error('This share link has expired');
      }

      // Check if email already exists
      const [existingAccount] = await tx.select().from(accounts).where(eq(accounts.email, email));
      if (existingAccount) {
        throw new Error('An account with this email already exists');
      }

      // Create new account
      const accountId = uuidv4();
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const [newAccount] = await tx.insert(accounts).values({
        id: accountId,
        email,
        password: hashedPassword,
        contactName,
        companyName,
        phone: phone || null,
        role: 'viewer', // Default role for claimed accounts
        status: 'active',
        emailVerified: true, // Mark as verified since they're using a valid link
        onboardingCompleted: true, // Skip onboarding for claimed accounts
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      // Transfer the order to the new account
      const [updatedOrder] = await tx.update(orders)
        .set({
          accountId: accountId,
          shareToken: null, // Revoke the share token after claiming
          shareExpiresAt: null,
          updatedAt: new Date(),
          accountNotes: `Order claimed via share link on ${new Date().toISOString()}`
        })
        .where(eq(orders.id, order.id))
        .returning();

      return NextResponse.json({
        success: true,
        message: 'Account created and order claimed successfully',
        account: {
          id: newAccount.id,
          email: newAccount.email,
          companyName: newAccount.companyName
        },
        orderId: updatedOrder.id
      });
    });

  } catch (error: any) {
    console.error('Error claiming order:', error);
    
    // Return appropriate error message
    if (error.message.includes('expired')) {
      return NextResponse.json({ error: error.message }, { status: 410 });
    }
    if (error.message.includes('already exists')) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    
    return NextResponse.json(
      { error: error.message || 'Failed to claim order' },
      { status: 500 }
    );
  }
}