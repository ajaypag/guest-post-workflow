'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Clock, CheckCircle, AlertCircle, Search, Users, FileText, ArrowRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
    niche?: string;
  };
  linkCount: number;
  bulkAnalysisProjectId?: string;
  submissions?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
}

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  state?: string;
  createdAt: string;
  approvedAt?: string;
  orderGroups: OrderGroup[];
}

const getStateDisplay = (status: string, state?: string) => {
  if (status === 'draft') return { label: 'Draft', color: 'bg-gray-100 text-gray-700' };
  if (status === 'pending_confirmation') return { label: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-700' };
  if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  if (status === 'completed') return { label: 'Completed', color: 'bg-green-100 text-green-700' };
  
  // For confirmed orders, show the state
  switch (state) {
    case 'analyzing':
      return { label: 'Finding Sites', color: 'bg-blue-100 text-blue-700' };
    case 'site_review':
      return { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
    default:
      return { label: 'Processing', color: 'bg-gray-100 text-gray-700' };
  }
};

const getProgressSteps = (status: string, state?: string) => {
  const steps = [
    { id: 'confirmed', label: 'Order Confirmed', icon: CheckCircle, description: 'Your order has been received' },
    { id: 'analyzing', label: 'Finding Sites', icon: Search, description: 'Our team is identifying suitable sites' },
    { id: 'site_review', label: 'Review Sites', icon: Users, description: 'Site recommendations ready for your review' },
    { id: 'in_progress', label: 'Creating Content', icon: FileText, description: 'Writing and placing your links' },
    { id: 'completed', label: 'Completed', icon: CheckCircle, description: 'All links have been placed' }
  ];
  
  let currentStep = 0;
  if (status === 'confirmed') {
    currentStep = 1;
    if (state === 'analyzing') currentStep = 1;
    if (state === 'site_review') currentStep = 2;
    if (state === 'in_progress') currentStep = 3;
  }
  if (status === 'completed') currentStep = 4;
  
  return { steps, currentStep };
};

export default function OrderStatusPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    fetchOrder();
    // Refresh every 30 seconds
    const interval = setInterval(fetchOrder, 30000);
    return () => clearInterval(interval);
  }, [orderId]);
  
  const fetchOrder = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else if (!order) setLoading(true);
      
      const response = await fetch(`/api/orders/${orderId}`);
      if (!response.ok) throw new Error('Failed to fetch order');
      const data = await response.json();
      
      // Fetch submission counts for each group
      const groupsWithCounts = await Promise.all(
        data.orderGroups.map(async (group: OrderGroup) => {
          try {
            const submissionsRes = await fetch(
              `/api/orders/${orderId}/groups/${group.id}/submissions`
            );
            if (submissionsRes.ok) {
              const submissionsData = await submissionsRes.json();
              return {
                ...group,
                submissions: {
                  total: submissionsData.submissions?.length || 0,
                  pending: submissionsData.submissions?.filter((s: any) => 
                    s.status === 'pending' || s.status === 'submitted'
                  ).length || 0,
                  approved: submissionsData.submissions?.filter((s: any) => 
                    s.status === 'client_approved'
                  ).length || 0,
                  rejected: submissionsData.submissions?.filter((s: any) => 
                    s.status === 'client_rejected'
                  ).length || 0
                }
              };
            }
          } catch (error) {
            console.error('Error fetching submissions:', error);
          }
          return group;
        })
      );
      
      setOrder({ ...data, orderGroups: groupsWithCounts });
    } catch (error) {
      console.error('Error fetching order:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const handleRefresh = () => {
    fetchOrder(true);
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
      </div>
    );
  }
  
  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Order not found</p>
          <Link href="/account/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  const stateDisplay = getStateDisplay(order.status, order.state);
  const { steps, currentStep } = getProgressSteps(order.status, order.state);
  const canReviewSites = order.state === 'site_review' && 
    order.orderGroups.some(g => g.submissions && g.submissions.total > 0);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="text-gray-600 mt-1">
                Created {new Date(order.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${stateDisplay.color}`}>
                {stateDisplay.label}
              </span>
            </div>
          </div>
          
          {/* Progress Steps */}
          <div className="relative">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                
                return (
                  <div key={step.id} className="flex-1 relative">
                    <div className="flex flex-col items-center">
                      <div className={`
                        w-10 h-10 rounded-full flex items-center justify-center
                        ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                      `}>
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      <p className={`mt-2 text-sm font-medium ${
                        isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-gray-500 text-center mt-1 max-w-[120px]">
                        {step.description}
                      </p>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`
                        absolute top-5 left-1/2 w-full h-0.5
                        ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                      `} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        {/* Order Groups Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Client Progress</h2>
          <div className="space-y-4">
            {order.orderGroups.map((group) => (
              <div key={group.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-medium text-gray-900">{group.client.name}</p>
                    <p className="text-sm text-gray-600">{group.linkCount} links required</p>
                  </div>
                  {group.submissions && group.submissions.total > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{group.submissions.approved}</span> / {group.linkCount} approved
                    </div>
                  )}
                </div>
                
                {group.submissions && group.submissions.total > 0 ? (
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm">
                      <span className="text-gray-500">Sites suggested:</span>
                      <span className="font-medium">{group.submissions.total}</span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      {group.submissions.pending > 0 && (
                        <span className="text-yellow-600">
                          {group.submissions.pending} pending review
                        </span>
                      )}
                      {group.submissions.approved > 0 && (
                        <span className="text-green-600">
                          {group.submissions.approved} approved
                        </span>
                      )}
                      {group.submissions.rejected > 0 && (
                        <span className="text-red-600">
                          {group.submissions.rejected} rejected
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    {order.state === 'analyzing' ? 'Analyzing potential sites...' : 'No sites suggested yet'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Actions */}
        {canReviewSites && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Site Recommendations Ready
            </h3>
            <p className="text-blue-700 mb-4">
              Our team has identified potential sites for your review. Please review and approve the sites you'd like to proceed with.
            </p>
            <Link
              href={`/account/orders/${orderId}/sites`}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Review Site Recommendations
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </div>
        )}
        
        {/* Info Messages */}
        {order.status === 'pending_confirmation' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Awaiting Confirmation</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Your order has been submitted and is awaiting confirmation from our team. 
                  We'll begin processing your order within 1 business day.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {order.state === 'analyzing' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">Analysis in Progress</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Our team is currently identifying high-quality sites that match your requirements. 
                  This typically takes 2-3 business days. We'll notify you once sites are ready for review.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {order.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">Order Completed</p>
                <p className="text-sm text-green-700 mt-1">
                  All links have been successfully placed. You can view the final deliverables in your dashboard.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}