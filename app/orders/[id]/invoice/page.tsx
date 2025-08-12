'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface InvoiceData {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount: number;
  total: number;
  billingInfo?: {
    name: string;
    company: string;
    email: string;
    address?: string;
  };
}

interface Order {
  id: string;
  status: string;
  state: string;
  invoiceData: InvoiceData;
  paidAt: string | null;
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [orderId]);

  const fetchInvoice = async () => {
    try {
      const response = await fetch(`/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch invoice');
      }
      
      const data = await response.json();
      
      if (!data.invoiceData) {
        throw new Error('Invoice not generated yet');
      }
      
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800 px-4 py-2 min-h-[44px] flex items-center justify-center"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!order || !order.invoiceData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Invoice not found</p>
      </div>
    );
  }

  const invoice = order.invoiceData;
  const isPaid = order.status === 'paid';

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Actions Bar - Hidden in print */}
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Order
          </button>
          
          <div className="flex flex-wrap gap-3 w-full sm:w-auto">
            <button
              onClick={() => window.open(`/api/orders/${orderId}/invoice/download`, '_blank')}
              className="inline-flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors min-h-[44px] flex-1 sm:flex-initial justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition-colors min-h-[44px] flex-1 sm:flex-initial justify-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </button>
            {!isPaid && order.state === 'payment_pending' && (
              <a
                href={`/orders/${orderId}/payment`}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors min-h-[44px] flex-1 sm:flex-initial justify-center"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay Now - {formatCurrency(invoice.total)}
              </a>
            )}
          </div>
        </div>

        {/* Invoice */}
        <div className="bg-white rounded-lg shadow-sm p-8 print:shadow-none">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">INVOICE</h1>
              <p className="text-gray-600">Invoice #{invoice.invoiceNumber}</p>
            </div>
            
            {isPaid && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-semibold">
                PAID
              </div>
            )}
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">From:</h3>
              <p className="text-gray-600">Linkio</p>
              <p className="text-gray-600">Guest Post Services</p>
            </div>
            
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Bill To:</h3>
              {invoice.billingInfo ? (
                <>
                  <p className="text-gray-600">{invoice.billingInfo.name}</p>
                  {invoice.billingInfo.company && (
                    <p className="text-gray-600">{invoice.billingInfo.company}</p>
                  )}
                  <p className="text-gray-600">{invoice.billingInfo.email}</p>
                  {invoice.billingInfo.address && (
                    <p className="text-gray-600">{invoice.billingInfo.address}</p>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No billing information</p>
              )}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 mb-8">
            <div>
              <p className="text-sm text-gray-600">Issue Date</p>
              <p className="font-semibold">{new Date(invoice.issueDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Due Date</p>
              <p className="font-semibold">{new Date(invoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Line Items</h3>
              {invoice.items.map((item, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 flex-1 pr-2">{item.description}</h4>
                    <span className="text-lg font-semibold text-gray-900">{formatCurrency(item.total)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">Quantity:</span> {item.quantity}
                    </div>
                    <div className="text-right">
                      <span className="font-medium">Unit Price:</span> {formatCurrency(item.unitPrice)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 text-sm font-semibold text-gray-900">Description</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900">Qty</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900">Unit Price</th>
                    <th className="text-right py-3 text-sm font-semibold text-gray-900">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="py-3 text-gray-600">{item.description}</td>
                      <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                      <td className="py-3 text-right text-gray-600">{formatCurrency(item.unitPrice)}</td>
                      <td className="py-3 text-right text-gray-900 font-medium">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Subtotal:</span>
                <span className="text-gray-900">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Discount:</span>
                  <span className="text-red-600">-{formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between py-3 border-t border-gray-200 font-semibold">
                <span className="text-gray-900">Total:</span>
                <span className="text-gray-900 text-xl">{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Payment Status */}
          {isPaid && order.paidAt ? (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                Payment received on {new Date(order.paidAt).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="mt-8 pt-8 border-t border-gray-200">
              {order.state === 'payment_pending' ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                  <h3 className="text-lg font-semibold text-green-900 mb-2">Ready for Payment</h3>
                  <p className="text-sm text-green-700 mb-4">
                    Your invoice is ready! Click below to proceed with secure payment.
                  </p>
                  <a
                    href={`/orders/${orderId}/payment`}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors min-h-[44px] justify-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    Pay {formatCurrency(invoice.total)} Now
                  </a>
                  <p className="text-xs text-green-600 mt-2">
                    Secure payment powered by Stripe
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm font-semibold text-blue-900 mb-2">Payment Information</p>
                  <p className="text-sm text-blue-800">
                    Our team will contact you shortly with payment options and instructions. 
                    Payment is due within 2 business days of invoice date.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p>Thank you for your business!</p>
            <p className="mt-2">Questions? Contact us at info@linkio.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}