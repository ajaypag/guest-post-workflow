import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { accounts } from '@/lib/db/accountSchema';
import { orderStatusHistory } from '@/lib/db/orderSchema';
import { orderGroups } from '@/lib/db/orderGroupSchema';
import { clients } from '@/lib/db/schema';
import { targetPages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { claimSignupRateLimiter, getClientIp } from '@/lib/utils/rateLimiter';
import { randomBytes } from 'crypto';
import { EmailService } from '@/lib/services/emailService';

// POST - Create account and claim order
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    
    // Rate limiting by IP
    const clientIp = getClientIp(request);
    const rateLimitResult = claimSignupRateLimiter.check(`signup:${clientIp}`);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ 
        error: `Too many signup attempts. Please try again in ${rateLimitResult.retryAfter} seconds.` 
      }, { 
        status: 429,
        headers: {
          'Retry-After': String(rateLimitResult.retryAfter || 900)
        }
      });
    }
    
    const { email, password, contactName } = await request.json();

    // Validate required fields (simplified to match main signup)
    if (!email || !password || !contactName) {
      return NextResponse.json({ 
        error: 'Email, password, and contact name are required' 
      }, { status: 400 });
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json({ 
        error: 'Password must be at least 8 characters' 
      }, { status: 400 });
    }
    
    // Check password complexity (at least one number and one letter)
    if (!/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      return NextResponse.json({ 
        error: 'Password must contain at least one letter and one number' 
      }, { status: 400 });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ 
        error: 'Invalid email format' 
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
      const verificationToken = randomBytes(32).toString('base64url');
      
      const [newAccount] = await tx.insert(accounts).values({
        id: accountId,
        email,
        password: hashedPassword,
        contactName,
        companyName: '', // Will be filled later during onboarding or order processing
        phone: null,
        role: 'viewer', // Default role for claimed accounts
        status: 'pending', // Account pending until email verified
        emailVerified: false, // Require email verification for security
        emailVerificationToken: verificationToken,
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
      
      // Copy associated clients and target pages to the new account
      // This ensures the new account has full access to all order-related data
      const orderGroupsData = await tx.select().from(orderGroups).where(eq(orderGroups.orderId, order.id));
      
      // Track client ID mappings (old -> new) for updating order groups
      const clientIdMap = new Map<string, string>();
      
      for (const group of orderGroupsData) {
        if (group.clientId && !clientIdMap.has(group.clientId)) {
          // Get the original client
          const [originalClient] = await tx.select().from(clients).where(eq(clients.id, group.clientId));
          
          if (originalClient) {
            // Create a copy of the client for the new account
            const newClientId = uuidv4();
            const [newClient] = await tx.insert(clients).values({
              id: newClientId,
              accountId: accountId, // Owned by new account
              name: originalClient.name,
              website: originalClient.website,
              description: originalClient.description || '',
              clientType: originalClient.clientType || 'client',
              createdBy: accountId, // Created by the new account
              defaultRequirements: originalClient.defaultRequirements || '{}',
              createdAt: new Date(),
              updatedAt: new Date()
            }).returning();
            
            clientIdMap.set(group.clientId, newClientId);
            
            // Copy target pages for this client
            const originalTargetPages = await tx.select().from(targetPages).where(eq(targetPages.clientId, group.clientId));
            
            for (const page of originalTargetPages) {
              await tx.insert(targetPages).values({
                id: uuidv4(),
                clientId: newClientId, // Reference the new client
                url: page.url,
                normalizedUrl: page.normalizedUrl,
                domain: page.domain,
                keywords: page.keywords,
                description: page.description,
                status: page.status || 'active',
                addedAt: new Date(),
                completedAt: page.completedAt
              });
            }
          }
        }
      }
      
      // Update order groups to reference the new client IDs
      for (const group of orderGroupsData) {
        if (group.clientId && clientIdMap.has(group.clientId)) {
          await tx.update(orderGroups)
            .set({
              clientId: clientIdMap.get(group.clientId),
              updatedAt: new Date()
            })
            .where(eq(orderGroups.id, group.id));
        }
      }

      // Add audit log entry for order claim
      await tx.insert(orderStatusHistory).values({
        id: uuidv4(),
        orderId: order.id,
        oldStatus: order.status,
        newStatus: order.status, // Status doesn't change, but we log the claim event
        changedBy: accountId, // New account claiming the order
        changedAt: new Date(),
        notes: `Order claimed by ${contactName} (${email}). IP: ${clientIp}. Share token revoked.`
      });

      // Send verification email (after transaction completes)
      try {
        const baseUrl = process.env.NEXTAUTH_URL || request.headers.get('origin') || 'http://localhost:3000';
        const verificationUrl = `${baseUrl}/account/verify-email?token=${verificationToken}`;
        
        await EmailService.send('account_welcome', {
          to: email,
          subject: 'Verify your email to access your order',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to PostFlow!</h2>
              <p>Hi ${contactName},</p>
              <p>Your account has been created and your order has been claimed successfully. To access your order dashboard and track progress, please verify your email address.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">Verify Email Address</a>
              </div>
              <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
              <p style="color: #6b7280; font-size: 14px; word-break: break-all;">${verificationUrl}</p>
              <p style="color: #6b7280; font-size: 14px;">This verification link will expire in 24 hours.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Don't fail the request if email fails, but log it
      }

      return NextResponse.json({
        success: true,
        message: 'Account created and order claimed successfully. Please check your email to verify your account before accessing your order.',
        requiresEmailVerification: true,
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