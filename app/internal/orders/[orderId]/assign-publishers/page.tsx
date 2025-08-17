import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { orders } from '@/lib/db/orderSchema';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { publishers, websites } from '@/lib/db/schema';
import { publisherOfferingRelationships } from '@/lib/db/publisherSchemaActual';
import { eq, and, sql } from 'drizzle-orm';
// import PublisherAssignmentForm from '@/components/internal/PublisherAssignmentForm';

interface PageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export default async function AssignPublishersPage({ params }: PageProps) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'internal') {
    redirect('/login');
  }

  const { orderId } = await params;

  // Get order details
  const order = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order[0]) {
    redirect('/internal/orders');
  }

  // Get unassigned line items for this order
  const lineItems = await db
    .select({
      lineItem: orderLineItems,
    })
    .from(orderLineItems)
    .where(
      and(
        eq(orderLineItems.orderId, orderId),
        sql`${orderLineItems.publisherId} IS NULL`
      )
    );

  // Get available publishers with their websites
  const availablePublishers = await db
    .select({
      publisher: publishers,
      relationshipCount: sql<number>`COUNT(DISTINCT ${publisherOfferingRelationships.websiteId})`,
    })
    .from(publishers)
    .leftJoin(
      publisherOfferingRelationships,
      and(
        eq(publisherOfferingRelationships.publisherId, publishers.id),
        eq(publisherOfferingRelationships.isActive, true)
      )
    )
    .where(eq(publishers.status, 'active'))
    .groupBy(publishers.id);

  // Get publisher websites for matching
  const publisherWebsites = await db
    .select({
      publisherId: publisherOfferingRelationships.publisherId,
      website: websites,
    })
    .from(publisherOfferingRelationships)
    .innerJoin(websites, eq(publisherOfferingRelationships.websiteId, websites.id))
    .where(eq(publisherOfferingRelationships.isActive, true));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Assign Publishers to Order #{order[0].id.slice(-8)}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manually assign publishers to handle specific order items
          </p>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <p className="text-gray-600">Publisher assignment functionality will be implemented here.</p>
          <p className="text-sm text-gray-500 mt-2">
            Order ID: {orderId}<br />
            Unassigned Items: {lineItems.length}<br />
            Available Publishers: {availablePublishers.length}
          </p>
        </div>
      </div>
    </div>
  );
}