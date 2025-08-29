import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // === TEMPORARILY SIMPLIFIED FOR TESTING ===
  // Only check for session cookie existence on critical paths
  
  // Public endpoints - always allow
  const publicPaths = [
    '/api/auth/',
    '/api/health',
    '/api/ping',
    '/api/accept-invitation',
    '/api/accounts/vetted-analysis-signup',
    '/api/orders/claim/',
    '/api/publisher/claim',
    '/api/publisher/websites/verify-click',  // Email verification links must work without auth
    '/api/airtable/webhook',
    '/api/webhooks/'
  ];
  
  // Check if path is public
  for (const publicPath of publicPaths) {
    if (path.startsWith(publicPath) || path === publicPath) {
      return NextResponse.next();
    }
  }
  
  // === SESSION CHECK HELPER ===
  // Just check if session cookie exists - actual validation happens in API routes
  function hasSession(request: NextRequest): boolean {
    const sessionCookie = request.cookies.get('auth-session');
    const authCookie = request.cookies.get('auth-token');
    const accountCookie = request.cookies.get('auth-token-account'); 
    const publisherCookie = request.cookies.get('auth-token-publisher');
    
    // Check Authorization header as well
    const authHeader = request.headers.get('authorization');
    const hasBearer = authHeader?.startsWith('Bearer ');
    
    return !!(sessionCookie?.value || authCookie?.value || accountCookie?.value || publisherCookie?.value || hasBearer);
  }
  
  // === ADMIN PROTECTION ===
  
  // Protect admin API routes
  if (path.startsWith('/api/admin') || 
      path === '/api/security-scan' ||
      path === '/api/setup-db' ||
      path === '/api/fix-schema' ||
      path === '/api/fix-workflows-schema' ||
      path === '/api/database-checker' ||
      path === '/api/test-workflow-insert' ||
      path === '/api/check-table-structure' ||
      path === '/api/debug-users' ||
      path === '/api/debug' ||
      path === '/api/migrate') {
    
    if (!hasSession(request)) {
      console.log(`🚫 Admin API access denied - No session: ${path}`);
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Actual permission check happens in the API route
    return NextResponse.next();
  }
  
  // Protect admin UI pages
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    if (!hasSession(request)) {
      // Redirect to login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }
  
  // === PUBLISHER PROTECTED PAGES ===
  if (path.startsWith('/publisher') && 
      !path.startsWith('/publisher/login') && 
      !path.startsWith('/publisher/signup') &&
      !path.startsWith('/publisher/verify') &&
      !path.startsWith('/publisher/verification-error') &&  // Email verification error page must be public
      !path.startsWith('/publisher/claim') &&
      !path.startsWith('/publisher/forgot-password') &&
      !path.startsWith('/publisher/reset-password')) {
    
    if (!hasSession(request)) {
      // Redirect to publisher login page
      const url = request.nextUrl.clone();
      url.pathname = '/publisher/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }

  // === ACCOUNT PROTECTED PAGES ===
  if ((path === '/account' || path.startsWith('/account/')) && 
      !path.startsWith('/account/login') && 
      !path.startsWith('/account/signup') &&
      !path.startsWith('/account/forgot-password') &&
      !path.startsWith('/account/reset-password')) {
    
    if (!hasSession(request)) {
      // Redirect to main login page
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
    
    return NextResponse.next();
  }

  // === PUBLISHER API ENDPOINTS ===
  if (path.startsWith('/api/publisher/') && 
      !path.startsWith('/api/auth/publisher/')) {
    
    if (!hasSession(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - No authentication token provided' },
        { status: 401 }
      );
    }
    
    return NextResponse.next();
  }

  // === PROTECTED API ENDPOINTS ===
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
      (path.startsWith('/api/accounts') && path !== '/api/accounts/vetted-analysis-signup')) {
    
    if (!hasSession(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }
    
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