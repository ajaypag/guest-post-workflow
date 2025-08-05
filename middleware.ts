import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT secret for verification
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production'
);

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // === EXCLUSIONS - These paths don't need authentication ===
  
  // 1. Public auth endpoints
  if (path.startsWith('/api/auth/') ||
      path.startsWith('/api/accept-invitation') ||
      path === '/api/accounts/signup') {
    return NextResponse.next();
  }
  
  // 2. Webhook endpoints (have their own auth)
  if (path.startsWith('/api/airtable/webhook') ||
      path.startsWith('/api/webhooks/')) {
    return NextResponse.next();
  }
  
  // 3. Health check endpoints
  if (path === '/api/health' || 
      path === '/api/ping') {
    return NextResponse.next();
  }
  
  // === ADMIN PROTECTION ===
  
  // Protect admin API routes (require internal users)
  if (path.startsWith('/api/admin')) {
    try {
      // Get token from cookies or Authorization header
      let token: string | undefined;
      
      // Check cookies first
      const authTokenCookie = request.cookies.get('auth-token');
      const accountTokenCookie = request.cookies.get('auth-token-account');
      token = authTokenCookie?.value || accountTokenCookie?.value;
      
      // If no cookie, check Authorization header
      if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        console.log(`🚫 Admin API access denied - No token: ${path}`);
        return NextResponse.json(
          { error: 'Unauthorized - No authentication token provided' },
          { status: 401 }
        );
      }
      
      // Verify JWT token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Check if user is internal (admin endpoints require internal users)
      const userType = payload.userType || 'internal';
      if (userType !== 'internal') {
        console.log(`🚫 Admin API access denied - Not internal user: ${path}`);
        return NextResponse.json(
          { error: 'Forbidden - Admin endpoints require internal user access' },
          { status: 403 }
        );
      }
      
      // Token is valid and user is internal, continue
      return NextResponse.next();
      
    } catch (error) {
      console.error('Middleware auth error for admin route:', error);
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }
  }
  
  // Protect admin UI pages (require internal users)
  if (path.startsWith('/admin') && !path.startsWith('/admin/login')) {
    try {
      // For UI pages, check cookie authentication
      const authTokenCookie = request.cookies.get('auth-token');
      const accountTokenCookie = request.cookies.get('auth-token-account');
      const token = authTokenCookie?.value || accountTokenCookie?.value;
      
      if (!token) {
        // Redirect to login page
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('redirect', path);
        return NextResponse.redirect(url);
      }
      
      // Verify JWT token
      const { payload } = await jwtVerify(token, JWT_SECRET);
      
      // Check if user is internal
      const userType = payload.userType || 'internal';
      if (userType !== 'internal') {
        // Redirect to unauthorized page
        const url = request.nextUrl.clone();
        url.pathname = '/unauthorized';
        return NextResponse.redirect(url);
      }
      
      // Token is valid and user is internal, continue
      return NextResponse.next();
      
    } catch (error) {
      // Token is invalid or expired, redirect to login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
  }
  
  // === PROTECTED API ENDPOINTS ===
  
  // Protect expensive/dangerous API endpoints (require any authenticated user)
  if (path.startsWith('/api/workflows') ||
      path.startsWith('/api/clients') ||
      path.startsWith('/api/orders') ||
      path.startsWith('/api/bulk-analysis') ||
      path.startsWith('/api/users') ||
      path.startsWith('/api/ai/') ||           // AI endpoints - expensive OpenAI calls
      path.startsWith('/api/email/') ||        // Email endpoints - abuse potential
      path.startsWith('/api/test-openai') ||   // AI testing endpoint
      path.startsWith('/api/airtable/') ||     // Airtable data access
      path.startsWith('/api/dataforseo/') ||   // DataForSEO API calls
      path.startsWith('/api/target-pages/') || // Keyword generation with AI
      (path.startsWith('/api/accounts') && path !== '/api/accounts/signup')) {
    
    try {
      // Get token from cookies or Authorization header
      let token: string | undefined;
      
      // Check cookies first
      const authTokenCookie = request.cookies.get('auth-token');
      const accountTokenCookie = request.cookies.get('auth-token-account');
      token = authTokenCookie?.value || accountTokenCookie?.value;
      
      // If no cookie, check Authorization header
      if (!token) {
        const authHeader = request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7);
        }
      }
      
      if (!token) {
        return NextResponse.json(
          { error: 'Unauthorized - Authentication required' },
          { status: 401 }
        );
      }
      
      // Verify JWT token (any valid user can access these)
      await jwtVerify(token, JWT_SECRET);
      
      // Token is valid, continue
      return NextResponse.next();
      
    } catch (error) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid or expired token' },
        { status: 401 }
      );
    }
  }
  
  // === PROTECTED UI PAGES ===
  
  // Protect account pages (require account users)
  if (path.startsWith('/account') && 
      !path.startsWith('/account/login') &&
      !path.startsWith('/account/forgot-password') &&
      !path.startsWith('/account/reset-password')) {
    try {
      const authTokenCookie = request.cookies.get('auth-token');
      const accountTokenCookie = request.cookies.get('auth-token-account');
      const token = authTokenCookie?.value || accountTokenCookie?.value;
      
      if (!token) {
        const url = request.nextUrl.clone();
        url.pathname = '/account/login';
        url.searchParams.set('redirect', path);
        return NextResponse.redirect(url);
      }
      
      // Verify token
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
      
    } catch (error) {
      const url = request.nextUrl.clone();
      url.pathname = '/account/login';
      url.searchParams.set('redirect', path);
      return NextResponse.redirect(url);
    }
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