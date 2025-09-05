import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ImpersonationMiddleware } from '@/lib/middleware/impersonationMiddleware';
import { SessionManager } from '@/lib/services/sessionManager';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // === IMPERSONATION MIDDLEWARE - Run first for all API routes ===
  if (path.startsWith('/api/')) {
    const impersonationResponse = await ImpersonationMiddleware.handle(request);
    if (impersonationResponse) {
      // Action was restricted during impersonation
      return impersonationResponse;
    }
  }
  
  // === EXCLUSIONS - These paths don't need authentication ===
  
  // 1. Public auth endpoints
  if (path.startsWith('/api/auth/') ||
      path.startsWith('/api/accept-invitation') ||
      path === '/api/accounts/signup') {
    return NextResponse.next();
  }
  
  // 2. Public claim endpoints for share links
  if (path.startsWith('/api/orders/claim/') ||
      path.startsWith('/api/publisher/claim')) {
    return NextResponse.next();
  }
  
  // 3. Webhook endpoints (have their own auth)
  if (path.startsWith('/api/airtable/webhook') ||
      path.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }
  
  // 4. Health check endpoints
  if (path === '/api/health' || 
      path === '/api/ping') {
    return NextResponse.next();
  }
  
  // === SESSION VALIDATION HELPER ===
  async function validateSession(request: NextRequest): Promise<any | null> {
    try {
      // Get session ID from cookie
      const sessionCookie = request.cookies.get('auth-session');
      const sessionId = sessionCookie?.value;
      
      // If no cookie, check Authorization header
      if (!sessionId) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          const bearerSessionId = authHeader.substring(7);
          return await SessionManager.getSession(bearerSessionId);
        }
        return null;
      }
      
      return await SessionManager.getSession(sessionId);
    } catch (error) {
      console.error('Session validation error:', error);
      return null;
    }
  }
  
  // === ADMIN PROTECTION ===
  
  // Protect admin API routes (require internal users)
  if (path.startsWith('/api/admin') || 
      path === '/api/security-scan' ||
      path === '/api/setup-db' ||
      path === '/api/fix-schema' ||
      path === '/api/fix-workflows-schema' ||
      path === '/api/test-workflow-insert' ||
      path === '/api/check-table-structure' ||
      path === '/api/debug-users' ||
      path === '/api/debug' ||
      path === '/api/migrate') {
    
    const session = await validateSession(request);
    
    if (!session) {
      console.log(`🚫 Admin API access denied - No session: ${path}`);
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Check if user is internal (admin endpoints require internal users)
    // Note: During impersonation, currentUser will be the target user
    // so we need to check if NOT impersonating and is internal, OR is impersonating
    const isAuthorized = 
      (session.currentUser.userType === 'internal' && !session.impersonation?.isActive) ||
      (session.impersonation?.isActive && session.impersonation.adminUser);
    
    if (!isAuthorized) {
      console.log(`🚫 Admin API access denied - Not internal user: ${path}`);
      return NextResponse.json(
        { error: 'Forbidden - Admin endpoints require internal user access' },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  }
  
  // Protect admin UI pages (require internal users)
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    const session = await validateSession(request);
    
    if (!session) {
      // Redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    // Check if user is internal or admin impersonating
    const isAuthorized = 
      (session.currentUser.userType === 'internal' && !session.impersonation?.isActive) ||
      (session.impersonation?.isActive && session.impersonation.adminUser);
    
    if (!isAuthorized) {
      // Redirect to unauthorized page
      const url = request.nextUrl.clone();
      url.pathname = '/unauthorized';
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }
  
  // === PUBLISHER PROTECTED PAGES ===
  // Protect publisher UI pages (require publisher users)
  if (path.startsWith('/publisher') && 
      !path.startsWith('/publisher/login') && 
      !path.startsWith('/publisher/signup') &&
      !path.startsWith('/publisher/verify') &&
      !path.startsWith('/publisher/claim') &&
      !path.startsWith('/publisher/forgot-password') &&
      !path.startsWith('/publisher/reset-password')) {
    
    const session = await validateSession(request);
    
    if (!session) {
      // Redirect to publisher login page
      const url = request.nextUrl.clone();
      url.pathname = '/publisher/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    // Check if user is publisher (or admin impersonating a publisher)
    if (session.currentUser.userType !== 'publisher') {
      // Redirect to publisher login if not a publisher
      const url = request.nextUrl.clone();
      url.pathname = '/publisher/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }

  // === ACCOUNT PROTECTED PAGES ===
  // Protect account UI pages (require account users)
  if ((path === '/account' || path.startsWith('/account/')) && 
      !path.startsWith('/account/login') && 
      !path.startsWith('/account/signup') &&
      !path.startsWith('/account/forgot-password') &&
      !path.startsWith('/account/reset-password')) {
    
    const session = await validateSession(request);
    
    if (!session) {
      // Redirect to main login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    // Check if user is account (or admin impersonating an account)
    if (session.currentUser.userType !== 'account') {
      // Redirect to login if not an account user
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('error', 'unauthorized');
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }

  // === PUBLISHER API ENDPOINTS ===
  // Protect publisher API endpoints (require publisher authentication)
  if (path.startsWith('/api/publisher/') && 
      !path.startsWith('/api/auth/publisher/')) {
    
    const session = await validateSession(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Check if user is publisher (or admin impersonating)
    if (session.currentUser.userType !== 'publisher') {
      return NextResponse.json(
        { error: 'Forbidden - Publisher access required' },
        { status: 403 }
      );
    }
    
    return NextResponse.next();
  }

  // === PROTECTED API ENDPOINTS ===
  
  // Protect expensive/dangerous API endpoints (require any authenticated user)
  if (path.startsWith('/api/workflows') ||
      path.startsWith('/api/clients') ||
      path.startsWith('/api/orders') ||
      path.startsWith('/api/bulk-analysis') ||
      path.startsWith('/api/users') ||
      path.startsWith('/api/ai/') ||
      path.startsWith('/api/email/') ||
      path.startsWith('/api/test-openai') ||
      path.startsWith('/api/airtable/') ||
      path.startsWith('/api/dataforseo/') ||
      path.startsWith('/api/target-pages/') ||
      path.startsWith('/api/contacts/') ||
      path.startsWith('/api/keywords/') ||
      path.startsWith('/api/domains/') ||
      path.startsWith('/api/websites/') ||
      path.startsWith('/api/account/') ||
      path.startsWith('/api/projects/') ||
      (path.startsWith('/api/accounts') && path !== '/api/accounts/signup')) {
    
    const session = await validateSession(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }
    
    // Any valid session can access these
    return NextResponse.next();
  }
  
  // Allow all other requests (public pages, assets, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, robots.txt (static files)
     * - public folder
     * - root page and other public pages
     */
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|public|$).*)',
  ]
};