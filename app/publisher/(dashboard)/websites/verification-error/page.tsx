'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  XCircle,
  AlertCircle,
  Clock,
  Mail,
  RefreshCw,
  Home,
  HelpCircle,
  ChevronRight
} from 'lucide-react';

export default function VerificationErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason') || 'unknown';
  const websiteId = searchParams.get('websiteId');

  const errorMessages = {
    invalid_token: {
      title: 'Invalid Verification Token',
      description: 'This verification token is invalid or has already been used.',
      icon: XCircle,
      color: 'red',
      actions: ['request_new', 'contact_support']
    },
    expired: {
      title: 'Verification Link Expired',
      description: 'This verification link has expired. Verification links are valid for 24 hours.',
      icon: Clock,
      color: 'orange',
      actions: ['request_new']
    },
    invalid_link: {
      title: 'Invalid Verification Link',
      description: 'The verification link appears to be incomplete or corrupted.',
      icon: AlertCircle,
      color: 'yellow',
      actions: ['request_new', 'check_email']
    },
    already_verified: {
      title: 'Already Verified',
      description: 'This website has already been verified.',
      icon: XCircle,
      color: 'blue',
      actions: ['view_website', 'dashboard']
    },
    error: {
      title: 'Verification Error',
      description: 'An error occurred while processing your verification. Please try again.',
      icon: AlertCircle,
      color: 'red',
      actions: ['try_again', 'contact_support']
    },
    unknown: {
      title: 'Something Went Wrong',
      description: 'We encountered an unexpected issue with your verification.',
      icon: HelpCircle,
      color: 'gray',
      actions: ['dashboard', 'contact_support']
    }
  };

  const error = errorMessages[reason as keyof typeof errorMessages] || errorMessages.unknown;
  const Icon = error.icon;

  const colorClasses = {
    red: 'bg-red-50 border-red-200 text-red-600',
    orange: 'bg-orange-50 border-orange-200 text-orange-600',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600',
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    gray: 'bg-gray-50 border-gray-200 text-gray-600'
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className={`rounded-lg border-2 p-8 ${colorClasses[error.color as keyof typeof colorClasses]}`}>
          <div className="flex justify-center mb-6">
            <Icon className="w-16 h-16" />
          </div>
          
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-3">
            {error.title}
          </h1>
          
          <p className="text-center text-gray-600 mb-8">
            {error.description}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {error.actions.includes('request_new') && websiteId && (
              <Link
                href={`/publisher/websites/${websiteId}/verification-status`}
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Request New Verification
              </Link>
            )}

            {error.actions.includes('request_new') && !websiteId && (
              <Link
                href="/publisher/websites"
                className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Go to Websites
              </Link>
            )}

            {error.actions.includes('try_again') && (
              <button
                onClick={() => window.location.reload()}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            )}

            {error.actions.includes('view_website') && websiteId && (
              <Link
                href={`/publisher/websites/${websiteId}`}
                className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                View Website
                <ChevronRight className="w-4 h-4 ml-2" />
              </Link>
            )}

            {error.actions.includes('dashboard') && (
              <Link
                href="/publisher/dashboard"
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Link>
            )}

            {error.actions.includes('check_email') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Check Your Email
                </h3>
                <p className="text-sm text-blue-700">
                  Make sure you clicked the complete link from your email. 
                  Sometimes email clients break long links into multiple lines.
                </p>
              </div>
            )}

            {error.actions.includes('contact_support') && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-center text-sm text-gray-600 mb-3">
                  Still having issues?
                </p>
                <Link
                  href="/support"
                  className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div className="mt-6 text-center">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Common Issues:
          </h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Verification links expire after 24 hours</li>
            <li>• Each link can only be used once</li>
            <li>• Check your spam folder for emails</li>
            <li>• Make sure you're logged into the correct account</li>
          </ul>
        </div>
      </div>
    </div>
  );
}