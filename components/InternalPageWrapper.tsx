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
      
      if (!currentSession) {
        router.push('/login');
        return;
      }
      
      // Redirect account users to their dashboard
      if (currentSession.userType === 'account') {
        router.push('/account/dashboard');
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
    return null; // Will redirect
  }

  return <>{children}</>;
}