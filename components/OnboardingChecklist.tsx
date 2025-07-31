'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle,
  Circle,
  User,
  Building,
  FileText,
  Settings,
  Package,
  TrendingUp,
  HelpCircle,
  X,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: string;
  actionLabel: string;
  completed: boolean;
}

interface OnboardingChecklistProps {
  accountId: string;
  onboardingSteps: Record<string, boolean>;
  onClose?: () => void;
  onComplete?: () => void;
}

export default function OnboardingChecklist({ 
  accountId, 
  onboardingSteps = {}, 
  onClose,
  onComplete 
}: OnboardingChecklistProps) {
  const router = useRouter();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Initialize onboarding steps
    const defaultSteps: OnboardingStep[] = [
      {
        id: 'complete_profile',
        title: 'Complete Your Profile',
        description: 'Add your company information and contact details',
        icon: <User className="h-5 w-5" />,
        action: '/account/settings',
        actionLabel: 'Update Profile',
        completed: onboardingSteps.complete_profile || false
      },
      {
        id: 'add_client',
        title: 'Set Up Your Brand',
        description: 'Add your website and target pages for link building',
        icon: <Building className="h-5 w-5" />,
        action: '/clients/new',
        actionLabel: 'Add Brand Info',
        completed: onboardingSteps.add_client || false
      },
      {
        id: 'create_first_order',
        title: 'Create Your First Order',
        description: 'Start your first guest posting campaign',
        icon: <Package className="h-5 w-5" />,
        action: '/orders/new',
        actionLabel: 'Create Order',
        completed: onboardingSteps.create_first_order || false
      },
      {
        id: 'review_domains',
        title: 'Review Available Domains',
        description: 'Explore our network of high-quality publishing sites',
        icon: <TrendingUp className="h-5 w-5" />,
        action: '/domains',
        actionLabel: 'Browse Domains',
        completed: onboardingSteps.review_domains || false
      },
      {
        id: 'read_guidelines',
        title: 'Read Content Guidelines',
        description: 'Understand our quality standards and best practices',
        icon: <FileText className="h-5 w-5" />,
        action: '/help/content-guidelines',
        actionLabel: 'View Guidelines',
        completed: onboardingSteps.read_guidelines || false
      },
      {
        id: 'configure_preferences',
        title: 'Configure Preferences',
        description: 'Set up your notification and delivery preferences',
        icon: <Settings className="h-5 w-5" />,
        action: '/account/settings#preferences',
        actionLabel: 'Set Preferences',
        completed: onboardingSteps.configure_preferences || false
      }
    ];

    setSteps(defaultSteps);
  }, [onboardingSteps]);

  const updateStepStatus = async (stepId: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/accounts/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          stepId,
          completed: true
        })
      });

      if (response.ok) {
        setSteps(prev => 
          prev.map(step => 
            step.id === stepId ? { ...step, completed: true } : step
          )
        );

        // Check if all steps are completed
        const allCompleted = steps.every(s => s.id === stepId || s.completed);
        if (allCompleted && onComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error('Error updating onboarding step:', error);
    } finally {
      setLoading(false);
    }
  };

  const completedCount = steps.filter(s => s.completed).length;
  const totalCount = steps.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-white">
            <Sparkles className="h-6 w-6 mr-2" />
            <h2 className="text-xl font-semibold">Welcome to PostFlow!</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        <p className="text-blue-100 mt-1">
          Complete these steps to get the most out of your account
        </p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Getting Started Progress
          </span>
          <span className="text-sm text-gray-600">
            {completedCount} of {totalCount} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Steps List */}
      <div className="p-6 space-y-4">
        {steps.map((step) => (
          <div 
            key={step.id}
            className={`flex items-start p-4 rounded-lg border transition-all ${
              step.completed 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <div className={`flex-shrink-0 ${
              step.completed ? 'text-green-600' : 'text-gray-400'
            }`}>
              {step.completed ? (
                <CheckCircle className="h-6 w-6" />
              ) : (
                <Circle className="h-6 w-6" />
              )}
            </div>
            
            <div className="ml-4 flex-1">
              <h3 className={`font-medium ${
                step.completed ? 'text-green-900' : 'text-gray-900'
              }`}>
                {step.title}
              </h3>
              <p className={`text-sm mt-1 ${
                step.completed ? 'text-green-700' : 'text-gray-600'
              }`}>
                {step.description}
              </p>
            </div>

            <div className="ml-4 flex-shrink-0">
              {!step.completed && (
                <button
                  onClick={() => {
                    updateStepStatus(step.id);
                    router.push(step.action);
                  }}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {step.actionLabel}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {progressPercentage === 100 && (
        <div className="px-6 py-4 bg-green-50 border-t border-green-200">
          <div className="flex items-center text-green-800">
            <CheckCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">
              Congratulations! You've completed all onboarding steps.
            </span>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-gray-600">
            <HelpCircle className="h-5 w-5 mr-2" />
            <span className="text-sm">
              Need help getting started?
            </span>
          </div>
          <a 
            href="/help"
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Visit Help Center
          </a>
        </div>
      </div>
    </div>
  );
}