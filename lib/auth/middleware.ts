import { NextRequest, NextResponse } from 'next/server';
import { AuthServiceServer } from '@/lib/auth-server';
import { db } from '@/lib/db/connection';
import { clients, orders, accounts } from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';

export type UserType = 'internal' | 'account';

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  userType: UserType;
  accountId?: string;
}

/**
 * Auth middleware that checks if user is authenticated
 */
export async function requireAuth(request: NextRequest) {
  const session = await AuthServiceServer.getSession(request);
  
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  return session as AuthUser;
}

/**
 * Middleware that requires internal user access
 */
export async function requireInternalUser(request: NextRequest) {
  const session = await requireAuth(request);
  
  if (session instanceof NextResponse) {
    return session;
  }
  
  if (session.userType !== 'internal') {
    return NextResponse.json(
      { error: 'This action requires internal user access' },
      { status: 403 }
    );
  }
  
  return session;
}

/**
 * Middleware that requires account user access
 */
export async function requireAccountUser(request: NextRequest) {
  const session = await requireAuth(request);
  
  if (session instanceof NextResponse) {
    return session;
  }
  
  if (session.userType !== 'account') {
    return NextResponse.json(
      { error: 'This action requires account user access' },
      { status: 403 }
    );
  }
  
  return session;
}

/**
 * Check if user has access to a specific client
 */
export async function canAccessClient(userId: string, userType: UserType, clientId: string): Promise<boolean> {
  // Internal users can access all clients
  if (userType === 'internal') {
    return true;
  }
  
  // Account users can only access their own clients
  const client = await db.query.clients.findFirst({
    where: and(
      eq(clients.id, clientId),
      eq(clients.accountId, userId)
    )
  });
  
  return !!client;
}

/**
 * Check if user can edit/delete a specific client
 */
export async function canModifyClient(userId: string, userType: UserType, clientId: string): Promise<boolean> {
  // For now, same as access - but we might want different rules later
  return canAccessClient(userId, userType, clientId);
}

/**
 * Check if user has access to a specific order
 */
export async function canAccessOrder(userId: string, userType: UserType, orderId: string): Promise<boolean> {
  // Internal users can access all orders
  if (userType === 'internal') {
    return true;
  }
  
  // Account users can access orders that belong to their account
  const order = await db.query.orders.findFirst({
    where: eq(orders.id, orderId)
  });
  
  if (!order) {
    return false;
  }
  
  // Check if the order's accountId matches the user's ID
  return order.accountId === userId;
}

/**
 * Check if user has access to a specific account
 */
export async function canAccessAccount(userId: string, userType: UserType, accountId: string): Promise<boolean> {
  // Internal users can access all accounts
  if (userType === 'internal') {
    return true;
  }
  
  // Account users can only access their own account
  return userId === accountId;
}

/**
 * Get client access filter for database queries
 */
export function getClientAccessFilter(userId: string, userType: UserType) {
  if (userType === 'internal') {
    // Internal users see all clients
    return undefined;
  }
  
  // Account users only see their own clients
  return eq(clients.accountId, userId);
}

/**
 * Get order access filter for database queries
 */
export function getOrderAccessFilter(userId: string, userType: UserType) {
  if (userType === 'internal') {
    // Internal users see all orders
    return undefined;
  }
  
  // Account users only see orders for their clients
  // This requires a join with clients table in the query
  return eq(clients.accountId, userId);
}

/**
 * Middleware wrapper for API routes that checks permissions
 */
export function withAuth(
  handler: (req: NextRequest, context: any, user: AuthUser) => Promise<NextResponse>,
  options?: {
    requireInternal?: boolean;
    requireAccount?: boolean;
  }
) {
  return async (req: NextRequest, context: any) => {
    const session = await requireAuth(req);
    
    if (session instanceof NextResponse) {
      return session;
    }
    
    // Check user type requirements
    if (options?.requireInternal && session.userType !== 'internal') {
      return NextResponse.json(
        { error: 'This action requires internal user access' },
        { status: 403 }
      );
    }
    
    if (options?.requireAccount && session.userType !== 'account') {
      return NextResponse.json(
        { error: 'This action requires account user access' },
        { status: 403 }
      );
    }
    
    return handler(req, context, session);
  };
}