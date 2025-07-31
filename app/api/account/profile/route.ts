import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'account') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Get account details
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.accountId!)
    });
    
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      account: {
        id: account.id,
        email: account.email,
        contactName: account.contactName,
        companyName: account.companyName,
        phone: account.phone,
        website: account.website,
        status: account.status,
        createdAt: account.createdAt,
        lastLoginAt: account.lastLoginAt
      }
    });
    
  } catch (error) {
    console.error('Error fetching account profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await AuthServiceServer.getSession(request);
    
    if (!session || session.userType !== 'account') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { contactName, companyName, phone, website } = body;
    
    // Validate website URL if provided
    if (website) {
      try {
        new URL(website);
      } catch {
        return NextResponse.json(
          { error: 'Invalid website URL' },
          { status: 400 }
        );
      }
    }
    
    // Update account
    await db.update(accounts)
      .set({
        contactName,
        companyName,
        phone,
        website,
        updatedAt: new Date()
      })
      .where(eq(accounts.id, session.accountId!));
    
    // Get updated account
    const updatedAccount = await db.query.accounts.findFirst({
      where: eq(accounts.id, session.accountId!)
    });
    
    return NextResponse.json({
      message: 'Account updated successfully',
      account: {
        id: updatedAccount!.id,
        email: updatedAccount!.email,
        contactName: updatedAccount!.contactName,
        companyName: updatedAccount!.companyName,
        phone: updatedAccount!.phone,
        website: updatedAccount!.website
      }
    });
    
  } catch (error) {
    console.error('Error updating account profile:', error);
    return NextResponse.json(
      { error: 'Failed to update account profile' },
      { status: 500 }
    );
  }
}