import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users, accounts, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // Note: No longer checking users table for account userType since accounts are in separate table
    const accountUsers: any[] = [];
    
    // Get all accounts
    const allAccounts = await db.query.accounts.findMany();
    
    // Get all clients
    const allClients = await db.query.clients.findMany();
    
    // Check data integrity
    const issues = [];
    const accountUserDetails = [];
    
    for (const user of accountUsers) {
      const account = allAccounts.find(a => a.id === user.id);
      accountUserDetails.push({
        userId: user.id,
        email: user.email,
        hasAccountRecord: !!account,
        primaryClientId: account?.primaryClientId || null,
        clientExists: account?.primaryClientId ? allClients.some(c => c.id === account.primaryClientId) : false
      });
      
      if (!account) {
        issues.push(`User ${user.email} (${user.id}) has userType='account' but no account record`);
      } else if (!account.primaryClientId) {
        issues.push(`Account ${user.email} (${user.id}) has no primaryClientId`);
      } else if (!allClients.some(c => c.id === account.primaryClientId)) {
        issues.push(`Account ${user.email} (${user.id}) has primaryClientId ${account.primaryClientId} but client doesn't exist`);
      }
    }
    
    return NextResponse.json({
      summary: {
        accountUsers: accountUsers.length,
        accountRecords: allAccounts.length,
        totalClients: allClients.length,
        issuesFound: issues.length
      },
      issues,
      accountUserDetails,
      // Show first few records for debugging
      sampleData: {
        users: accountUsers.slice(0, 3),
        accounts: allAccounts.slice(0, 3),
        clients: allClients.slice(0, 3)
      }
    });
  } catch (error) {
    console.error('Error checking account data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}