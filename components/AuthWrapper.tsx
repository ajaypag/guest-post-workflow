'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService, type AuthSession } from '@/lib/auth';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  debugId?: string; // Add optional debug ID to identify which component is calling
}

export default function AuthWrapper({ children, requireAdmin = false, debugId }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const currentSession = AuthService.getSession();
      
      if (!currentSession) {
        // Check if we're already redirecting to login to prevent overwrites
        if (typeof window !== 'undefined' && window.location.pathname === '/login') {
          console.log(`🔐 AuthWrapper [${debugId || 'unknown'}] - Already redirecting to login, skipping`);
          return;
        }
        
        // Check if a redirect is already stored (another component already initiated redirect)
        const existingRedirect = typeof window !== 'undefined' ? sessionStorage.getItem('auth_redirect') : null;
        if (existingRedirect && existingRedirect.length > pathname.length) {
          console.log(`🔐 AuthWrapper [${debugId || 'unknown'}] - Better redirect already exists (${existingRedirect}), skipping`);
          return;
        }
        
        // Use usePathname() since it has the correct full path!
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - usePathname():`, pathname);
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - window.location.pathname:`, typeof window !== 'undefined' ? window.location.pathname : 'N/A');
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - window.location.href:`, typeof window !== 'undefined' ? window.location.href : 'N/A');
        
        // Check if pathname looks incomplete - if so, try to get full path
        let finalPath = pathname;
        if (typeof window !== 'undefined' && pathname === '/orders' && window.location.href.includes('/orders/')) {
          // Extract the full path from the browser URL
          const url = new URL(window.location.href);
          finalPath = url.pathname;
          console.log(`🔐 AuthWrapper [${debugId || 'unknown'}] - Detected incomplete pathname, using href path:`, finalPath);
        }
        
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - Final path to use:`, finalPath);
        
        // Store in sessionStorage as backup and use URL parameter
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth_redirect', finalPath);
        }
        
        const encodedPath = encodeURIComponent(finalPath);
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - Encoded pathname:`, encodedPath);
        const redirectUrl = `/login?redirect=${encodedPath}`;
        console.log(`🔐 AuthWrapper redirect [${debugId || 'unknown'}] - Full redirect URL:`, redirectUrl);
        router.push(redirectUrl);
        return;
      }
      
      if (requireAdmin && currentSession.role !== 'admin') {
        router.push('/'); // Redirect non-admins away from admin pages
        return;
      }
      
      setSession(currentSession);
      setLoading(false);
    };

    checkAuth();
  }, [router, requireAdmin, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect to login
  }

  return <>{children}</>;
}