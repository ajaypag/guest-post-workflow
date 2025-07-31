import { db } from '@/lib/db/connection';
import { clients, orders } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export type UserType = 'internal' | 'account';

export interface AuthSession {
  userId: string;
  userType: UserType;
  email: string;
  name?: string;
  accountId?: string;
}

/**
 * Check if user can view a specific client
 */
export async function canViewClient(
  session: AuthSession,
  clientId: string
): Promise<boolean> {
  if (session.userType === 'internal') {
    // Internal users can view all clients
    return true;
  }
  
  if (session.userType === 'account') {
    // Account users can only view their own clients
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, clientId),
        eq(clients.accountId, session.userId)
      )
    });
    
    return !!client;
  }
  
  return false;
}

/**
 * Check if user can create a client
 */
export function canCreateClient(
  session: AuthSession,
  creationPath?: string
): boolean {
  if (session.userType === 'internal') {
    // Internal users can create clients with any path
    return true;
  }
  
  if (session.userType === 'account') {
    // Account users can only create clients for themselves
    return creationPath === 'existing_account';
  }
  
  return false;
}

/**
 * Check if user can update a specific client
 */
export async function canUpdateClient(
  session: AuthSession,
  clientId: string,
  updates?: any
): Promise<boolean> {
  if (session.userType === 'internal') {
    // Internal users can update any client
    return true;
  }
  
  if (session.userType === 'account') {
    // Account users can only update their own clients
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, clientId),
        eq(clients.accountId, session.userId)
      )
    });
    
    if (!client) return false;
    
    // Account users cannot change ownership
    if (updates?.accountId && updates.accountId !== session.userId) {
      return false;
    }
    
    return true;
  }
  
  return false;
}

/**
 * Check if user can delete a specific client
 */
export async function canDeleteClient(
  session: AuthSession,
  clientId: string
): Promise<boolean> {
  if (session.userType === 'internal') {
    // Internal users can delete any client
    return true;
  }
  
  if (session.userType === 'account') {
    // Account users can delete their own clients
    const client = await db.query.clients.findFirst({
      where: and(
        eq(clients.id, clientId),
        eq(clients.accountId, session.userId)
      )
    });
    
    return !!client;
  }
  
  return false;
}

/**
 * Check if user can view orders for a client
 */
export async function canViewClientOrders(
  session: AuthSession,
  clientId: string
): Promise<boolean> {
  // Same as viewing the client itself
  return canViewClient(session, clientId);
}

/**
 * Get filter for client queries based on user permissions
 */
export function getClientFilter(session: AuthSession) {
  if (session.userType === 'internal') {
    // No filter for internal users
    return undefined;
  }
  
  if (session.userType === 'account') {
    // Filter to only show account's clients
    return eq(clients.accountId, session.userId);
  }
  
  // Default: no access
  return eq(clients.id, 'none'); // This will match no records
}

/**
 * Sanitize client data based on user permissions
 */
export function sanitizeClientData(
  session: AuthSession,
  client: any
): any {
  if (session.userType === 'internal') {
    // Internal users see all data
    return client;
  }
  
  if (session.userType === 'account') {
    // Account users don't see internal metadata
    const { 
      createdBy,
      shareToken,
      invitationId,
      ...publicData 
    } = client;
    
    return publicData;
  }
  
  return null;
}

/**
 * Get permission capabilities for UI
 */
export function getClientPermissions(session: AuthSession) {
  return {
    canCreate: session.userType === 'internal' || session.userType === 'account',
    canCreateWithInvitation: session.userType === 'internal',
    canCreateWithShareLink: session.userType === 'internal',
    canAssignToAnyAccount: session.userType === 'internal',
    canDeleteAny: session.userType === 'internal',
    canViewOrphaned: session.userType === 'internal',
    userType: session.userType
  };
}