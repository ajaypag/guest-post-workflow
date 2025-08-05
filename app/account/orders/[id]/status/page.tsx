'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2, Clock, CheckCircle, AlertCircle, Search, Users, FileText, ArrowRight, RefreshCw, ExternalLink, BarChart3, Activity, Target, CreditCard } from 'lucide-react';
import Link from 'next/link';
import Header from '@/components/Header';

interface BulkAnalysisProject {
  id: string;
  name: string;
  status: string;
  domainCount: number;
  qualifiedCount: number;
  workflowCount: number;
  createdAt: string;
  analyzedCount: number;
}

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
  bulkAnalysisProject?: BulkAnalysisProject;
  submissions?: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  targetPages?: Array<{
    id: string;
    url: string;
    title?: string;
  }>;
}

interface OrderData {
  id: string;
  accountId: string;
  totalPrice: number;
  status: string;
  state?: string;
  createdAt: string;
  approvedAt?: string;
  invoicedAt?: string;
  orderGroups: OrderGroup[];
  activityTimeline?: Array<{
    id: string;
    type: string;
    description: string;
    createdAt: string;
    metadata?: any;
  }>;
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
    case 'sites_ready':
      return { label: 'Sites Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'site_review':
      return { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'client_reviewing':
      return { label: 'Under Review', color: 'bg-purple-100 text-purple-700' };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
    case 'content_creation':
      return { label: 'Creating Content', color: 'bg-yellow-100 text-yellow-700' };
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
    if (state === 'sites_ready' || state === 'site_review' || state === 'client_reviewing') currentStep = 2;
    if (state === 'in_progress' || state === 'content_creation') currentStep = 3;
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
      
      // Fetch submission counts and project data for each group
      const groupsWithCounts = await Promise.all(
        data.orderGroups.map(async (group: OrderGroup) => {
          let updatedGroup = { ...group };
          
          try {
            // Fetch submissions
            const submissionsRes = await fetch(
              `/api/orders/${orderId}/groups/${group.id}/submissions`
            );
            if (submissionsRes.ok) {
              const submissionsData = await submissionsRes.json();
              updatedGroup.submissions = {
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
              };
            }
            
            // Fetch bulk analysis project data if available
            if (group.bulkAnalysisProjectId) {
              try {
                const projectRes = await fetch(
                  `/api/clients/${group.clientId}/bulk-analysis/projects/${group.bulkAnalysisProjectId}`
                );
                if (projectRes.ok) {
                  const projectData = await projectRes.json();
                  updatedGroup.bulkAnalysisProject = projectData;
                }
              } catch (error) {
                console.error('Error fetching project data:', error);
              }
            }
          } catch (error) {
            console.error('Error fetching submissions:', error);
          }
          
          return updatedGroup;
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
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
        </div>
      </>
    );
  }
  
  if (!order) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Order not found</p>
            <Link href="/account/dashboard" className="mt-4 inline-block text-blue-600 hover:text-blue-700">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </>
    );
  }
  
  const stateDisplay = getStateDisplay(order.status, order.state);
  const { steps, currentStep } = getProgressSteps(order.status, order.state);
  const canReviewSites = (order.state === 'sites_ready' || order.state === 'site_review' || order.state === 'client_reviewing') && 
    order.orderGroups.some(g => g.submissions && g.submissions.total > 0);
  
  return (
    <>
      <Header />
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
              {order.invoicedAt && (
                <button
                  onClick={() => router.push(`/orders/${orderId}/invoice`)}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  View Invoice
                </button>
              )}
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
              <div key={group.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{group.client.name}</p>
                      <p className="text-sm text-gray-600">{group.client.website}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        {group.submissions?.approved || 0} / {group.linkCount}
                      </p>
                      <p className="text-xs text-gray-500">Links Approved</p>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${((group.submissions?.approved || 0) / group.linkCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Submission Stats */}
                  {group.submissions && group.submissions.total > 0 ? (
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-gray-900">{group.submissions.total}</p>
                        <p className="text-xs text-gray-500">Total Sites</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-yellow-600">{group.submissions.pending}</p>
                        <p className="text-xs text-gray-500">Pending</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-green-600">{group.submissions.approved}</p>
                        <p className="text-xs text-gray-500">Approved</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-semibold text-red-600">{group.submissions.rejected}</p>
                        <p className="text-xs text-gray-500">Rejected</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-2">
                      {order.state === 'analyzing' ? 'Analyzing potential sites...' : 'No sites suggested yet'}
                    </p>
                  )}
                  
                  {/* Bulk Analysis Project Info */}
                  {group.bulkAnalysisProject && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <BarChart3 className="w-4 h-4 text-gray-600" />
                            <p className="text-sm font-medium text-gray-900">Bulk Analysis Project</p>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{group.bulkAnalysisProject.name}</p>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div>
                              <p className="text-gray-500">Domains</p>
                              <p className="font-medium">{group.bulkAnalysisProject.domainCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Analyzed</p>
                              <p className="font-medium">{group.bulkAnalysisProject.analyzedCount}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Qualified</p>
                              <p className="font-medium">{group.bulkAnalysisProject.qualifiedCount}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Target Pages */}
                  {group.targetPages && group.targetPages.length > 0 && (
                    <div className="border-t pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-gray-600" />
                        <p className="text-sm font-medium text-gray-900">Target Pages</p>
                      </div>
                      <ul className="text-xs text-gray-600 space-y-1">
                        {group.targetPages.slice(0, 2).map((page, idx) => (
                          <li key={page.id || idx} className="truncate">
                            • {page.url}
                          </li>
                        ))}
                        {group.targetPages.length > 2 && (
                          <li className="text-gray-500">+ {group.targetPages.length - 2} more</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
                
                {/* Action Bar */}
                {group.submissions && group.submissions.pending > 0 && (
                  <div className="bg-blue-50 px-4 py-2 border-t border-blue-100">
                    <Link
                      href={`/orders/${orderId}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
                    >
                      Review pending sites
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          </div>
          
          <div className="space-y-4">
            {/* Order Created */}
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-gray-600" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Order created</p>
                <p className="text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString()}
                </p>
              </div>
            </div>
            
            {/* Order Confirmed */}
            {order.approvedAt && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Order confirmed by team</p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.approvedAt).toLocaleDateString()} at {new Date(order.approvedAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            )}
            
            {/* Analysis Started */}
            {order.state === 'analyzing' && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Search className="w-4 h-4 text-blue-600 animate-pulse" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Site analysis in progress</p>
                  <p className="text-xs text-gray-500">Finding high-quality placement opportunities</p>
                </div>
              </div>
            )}
            
            {/* Sites Ready */}
            {order.state === 'site_review' && order.orderGroups.some(g => g.submissions && g.submissions.total > 0) && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Site recommendations ready</p>
                  <p className="text-xs text-gray-500">
                    {order.orderGroups.reduce((sum, g) => sum + (g.submissions?.total || 0), 0)} sites available for review
                  </p>
                </div>
              </div>
            )}
            
            {/* Content Creation */}
            {order.state === 'in_progress' && (
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-yellow-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Content creation in progress</p>
                  <p className="text-xs text-gray-500">Writing and placing your guest posts</p>
                </div>
              </div>
            )}
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
              href={`/orders/${orderId}`}
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
    </>
  );
}