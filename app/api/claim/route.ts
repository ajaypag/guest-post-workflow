import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { clients } from '@/lib/db/schema';
import { accounts } from '@/lib/db/accountSchema';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { token, email, password, contactName, companyName } = data;
    
    // Validate required fields
    if (!token || !email || !password || !contactName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // Find client with this share token
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.shareToken, token),
        isNull(clients.accountId) // Only claimable if not already claimed
      ),
    });
    
    if (!client) {
      return NextResponse.json({ error: 'Invalid or already claimed token' }, { status: 404 });
    }
    
    // Check if account with this email already exists
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
      contactName,
      companyName: companyName || client.name,
      primaryClientId: client.id,
      status: 'active',
      emailVerified: true, // Auto-verify since they came from share link
      createdAt: now,
      updatedAt: now,
    });
    
    // Update client to link to new account
    await db.update(clients)
      .set({
        accountId: accountId,
        // Clear the share token so it can't be used again
        shareToken: null,
      })
      .where(eq(clients.id, client.id));
    
    // Log the claim event
    console.log(`Client ${client.id} claimed by new account ${accountId}`);
    
    return NextResponse.json({
      success: true,
      account: {
        id: accountId,
        email: email.toLowerCase(),
        contactName,
        companyName: companyName || client.name,
      },
      client: {
        id: client.id,
        name: client.name,
      },
    });
  } catch (error) {
    console.error('Error claiming client:', error);
    return NextResponse.json(
      { error: 'Failed to claim client' },
      { status: 500 }
    );
  }
}