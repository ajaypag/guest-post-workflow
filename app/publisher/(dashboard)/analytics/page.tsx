import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { BarChart3, TrendingUp, Activity, Users } from 'lucide-react';
import Link from 'next/link';

export default async function PublisherAnalyticsPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-600">
          Performance metrics and insights for your websites
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Avg Response</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0h</p>
            </div>
            <Users className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">0%</p>
            </div>
            <BarChart3 className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Analytics Coming Soon</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Detailed analytics and performance insights are being developed. 
          You'll be able to track website performance, order metrics, and revenue trends here.
        </p>
        <Link
          href="/publisher"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}