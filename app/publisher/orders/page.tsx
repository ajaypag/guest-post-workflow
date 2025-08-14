import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default async function PublisherOrdersPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage and track your content orders
        </p>
      </div>

      {/* Placeholder Content */}
      <div className="bg-white rounded-lg shadow-md p-12 text-center">
        <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Orders Coming Soon</h3>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Order management functionality is being developed. You'll be able to view active orders, 
          track deadlines, and manage content submissions here.
        </p>
        <Link
          href="/publisher"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-900">Order Integration in Progress</h3>
            <p className="text-sm text-blue-700 mt-1">
              We're working on integrating the order system with publisher accounts. 
              This will allow you to see orders for your websites and manage content delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}