import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { accounts } from '@/lib/db/accountSchema';
import { clients } from '@/lib/db/schema';
import { eq, isNull, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    
    if (!accountId) {
      // Return all accounts with their client counts
      const accountsWithCounts = await db.execute(sql`
        SELECT 
          a.id,
          a.email,
          a.contact_name,
          a.company_name,
          a.primary_client_id,
          COUNT(c.id) as client_count
        FROM accounts a
        LEFT JOIN clients c ON c.account_id = a.id
        GROUP BY a.id, a.email, a.contact_name, a.company_name, a.primary_client_id
        ORDER BY a.created_at DESC
      `);
      
      return NextResponse.json({ accounts: accountsWithCounts });
    }
    
    // Get specific account
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, accountId),
    });
    
    // Get all clients for this account
    const accountClients = await db.query.clients.findMany({
      where: eq(clients.accountId, accountId),
    });
    
    // Get the primary client if different
    let primaryClient = null;
    if (account?.primaryClientId) {
      primaryClient = await db.query.clients.findFirst({
        where: eq(clients.id, account.primaryClientId),
      });
    }
    
    // Get all clients (to see if they're assigned elsewhere)
    const allClients = await db.query.clients.findMany();
    
    return NextResponse.json({
      account: account ? {
        id: account.id,
        email: account.email,
        name: account.contactName,
        company: account.companyName,
        primaryClientId: account.primaryClientId,
      } : null,
      clientsLinkedToAccount: accountClients.map(c => ({
        id: c.id,
        name: c.name,
        website: c.website,
        accountId: c.accountId,
        createdBy: c.createdBy,
      })),
      primaryClient: primaryClient ? {
        id: primaryClient.id,
        name: primaryClient.name,
        accountId: primaryClient.accountId,
      } : null,
      totalClientsInSystem: allClients.length,
      clientsWithNoAccount: allClients.filter(c => !c.accountId).length,
    });
  } catch (error) {
    console.error('Quick check error:', error);
    return NextResponse.json(
      { error: 'Failed to check', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}