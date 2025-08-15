import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import Link from 'next/link';

export default async function PublisherEarningsPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Earnings</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track your earnings and payment history
          </p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium">
          <Download className="h-5 w-5 mr-2" />
          Export
        </button>
      </div>

      {/* Earnings Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">$0.00</div>
          <p className="text-sm text-gray-600 mt-1">Available Balance</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">$0.00</div>
          <p className="text-sm text-gray-600 mt-1">This Month</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900">$0.00</div>
          <p className="text-sm text-gray-600 mt-1">Lifetime Earnings</p>
        </div>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Earnings Dashboard Coming Soon</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          The earnings dashboard is being developed. You'll be able to track payments, 
          view transaction history, and manage your payment methods here.
        </p>
        <Link
          href="/publisher/settings/payments"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Setup Payment Method
        </Link>
      </div>
    </div>
  );
}