import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { orders } from '@/lib/db/orderSchema';
import { eq, and, or } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { AuthServiceServer } from '@/lib/auth-server';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { 
      provisionalAccountId,
      email,
      password,
      contactName,
      companyName,
      phone,
      website,
      claimToken, // Optional - for direct invite links
    } = data;

    // Two ways to claim:
    // 1. Internal user converting a provisional account (requires auth)
    // 2. User claiming via signup with matching email or claim token

    const session = await AuthServiceServer.getSession(request);
    const isInternalConversion = session?.userType === 'internal';

    // Find the provisional account
    let provisionalAccount;
    
    if (provisionalAccountId) {
      // Direct ID lookup (for internal conversions)
      [provisionalAccount] = await db.select()
        .from(accounts)
        .where(and(
          eq(accounts.id, provisionalAccountId),
          eq(accounts.status, 'provisional')
        ));
    } else if (email) {
      // Email matching (for signup flow)
      // First check if there's a provisional account with intended email
      const accountsToCheck = await db.select()
        .from(accounts)
        .where(eq(accounts.status, 'provisional'));
      
      // Check internal notes for originalEmail match
      provisionalAccount = accountsToCheck.find(acc => {
        try {
          const metadata = JSON.parse(acc.internalNotes || '{}');
          return metadata.originalEmail === email;
        } catch {
          return false;
        }
      });
      
      // If no match on original email, check company name
      if (!provisionalAccount && companyName) {
        provisionalAccount = accountsToCheck.find(acc => 
          acc.companyName?.toLowerCase() === companyName.toLowerCase()
        );
      }
    } else if (claimToken) {
      // Token-based claiming (for invite links)
      [provisionalAccount] = await db.select()
        .from(accounts)
        .where(and(
          eq(accounts.emailVerificationToken, claimToken),
          eq(accounts.status, 'provisional')
        ));
    }

    if (!provisionalAccount) {
      // No provisional account found - this is fine, just means normal signup
      return NextResponse.json({ 
        success: false,
        message: 'No provisional account to claim'
      });
    }

    // Check if the email is already taken by another account
    if (email && email !== provisionalAccount.email) {
      const [existingAccount] = await db.select()
        .from(accounts)
        .where(eq(accounts.email, email));
      
      if (existingAccount) {
        return NextResponse.json({ 
          error: 'Email already in use by another account' 
        }, { status: 400 });
      }
    }

    // Update provisional account to active
    const hashedPassword = password ? await bcrypt.hash(password, 10) : provisionalAccount.password;
    
    const [updatedAccount] = await db.update(accounts)
      .set({
        email: email || provisionalAccount.email,
        password: hashedPassword,
        contactName: contactName || provisionalAccount.contactName,
        companyName: companyName || provisionalAccount.companyName,
        phone: phone || provisionalAccount.phone,
        website: website || provisionalAccount.website,
        status: 'active',
        emailVerified: true, // Mark as verified since they're claiming
        emailVerificationToken: null, // Clear any tokens
        internalNotes: JSON.stringify({
          ...JSON.parse(provisionalAccount.internalNotes || '{}'),
          claimedAt: new Date().toISOString(),
          claimedBy: isInternalConversion ? session?.userId : 'self',
          conversionMethod: provisionalAccountId ? 'internal' : 
                           claimToken ? 'token' : 
                           'email_match'
        }),
        updatedAt: new Date()
      })
      .where(eq(accounts.id, provisionalAccount.id))
      .returning();

    // Get all orders for this account
    const accountOrders = await db.select()
      .from(orders)
      .where(eq(orders.accountId, provisionalAccount.id));

    return NextResponse.json({ 
      success: true,
      account: {
        ...updatedAccount,
        password: undefined // Don't send password back
      },
      ordersTransferred: accountOrders.length,
      message: `Provisional account successfully claimed. ${accountOrders.length} order(s) now associated with this account.`
    });

  } catch (error: any) {
    console.error('Error claiming provisional account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to claim provisional account' },
      { status: 500 }
    );
  }
}

// GET endpoint to check if an email/company has provisional accounts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const companyName = searchParams.get('company');

    if (!email && !companyName) {
      return NextResponse.json({ 
        error: 'Email or company name required' 
      }, { status: 400 });
    }

    // Find matching provisional accounts
    const provisionalAccounts = await db.query.accounts.findMany({
      where: eq(accounts.status, 'provisional'),
      with: {
        orders: {
          columns: {
            id: true,
            status: true,
            totalRetail: true
          }
        }
      }
    });

    // Filter for matches
    const matches = provisionalAccounts.filter(acc => {
      // Check internal notes for original email
      try {
        const metadata = JSON.parse(acc.internalNotes || '{}');
        if (email && metadata.originalEmail === email) return true;
      } catch {}
      
      // Check company name
      if (companyName && acc.companyName?.toLowerCase() === companyName.toLowerCase()) {
        return true;
      }
      
      return false;
    });

    if (matches.length === 0) {
      return NextResponse.json({ 
        hasProvisional: false 
      });
    }

    // Return info about provisional accounts (without sensitive data)
    return NextResponse.json({ 
      hasProvisional: true,
      accounts: matches.map(acc => ({
        id: acc.id,
        companyName: acc.companyName,
        orderCount: acc.orders?.length || 0,
        totalOrderValue: acc.orders?.reduce((sum, o) => sum + (o.totalRetail || 0), 0) || 0
      }))
    });

  } catch (error: any) {
    console.error('Error checking provisional accounts:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check provisional accounts' },
      { status: 500 }
    );
  }
}