'use client';

import { useEffect, useState } from 'react';
import { 
  Clock, CheckCircle, AlertCircle, User, Calendar,
  FileText, CreditCard, Loader2, RefreshCw
} from 'lucide-react';
import { formatDate } from '@/lib/utils/formatting';

interface OrderStatusColumnProps {
  order: any;
  isNewOrder: boolean;
  session: any;
  onOrderUpdate: (updates: any) => void;
  onNavigate?: (view: string) => void;
}

interface StatusStep {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  status: 'completed' | 'current' | 'pending';
  timestamp?: string;
}

export default function OrderStatusColumn({
  order,
  isNewOrder,
  session,
  onOrderUpdate,
  onNavigate
}: OrderStatusColumnProps) {
  const [refreshing, setRefreshing] = useState(false);
  
  const getStatusSteps = (): StatusStep[] => {
    const steps: StatusStep[] = [
      {
        id: 'submitted',
        label: 'Order Submitted',
        description: 'Your order has been received',
        icon: FileText,
        status: 'completed',
        timestamp: order?.createdAt
      },
      {
        id: 'confirmed',
        label: 'Order Confirmed',
        description: 'Our team is reviewing your requirements',
        icon: CheckCircle,
        status: order?.status === 'pending_confirmation' ? 'current' : 
               ['confirmed', 'sites_ready', 'client_reviewing', 'client_approved', 'paid', 'in_progress', 'completed'].includes(order?.status) ? 'completed' : 'pending',
        timestamp: order?.approvedAt
      },
      {
        id: 'finding_sites',
        label: 'Finding Sites',
        description: 'Researching high-quality sites for your links',
        icon: Clock,
        status: order?.status === 'confirmed' ? 'current' :
               ['sites_ready', 'client_reviewing', 'client_approved', 'paid', 'in_progress', 'completed'].includes(order?.status) ? 'completed' : 'pending'
      },
      {
        id: 'review_sites',
        label: 'Review Sites',
        description: order?.includesClientReview ? 'Sites ready for your approval' : 'Sites selected for your order',
        icon: User,
        status: ['sites_ready', 'client_reviewing'].includes(order?.status) ? 'current' :
               ['client_approved', 'paid', 'in_progress', 'completed'].includes(order?.status) ? 'completed' : 'pending'
      },
      {
        id: 'payment',
        label: 'Payment',
        description: 'Invoice sent for payment',
        icon: CreditCard,
        status: order?.status === 'client_approved' ? 'current' :
               ['paid', 'in_progress', 'completed'].includes(order?.status) ? 'completed' : 'pending',
        timestamp: order?.paidAt
      },
      {
        id: 'creating_content',
        label: 'Creating Content',
        description: 'Writing and publishing your guest posts',
        icon: FileText,
        status: ['paid', 'in_progress'].includes(order?.status) ? 'current' :
               order?.status === 'completed' ? 'completed' : 'pending'
      },
      {
        id: 'completed',
        label: 'Completed',
        description: 'All links delivered',
        icon: CheckCircle,
        status: order?.status === 'completed' ? 'completed' : 'pending',
        timestamp: order?.completedAt
      }
    ];
    
    return steps;
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    // Parent component will handle the actual refresh
    setTimeout(() => setRefreshing(false), 1000);
  };
  
  const steps = getStatusSteps();
  const currentStep = steps.find(s => s.status === 'current');
  
  const getStatusMessage = () => {
    switch (order?.status) {
      case 'pending_confirmation':
        return 'Your order is being reviewed by our team. We\'ll begin finding sites once confirmed.';
      case 'confirmed':
        return 'Our team is researching high-quality sites that match your requirements.';
      case 'sites_ready':
        return order?.includesClientReview 
          ? 'Sites are ready for your review! Please approve the sites to proceed.'
          : 'We\'ve selected sites for your order. Awaiting final confirmation.';
      case 'client_reviewing':
        return 'Thank you for reviewing. Please complete your site selections.';
      case 'client_approved':
        return 'Sites approved! We\'ll send you an invoice shortly.';
      case 'paid':
      case 'in_progress':
        return 'Our writers are creating high-quality content for your guest posts.';
      case 'completed':
        return 'Your order is complete! All guest posts have been published.';
      default:
        return 'Processing your order...';
    }
  };
  
  const getEstimatedTime = () => {
    switch (order?.status) {
      case 'pending_confirmation':
        return 'Within 24 hours';
      case 'confirmed':
        return '2-3 business days';
      case 'sites_ready':
      case 'client_reviewing':
        return 'Waiting for your action';
      case 'client_approved':
        return 'Within 24 hours';
      case 'paid':
      case 'in_progress':
        return order?.rushDelivery ? '5-7 business days' : '10-14 business days';
      default:
        return null;
    }
  };
  
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Order Progress</h2>
          <button
            onClick={handleRefresh}
            className={`p-2 text-gray-600 hover:text-gray-900 ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh status"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {/* Current Status Message */}
        <div className={`rounded-lg p-4 mb-6 ${
          currentStep?.id === 'review_sites' && order?.includesClientReview
            ? 'bg-purple-50 border border-purple-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-start">
            {currentStep && (
              <currentStep.icon className={`h-5 w-5 mr-3 mt-0.5 ${
                currentStep.id === 'review_sites' && order?.includesClientReview
                  ? 'text-purple-600'
                  : 'text-blue-600'
              }`} />
            )}
            <div className="flex-1">
              <p className={`font-medium ${
                currentStep?.id === 'review_sites' && order?.includesClientReview
                  ? 'text-purple-900'
                  : 'text-blue-900'
              }`}>
                {currentStep?.label || 'Processing'}
              </p>
              <p className={`text-sm mt-1 ${
                currentStep?.id === 'review_sites' && order?.includesClientReview
                  ? 'text-purple-700'
                  : 'text-blue-700'
              }`}>
                {getStatusMessage()}
              </p>
              {getEstimatedTime() && (
                <p className={`text-sm mt-2 ${
                  currentStep?.id === 'review_sites' && order?.includesClientReview
                    ? 'text-purple-600'
                    : 'text-blue-600'
                }`}>
                  <Clock className="h-3 w-3 inline mr-1" />
                  Estimated time: {getEstimatedTime()}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isLast = index === steps.length - 1;
            
            return (
              <div key={step.id} className="relative">
                {!isLast && (
                  <div className={`absolute left-4 top-8 bottom-0 w-0.5 ${
                    step.status === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                  }`} />
                )}
                
                <div className="flex items-start">
                  <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                    step.status === 'completed' ? 'bg-green-100' :
                    step.status === 'current' ? 'bg-blue-100' :
                    'bg-gray-100'
                  }`}>
                    {step.status === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : step.status === 'current' ? (
                      refreshing ? (
                        <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                      ) : (
                        <Icon className="h-5 w-5 text-blue-600" />
                      )
                    ) : (
                      <Icon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                  
                  <div className="ml-4 flex-1 pb-8">
                    <p className={`font-medium ${
                      step.status === 'completed' ? 'text-gray-900' :
                      step.status === 'current' ? 'text-blue-900' :
                      'text-gray-500'
                    }`}>
                      {step.label}
                    </p>
                    <p className={`text-sm mt-0.5 ${
                      step.status === 'pending' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      {step.description}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-gray-500 mt-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(step.timestamp)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Action Button for Site Review */}
        {order?.status === 'sites_ready' && order?.includesClientReview && (
          <div className="mt-6">
            <button
              onClick={() => window.location.href = `/account/orders/${order.id}/sites`}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              Review & Approve Sites →
            </button>
          </div>
        )}
      </div>
      
      {/* Footer Info */}
      <div className="border-t p-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          <p className="font-medium text-gray-700 mb-1">Need help?</p>
          <p>Contact our support team if you have any questions about your order.</p>
        </div>
      </div>
    </div>
  );
}