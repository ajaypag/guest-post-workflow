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
        // Simple redirect with current pathname
        const redirectUrl = `/login?redirect=${encodeURIComponent(pathname)}`;
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