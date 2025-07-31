import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import WorkflowList from '@/components/WorkflowList';
import QuickActions from '@/components/QuickActions';
import AssignedProjectsNotification from '@/components/AssignedProjectsNotification';

export default function Home() {
  return (
    <AuthWrapper>
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
    </AuthWrapper>
  );
}