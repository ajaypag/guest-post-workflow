import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { AuthServiceServer } from '@/lib/auth-server';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    // Check authentication - only internal users can create provisional accounts
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can create provisional accounts' }, { status: 403 });
    }

    const data = await request.json();
    const { 
      companyName, 
      contactName,
      email, // Optional - if provided, will be used for claiming
      notes 
    } = data;

    // Generate unique provisional email if not provided
    const timestamp = Date.now();
    const provisionalEmail = email || `provisional-${timestamp}@pending.local`;
    
    // Check if email already exists (if a real email was provided)
    if (email) {
      const [existing] = await db.select().from(accounts).where(eq(accounts.email, email));
      if (existing) {
        // If account exists and is provisional, return it
        if (existing.status === 'provisional') {
          return NextResponse.json({ 
            success: true, 
            account: existing,
            message: 'Existing provisional account found'
          });
        }
        // If it's an active account, return error
        return NextResponse.json({ 
          error: 'An active account with this email already exists' 
        }, { status: 400 });
      }
    }

    // Create provisional account
    const accountId = uuidv4();
    const [newAccount] = await db.insert(accounts).values({
      id: accountId,
      email: provisionalEmail,
      password: await bcrypt.hash(`PROVISIONAL_${timestamp}`, 10), // Unusable password
      status: 'provisional',
      contactName: contactName || 'Pending Setup',
      companyName: companyName || 'TBD',
      role: 'viewer', // Default minimal permissions
      emailVerified: false,
      internalNotes: JSON.stringify({
        createdBy: session.userId,
        createdByEmail: session.email,
        createdAt: new Date().toISOString(),
        provisionalNotes: notes || '',
        originalEmail: email || null, // Store the intended email if provided
        claimable: true
      }),
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();

    return NextResponse.json({ 
      success: true, 
      account: newAccount,
      message: 'Provisional account created successfully'
    });

  } catch (error: any) {
    console.error('Error creating provisional account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create provisional account' },
      { status: 500 }
    );
  }
}

// GET endpoint to list provisional accounts
export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (session.userType !== 'internal') {
      return NextResponse.json({ error: 'Only internal users can view provisional accounts' }, { status: 403 });
    }

    // Get all provisional accounts with their order counts
    const provisionalAccounts = await db.query.accounts.findMany({
      where: eq(accounts.status, 'provisional'),
      with: {
        orders: {
          columns: {
            id: true,
            status: true,
            totalRetail: true,
            createdAt: true
          }
        }
      }
    });

    // Format the response
    const formattedAccounts = provisionalAccounts.map(account => {
      let metadata = {};
      try {
        metadata = JSON.parse(account.internalNotes || '{}');
      } catch (e) {
        // Handle non-JSON internal notes
        metadata = { notes: account.internalNotes };
      }

      return {
        id: account.id,
        email: account.email,
        companyName: account.companyName,
        contactName: account.contactName,
        orderCount: account.orders?.length || 0,
        totalOrderValue: account.orders?.reduce((sum, order) => sum + (order.totalRetail || 0), 0) || 0,
        createdAt: account.createdAt,
        metadata,
        isClaimable: !account.email.includes('@pending.local') // Has a real email
      };
    });

    return NextResponse.json({ 
      success: true,
      accounts: formattedAccounts,
      total: formattedAccounts.length
    });

  } catch (error: any) {
    console.error('Error fetching provisional accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch provisional accounts' },
      { status: 500 }
    );
  }
}