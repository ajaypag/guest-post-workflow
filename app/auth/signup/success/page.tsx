'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

function SignupSuccessContent() {
  const searchParams = useSearchParams();
  const orderApproved = searchParams.get('orderApproved') === 'true';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Account Created Successfully!
          </h1>
          
          {orderApproved ? (
            <>
              <p className="text-gray-600 mb-6">
                Your account has been created and your order has been approved. 
                You can now track the progress of your guest post campaign.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                We've sent a welcome email to your registered email address with login instructions.
              </p>
            </>
          ) : (
            <>
              <p className="text-gray-600 mb-6">
                Your advertiser account has been created successfully. 
                You can now log in to view and manage your orders.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                We've sent a welcome email to your registered email address.
              </p>
            </>
          )}
          
          <div className="space-y-3">
            <Link 
              href="/auth/login"
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Continue to Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            
            <Link 
              href="/"
              className="w-full inline-flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Return to Home
            </Link>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Having trouble? <Link href="/contact" className="text-blue-600 hover:text-blue-800">Contact support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <SignupSuccessContent />
    </Suspense>
  );
}