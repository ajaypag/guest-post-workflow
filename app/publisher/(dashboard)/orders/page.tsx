import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import PublisherOrdersList from '@/components/publisher/PublisherOrdersList';

export default async function PublisherOrdersPage() {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    console.error('Publisher session missing publisherId');
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

      {/* Orders List Component */}
      <PublisherOrdersList publisherId={session.publisherId} />
    </div>
  );
}