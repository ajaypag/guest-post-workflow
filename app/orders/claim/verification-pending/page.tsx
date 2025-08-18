'use client';

import { useSearchParams } from 'next/navigation';
import { Mail, CheckCircle, ArrowRight, Clock, Shield } from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import { Suspense } from 'react';

function VerificationPendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const orderId = searchParams.get('orderId') || '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <LinkioHeader variant="default" />
      
      <div className="max-w-2xl mx-auto px-4 py-16">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          
          {/* Main Message */}
          <h1 className="text-3xl font-bold text-gray-900 mb-3">
            Order Claimed Successfully!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Your account has been created and the order has been claimed.
          </p>
          
          {/* Email Verification Box */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-8">
            <Mail className="w-8 h-8 text-blue-600 mx-auto mb-3" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Check Your Email
            </h2>
            <p className="text-gray-700 mb-3">
              We've sent a verification email to:
            </p>
            <p className="text-lg font-medium text-blue-600 mb-4">
              {email}
            </p>
            <p className="text-sm text-gray-600">
              Click the link in the email to verify your account and access your order dashboard.
            </p>
          </div>
          
          {/* What's Next Steps */}
          <div className="text-left space-y-4 mb-8">
            <h3 className="text-lg font-semibold text-gray-900">
              What happens next?
            </h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-sm font-semibold text-blue-600">1</span>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Check your inbox</p>
                  <p className="text-sm text-gray-600">
                    Look for an email from info@linkio.com (check spam folder if needed)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-sm font-semibold text-blue-600">2</span>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Verify your email</p>
                  <p className="text-sm text-gray-600">
                    Click the verification link in the email (expires in 24 hours)
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-sm font-semibold text-blue-600">3</span>
                </div>
                <div className="ml-4">
                  <p className="font-medium text-gray-900">Access your dashboard</p>
                  <p className="text-sm text-gray-600">
                    Log in to view your order details, track progress, and manage deliverables
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Security Note */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-gray-400 mt-0.5 mr-3" />
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Why email verification?</p>
                <p>
                  We verify your email to ensure secure access to your order and protect your account from unauthorized access.
                </p>
              </div>
            </div>
          </div>
          
          {/* Didn't receive email section */}
          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-600 mb-3">
              Didn't receive the email?
            </p>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => window.location.href = '/account/login'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Go to Login
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => window.location.href = '/account/resend-verification'}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Resend Verification Email
              </button>
            </div>
          </div>
          
          {/* Timer Note */}
          <div className="mt-6 flex items-center justify-center text-sm text-gray-500">
            <Clock className="w-4 h-4 mr-1" />
            Verification link expires in 24 hours
          </div>
        </div>
        
        {/* Additional Help */}
        <div className="mt-8 text-center text-sm text-gray-600">
          <p>
            Need help? Contact us at{' '}
            <a href="mailto:info@linkio.com" className="text-blue-600 hover:text-blue-700">
              info@linkio.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerificationPendingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <VerificationPendingContent />
    </Suspense>
  );
}