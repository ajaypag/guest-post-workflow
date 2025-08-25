'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, Clock, XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

export default function VerificationErrorPage() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const errorMessages = {
    invalid_link: {
      title: 'Invalid Verification Link',
      message: 'The verification link appears to be invalid or corrupted. Please request a new verification email.',
      icon: XCircle,
      color: 'text-red-600'
    },
    invalid_token: {
      title: 'Invalid or Used Token',
      message: 'This verification token is invalid or has already been used. Please request a new verification.',
      icon: AlertCircle,
      color: 'text-orange-600'
    },
    expired: {
      title: 'Verification Link Expired',
      message: 'This verification link has expired. Verification links are valid for 24 hours. Please request a new one.',
      icon: Clock,
      color: 'text-yellow-600'
    },
    error: {
      title: 'Verification Error',
      message: 'An error occurred while verifying your website. Please try again or contact support.',
      icon: AlertCircle,
      color: 'text-red-600'
    }
  };

  const errorInfo = errorMessages[reason as keyof typeof errorMessages] || errorMessages.error;
  const Icon = errorInfo.icon;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 ${errorInfo.color} bg-opacity-10 rounded-full mb-4`}>
            <Icon className={`h-8 w-8 ${errorInfo.color}`} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {errorInfo.title}
          </h1>
          
          <p className="text-gray-600 mb-8">
            {errorInfo.message}
          </p>
          
          <div className="space-y-3">
            <Link
              href="/publisher/websites"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Go to My Websites
            </Link>
            
            <Link
              href="/publisher"
              className="inline-flex items-center justify-center w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 text-center">
            Need help? Contact support at{' '}
            <a href="mailto:support@linkio.com" className="text-blue-600 hover:underline">
              support@linkio.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}