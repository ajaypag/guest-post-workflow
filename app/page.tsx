import { redirect } from 'next/navigation';
import { AuthServiceServer } from '@/lib/auth-server';
import Header from '@/components/Header';
import WorkflowListEnhanced from '@/components/WorkflowListEnhanced';
import QuickActions from '@/components/QuickActions';
import HomepageTaskSection from '@/components/HomepageTaskSection';
import MarketingHomepage from '@/app/marketing/page';

export default async function Home() {
  // Check authentication server-side
  const session = await AuthServiceServer.getSession();
  
  // Show marketing homepage for logged-out users
  if (!session) {
    return <MarketingHomepage />;
  }
  
  // Redirect account users to their dashboard
  if (session.userType === 'account') {
    redirect('/account/dashboard');
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
          
          {/* Task Management Section - Replacing AssignedProjectsNotification */}
          <HomepageTaskSection 
            userId={session.userId}
            userName={session.name || 'Internal User'}
            userEmail={session.email}
          />
          
          {/* Quick Actions Pipeline */}
          <QuickActions />
          
          <WorkflowListEnhanced />
        </main>
      </div>
    );
  }

  // Fallback - shouldn't reach here but just in case
  return <MarketingHomepage />;
}