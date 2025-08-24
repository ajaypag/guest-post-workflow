'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthService, type AuthSession } from '@/lib/auth';

interface InternalPageWrapperProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export default function InternalPageWrapper({ children, requireAdmin = false }: InternalPageWrapperProps) {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const currentSession = AuthService.getSession();
      console.log('🔐 InternalPageWrapper - Checking auth:', {
        hasSession: !!currentSession,
        userType: currentSession?.userType,
        role: currentSession?.role,
        requireAdmin
      });
      
      if (!currentSession) {
        console.log('🔐 InternalPageWrapper - No session, redirecting to login');
        router.push('/login');
        return;
      }
      
      // Redirect account users to their dashboard
      if (currentSession.userType === 'account') {
        console.log('🔐 InternalPageWrapper - Account user, redirecting to dashboard');
        router.push('/account/dashboard');
        return;
      }
      
      if (requireAdmin && currentSession.role !== 'admin') {
        console.log('🔐 InternalPageWrapper - Non-admin user, redirecting to home');
        router.push('/'); // Redirect non-admins away from admin pages
        return;
      }
      
      console.log('🔐 InternalPageWrapper - Auth successful, setting session');
      setSession(currentSession);
      setLoading(false);
    };

    checkAuth();
  }, [router, requireAdmin]);

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

  if (!session || session.userType !== 'internal') {
    console.log('🔐 InternalPageWrapper - Render blocked:', {
      hasSession: !!session,
      userType: session?.userType,
      expected: 'internal'
    });
    return null; // Will redirect
  }

  console.log('🔐 InternalPageWrapper - Rendering children for internal user');
  return <>{children}</>;
}