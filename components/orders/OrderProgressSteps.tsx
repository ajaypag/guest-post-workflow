'use client';

import { CheckCircle, Search, Users, CreditCard, FileText } from 'lucide-react';

interface OrderProgressStepsProps {
  orderStatus: string;
  orderState?: string;
  className?: string;
}

interface Step {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const PROGRESS_STEPS: Step[] = [
  { 
    id: 'confirmed', 
    label: 'Order Confirmed', 
    icon: CheckCircle, 
    description: 'Your order has been received' 
  },
  { 
    id: 'analyzing', 
    label: 'Finding Sites', 
    icon: Search, 
    description: 'Our team is identifying suitable sites' 
  },
  { 
    id: 'site_review', 
    label: 'Review Sites', 
    icon: Users, 
    description: 'Site recommendations ready for your review' 
  },
  { 
    id: 'invoicing', 
    label: 'Invoicing', 
    icon: CreditCard, 
    description: 'Payment processing and confirmation' 
  },
  { 
    id: 'in_progress', 
    label: 'Content & Submission', 
    icon: FileText, 
    description: 'Creating content and submitting to sites' 
  },
  { 
    id: 'completed', 
    label: 'Completed', 
    icon: CheckCircle, 
    description: 'All links have been placed' 
  }
];

export function getProgressSteps(status: string, state?: string) {
  let currentStep = 0;
  
  // Handle different status/state combinations
  if (status === 'draft') {
    currentStep = -1; // Not started
  } else if (status === 'pending_confirmation') {
    currentStep = 0; // At confirmation step
  } else if (status === 'confirmed') {
    currentStep = 1; // Default to confirmed
    
    // Check the state for more specific progress
    if (state === 'analyzing' || state === 'finding_sites') {
      currentStep = 1;
    } else if (state === 'site_review' || state === 'sites_ready' || state === 'client_reviewing') {
      currentStep = 2;
    } else if (state === 'payment_pending') {
      currentStep = 3;
    } else if (state === 'payment_received' || state === 'workflows_generated' || state === 'in_progress') {
      currentStep = 4;
    }
  } else if (status === 'paid') {
    // Order has been paid, move to content & submission
    currentStep = 4;
    if (state === 'payment_received' || state === 'workflows_generated') {
      currentStep = 4;
    } else if (state === 'in_progress') {
      currentStep = 4;
    }
  } else if (status === 'in_progress') {
    currentStep = 4;
  } else if (status === 'completed') {
    currentStep = 5;
  }
  
  return { steps: PROGRESS_STEPS, currentStep };
}

export function getStateDisplay(status: string, state?: string) {
  if (status === 'draft') return { label: 'Draft', color: 'bg-gray-100 text-gray-700' };
  if (status === 'pending_confirmation') return { label: 'Awaiting Confirmation', color: 'bg-yellow-100 text-yellow-700' };
  if (status === 'cancelled') return { label: 'Cancelled', color: 'bg-red-100 text-red-700' };
  if (status === 'completed') return { label: 'Completed', color: 'bg-green-100 text-green-700' };
  
  // For confirmed/paid orders, show the state
  switch (state) {
    case 'analyzing':
    case 'finding_sites':
      return { label: 'Finding Sites', color: 'bg-blue-100 text-blue-700' };
    case 'site_review':
    case 'sites_ready':
    case 'client_reviewing':
      return { label: 'Ready for Review', color: 'bg-purple-100 text-purple-700' };
    case 'payment_pending':
      return { label: 'Awaiting Payment', color: 'bg-orange-100 text-orange-700' };
    case 'payment_received':
      return { label: 'Payment Received', color: 'bg-green-100 text-green-700' };
    case 'workflows_generated':
      return { label: 'Preparing Content', color: 'bg-indigo-100 text-indigo-700' };
    case 'in_progress':
      return { label: 'In Progress', color: 'bg-yellow-100 text-yellow-700' };
    default:
      return { label: 'Processing', color: 'bg-gray-100 text-gray-700' };
  }
}

export default function OrderProgressSteps({ 
  orderStatus, 
  orderState,
  className = ''
}: OrderProgressStepsProps) {
  const { steps, currentStep } = getProgressSteps(orderStatus, orderState);
  
  return (
    <div className={`relative ${className}`}>
      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step.id} className="relative">
              <div className="flex items-start gap-3">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors
                  ${isCompleted ? 'bg-green-500' : isCurrent ? 'bg-blue-500' : 'bg-gray-300'}
                `}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${
                    isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {step.description}
                  </p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  absolute left-4 top-8 w-0.5 h-8 transition-colors
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}