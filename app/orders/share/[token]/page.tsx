'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, AlertCircle, Clock, Building, Mail, Phone, Globe, DollarSign, Calendar, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface OrderItem {
  id: string;
  domainId: string;
  domainName: string;
  url: string;
  traffic: string;
  dr: number;
  niche: string;
  linkType: string;
  price: number;
  turnaroundTime: string;
  status: string;
}

interface Order {
  id: string;
  clientId: string;
  advertiserId?: string;
  advertiserEmail: string;
  advertiserName: string;
  advertiserCompany?: string;
  status: string;
  subtotalRetail: number;
  discountPercent: string;
  discountAmount: number;
  totalRetail: number;
  includesClientReview: boolean;
  clientReviewFee: number;
  rushDelivery: boolean;
  rushFee: number;
  shareToken?: string;
  shareExpiresAt?: string;
  advertiserNotes?: string;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderSharePage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await fetch(`/api/orders/share/${params.token}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('This order link is invalid or has expired.');
          } else {
            setError('Failed to load order details. Please try again.');
          }
          return;
        }
        const data = await response.json();
        setOrder(data.order);
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (params.token) {
      fetchOrder();
    }
  }, [params.token]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleApprove = async () => {
    if (!order) return;
    
    // If advertiser already has an account, handle approval
    if (order.advertiserId) {
      setApproving(true);
      try {
        const response = await fetch(`/api/orders/share/${params.token}/approve`, {
          method: 'POST',
        });
        if (response.ok) {
          // Redirect to success page or login
          router.push('/auth/login?orderApproved=true');
        } else {
          alert('Failed to approve order. Please try again.');
        }
      } catch (err) {
        console.error('Error approving order:', err);
        alert('Failed to approve order. Please try again.');
      } finally {
        setApproving(false);
      }
    } else {
      // Redirect to signup with order context
      router.push(`/auth/signup/advertiser?token=${params.token}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto p-8">
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Order Link</h2>
            <p className="text-gray-600">{error || 'This order link is invalid or has expired.'}</p>
            <Link href="/" className="mt-6 inline-block text-blue-600 hover:text-blue-800">
              Return to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date();
  const canApprove = order.status === 'pending_approval' && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Guest Post Order Review</h1>
            <span className="text-sm text-gray-500">Order #{order.id.slice(0, 8)}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Status Alert */}
        {isExpired && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">This order link has expired. Please contact your account manager for a new link.</p>
            </div>
          </div>
        )}

        {order.status !== 'pending_approval' && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-blue-800">
                This order has already been {order.status.replace('_', ' ')}. 
                {order.advertiserId && ' Please log in to view the current status.'}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Advertiser Info */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Contact Name</p>
                    <p className="font-medium text-gray-900">{order.advertiserName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{order.advertiserEmail}</p>
                  </div>
                  {order.advertiserCompany && (
                    <div>
                      <p className="text-sm text-gray-600">Company</p>
                      <p className="font-medium text-gray-900">{order.advertiserCompany}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Order Date</p>
                    <p className="font-medium text-gray-900">{formatDate(order.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Guest Post Placements ({order.items.length})
                </h2>
                <div className="space-y-4">
                  {order.items.map((item, index) => (
                    <div key={item.id} className="border-b border-gray-200 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <span className="text-sm text-gray-500 mr-2">#{index + 1}</span>
                            <h3 className="font-medium text-gray-900">{item.domainName}</h3>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Traffic: </span>
                              <span className="font-medium">{item.traffic}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">DR: </span>
                              <span className="font-medium">{item.dr}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Niche: </span>
                              <span className="font-medium">{item.niche}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">TAT: </span>
                              <span className="font-medium">{item.turnaroundTime}</span>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center text-sm">
                            <Globe className="h-4 w-4 text-gray-400 mr-1" />
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                              {item.url}
                            </a>
                          </div>
                        </div>
                        <div className="ml-4 text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(item.price)}</p>
                          <p className="text-sm text-gray-600">{item.linkType}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.advertiserNotes && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Notes</h2>
                  <p className="text-gray-700 whitespace-pre-wrap">{order.advertiserNotes}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({order.items.length} items)</span>
                    <span className="font-medium">{formatCurrency(order.subtotalRetail)}</span>
                  </div>
                  
                  {order.discountAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Discount ({order.discountPercent})</span>
                      <span className="font-medium text-green-600">-{formatCurrency(order.discountAmount)}</span>
                    </div>
                  )}
                  
                  {order.includesClientReview && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Client Review</span>
                      <span className="font-medium">{formatCurrency(order.clientReviewFee)}</span>
                    </div>
                  )}
                  
                  {order.rushDelivery && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rush Delivery</span>
                      <span className="font-medium">{formatCurrency(order.rushFee)}</span>
                    </div>
                  )}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-xl text-gray-900">{formatCurrency(order.totalRetail)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            {canApprove && (
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Ready to proceed?</h2>
                  <div className="space-y-3">
                    <button
                      onClick={handleApprove}
                      disabled={approving}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-3 rounded-md font-medium flex items-center justify-center gap-2"
                    >
                      {approving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          {order.advertiserId ? 'Approve Order' : 'Create Account & Approve'}
                        </>
                      )}
                    </button>
                    
                    <button className="w-full border border-gray-300 hover:bg-gray-50 px-4 py-3 rounded-md font-medium text-gray-700">
                      Request Changes
                    </button>
                  </div>
                  
                  {!order.advertiserId && (
                    <p className="mt-4 text-sm text-gray-600 text-center">
                      Creating an account will allow you to track your order status and manage future orders.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Help */}
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
              <h3 className="font-medium text-gray-900 mb-2">Need Help?</h3>
              <p className="text-sm text-gray-600 mb-3">Contact your account manager for assistance.</p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@example.com</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>1-800-EXAMPLE</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}