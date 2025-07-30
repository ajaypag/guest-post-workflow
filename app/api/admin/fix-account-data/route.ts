import { NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { users, accounts, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  try {
    const fixes = [];
    const errors = [];
    
    // Get all users with account userType
    const accountUsers = await db.query.users.findMany({
      where: eq(users.userType, 'account'),
    });
    
    // Get all existing accounts
    const existingAccounts = await db.query.accounts.findMany();
    const existingAccountIds = new Set(existingAccounts.map(a => a.id));
    
    // Get all clients
    const allClients = await db.query.clients.findMany();
    
    // For each account user, ensure they have an account record
    for (const user of accountUsers) {
      if (!existingAccountIds.has(user.id)) {
        try {
          // Try to find a client that might be associated with this user
          // This is a heuristic - you might need to adjust based on your data
          const possibleClient = allClients.find(c => 
            c.name?.toLowerCase().includes(user.email.split('@')[0].toLowerCase()) ||
            user.email.includes(c.name?.toLowerCase() || '')
          );
          
          // Create account record
          await db.insert(accounts).values({
            id: user.id, // Use same ID as user for consistency
            email: user.email,
            password: 'temp-password-needs-reset', // Temporary password
            contactName: user.name,
            companyName: possibleClient?.name || 'Unknown Company',
            primaryClientId: possibleClient?.id || null,
            status: 'active',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          fixes.push({
            action: 'created_account',
            userId: user.id,
            email: user.email,
            associatedClientId: possibleClient?.id || null,
            associatedClientName: possibleClient?.name || null
          });
        } catch (error) {
          errors.push({
            userId: user.id,
            email: user.email,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    // Now check if all accounts have valid primaryClientId
    const updatedAccounts = await db.query.accounts.findMany();
    for (const account of updatedAccounts) {
      if (!account.primaryClientId) {
        // Try to find or create a client for this account
        const existingClient = allClients.find(c => 
          c.name?.toLowerCase().includes(account.email.split('@')[0].toLowerCase()) ||
          account.email.includes(c.name?.toLowerCase() || '')
        );
        
        if (existingClient) {
          await db.update(accounts)
            .set({ 
              primaryClientId: existingClient.id,
              updatedAt: new Date()
            })
            .where(eq(accounts.id, account.id));
            
          fixes.push({
            action: 'linked_to_existing_client',
            accountId: account.id,
            email: account.email,
            clientId: existingClient.id,
            clientName: existingClient.name
          });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        accountUsersProcessed: accountUsers.length,
        fixesApplied: fixes.length,
        errorsEncountered: errors.length
      },
      fixes,
      errors
    });
  } catch (error) {
    console.error('Error fixing account data:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}