import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { users, accounts, clients } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await AuthServiceServer.getSession(request);
    
    // Get all data for debugging
    const allUsers = await db.query.users.findMany();
    const allAccounts = await db.query.accounts.findMany();
    const allClients = await db.query.clients.findMany();
    
    // Debug info
    const debugInfo: any = {
      session: session ? {
        userId: session.userId,
        email: session.email,
        role: session.role,
        userType: session.userType
      } : null,
      
      counts: {
        totalUsers: allUsers.length,
        totalAccounts: allAccounts.length,
        totalClients: allClients.length
      },
      
      // Show what would happen in the API
      apiLogic: {
        isAuthenticated: !!session,
        userType: session?.userType,
        wouldCheckAccountTable: session?.userType === 'account',
      }
    };
    
    // If session exists and user is account type, show what would happen
    if (session && session.userType === 'account') {
      const account = await db.query.accounts.findFirst({
        where: eq(accounts.id, session.userId),
      });
      
      debugInfo.apiLogic = {
        ...debugInfo.apiLogic,
        accountFound: !!account,
        accountPrimaryClientId: account?.primaryClientId || null,
        wouldReturnEmptyIfNoAccount: !account || !account.primaryClientId
      };
      
      if (account && account.primaryClientId) {
        const client = allClients.find(c => c.id === account.primaryClientId);
        debugInfo.apiLogic = {
          ...debugInfo.apiLogic,
          clientFound: !!client,
          clientName: client?.name || null
        };
      }
    }
    
    // Show sample data
    debugInfo.samples = {
      users: allUsers.slice(0, 3).map(u => ({
        id: u.id,
        email: u.email,
        role: u.role
      })),
      accounts: allAccounts.slice(0, 3),
      clients: allClients.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        createdBy: c.createdBy
      }))
    };
    
    return NextResponse.json(debugInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}