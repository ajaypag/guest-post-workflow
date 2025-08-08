'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuthService, type AuthSession } from '@/lib/auth';

interface AuthWrapperProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function AuthWrapper({ children, requireAdmin = false }: AuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const currentSession = AuthService.getSession();
      
      if (!currentSession) {
        // Get the full current path from window.location if available
        const fullPath = typeof window !== 'undefined' ? window.location.pathname : pathname;
        
        console.log('🔐 AuthWrapper redirect - usePathname():', pathname);
        console.log('🔐 AuthWrapper redirect - window.location.pathname:', typeof window !== 'undefined' ? window.location.pathname : 'N/A');
        console.log('🔐 AuthWrapper redirect - Using fullPath:', fullPath);
        
        // Store in sessionStorage as backup and use URL parameter
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('auth_redirect', fullPath);
        }
        
        const encodedPath = encodeURIComponent(fullPath);
        console.log('🔐 AuthWrapper redirect - Encoded pathname:', encodedPath);
        const redirectUrl = `/login?redirect=${encodedPath}`;
        console.log('🔐 AuthWrapper redirect - Full redirect URL:', redirectUrl);
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