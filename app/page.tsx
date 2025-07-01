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
                Manage multiple campaigns with our 15-step automated process.
              </p>
            </div>
            
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-blue-500 rounded-md"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">15 Steps</h3>
                <p className="text-gray-600 text-sm">Comprehensive workflow process</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-emerald-500 rounded-md"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">Auto-Save</h3>
                <p className="text-gray-600 text-sm">Never lose your progress</p>
              </div>
              
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <div className="w-6 h-6 bg-purple-500 rounded-md"></div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">AI-Powered</h3>
                <p className="text-gray-600 text-sm">GPT integration for content</p>
              </div>
            </div>
          </div>
          
          <WorkflowList />
        </main>
      </div>
    </AuthWrapper>
  );
}