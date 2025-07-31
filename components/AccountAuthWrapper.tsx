'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AccountUser {
  id: string;
  email: string;
  name: string;
  companyName?: string;
  userType: 'account';
  clientId?: string;
}

interface AccountAuthWrapperProps {
  children: React.ReactNode | ((user: AccountUser, logout: () => Promise<void>) => React.ReactNode);
}

export default function AccountAuthWrapper({ children }: AccountAuthWrapperProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    checkAuth();
    
    // Set up token refresh interval
    const refreshInterval = setInterval(() => {
      refreshTokenIfNeeded();
    }, 5 * 60 * 1000); // Check every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, []);

  const checkAuth = async () => {
    try {
      // Verify authentication via HTTP-only cookie
      const response = await fetch('/api/auth/account/verify', {
        credentials: 'include' // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setAuthenticated(true);
      } else {
        // Not authenticated or token expired
        redirectToLogin();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      redirectToLogin();
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    const currentPath = encodeURIComponent(pathname);
    router.push(`/account/login?redirect=${currentPath}`);
  };
  
  const logout = async () => {
    try {
      const response = await fetch('/api/auth/account/logout', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        // Redirect to login page
        router.push('/account/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  const refreshTokenIfNeeded = async () => {
    try {
      // Try to refresh the token
      // The server will check if refresh is needed based on cookie
      const response = await fetch('/api/auth/account/refresh', {
        method: 'POST',
        credentials: 'include' // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        // Update user data if returned
        if (data.user) {
          setUser(data.user);
        }
      } else if (response.status === 401) {
        // Token expired and can't be refreshed
        redirectToLogin();
      }
    } catch (error) {
      console.error('Token refresh error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null; // Will redirect
  }

  // Pass user context and logout function to children
  if (typeof children === 'function' && user) {
    return <>{children(user, logout)}</>;
  }
  
  // For non-function children, store user data in a data attribute
  return (
    <div data-account-user={JSON.stringify(user)} data-logout-available="true">
      {children as React.ReactNode}
    </div>
  );
}