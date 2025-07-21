import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import WorkflowList from '@/components/WorkflowList';

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
              {/* DEBUG: Check if new routes exist */}
              <div className="mt-4 p-4 bg-yellow-100 border border-yellow-300 rounded">
                <p className="text-sm font-bold">DEBUG - Test Links:</p>
                <a href="/bulk-qualification" className="text-blue-600 underline mr-4">Bulk Qualification</a>
                <a href="/debug-route" className="text-blue-600 underline mr-4">Debug Route</a>
                <a href="/bulk-test" className="text-blue-600 underline">Bulk Test</a>
              </div>
            </div>
          </div>
          
          <WorkflowList />
        </main>
      </div>
    </AuthWrapper>
  );
}