import { AuthServiceServer } from '@/lib/auth-server';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db/connection';
import { orderLineItems } from '@/lib/db/orderLineItemSchema';
import { orders } from '@/lib/db/orderSchema';
import { clients } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import PublisherOrderAcceptance from '@/components/publisher/PublisherOrderAcceptance';

interface PageProps {
  params: Promise<{
    lineItemId: string;
  }>;
}

export default async function AcceptOrderPage({ params }: PageProps) {
  const session = await AuthServiceServer.getSession();
  
  if (!session || session.userType !== 'publisher') {
    redirect('/publisher/login');
  }

  if (!session.publisherId) {
    redirect('/publisher/login');
  }

  const { lineItemId } = await params;

  // Get the order details
  const orderData = await db
    .select({
      lineItem: orderLineItems,
      order: orders,
      client: clients
    })
    .from(orderLineItems)
    .leftJoin(orders, eq(orderLineItems.orderId, orders.id))
    .leftJoin(clients, eq(orderLineItems.clientId, clients.id))
    .where(
      and(
        eq(orderLineItems.id, lineItemId),
        eq(orderLineItems.publisherId, session.publisherId)
      )
    )
    .limit(1);

  if (!orderData[0]) {
    redirect('/publisher/orders');
  }

  const { lineItem, order, client } = orderData[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PublisherOrderAcceptance
          lineItem={lineItem}
          order={order}
          client={client}
          publisherId={session.publisherId}
        />
      </div>
    </div>
  );
}