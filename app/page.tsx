'use client';

import { useEffect, useState } from 'react';
import { AuthService, type AuthSession } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import WorkflowList from '@/components/WorkflowList';
import QuickActions from '@/components/QuickActions';
import AssignedProjectsNotification from '@/components/AssignedProjectsNotification';
import MarketingHomepage from '@/app/marketing/page';

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = () => {
      const currentSession = AuthService.getSession();
      
      if (currentSession) {
        // Redirect account users to their dashboard
        if (currentSession.userType === 'account') {
          router.push('/account/dashboard');
          return;
        }
        
        // Internal users see the dashboard
        if (currentSession.userType === 'internal') {
          setSession(currentSession);
        }
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

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

  // Show marketing homepage for logged-out users
  if (!session) {
    return <MarketingHomepage />;
  }

  // Show internal dashboard for logged-in internal users
  if (session.userType === 'internal') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="mb-8">
            <div className="text-center mb-6">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Guest Post Automation Platform
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Streamline your guest posting workflow from site selection to publication.
              </p>
            </div>
          </div>
          
          {/* Assigned Projects Notification */}
          <AssignedProjectsNotification />
          
          {/* Quick Actions Pipeline */}
          <QuickActions />
          
          <WorkflowList />
        </main>
      </div>
    );
  }

  // Fallback - shouldn't reach here but just in case
  return <MarketingHomepage />;
}