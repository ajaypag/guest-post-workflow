'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';

export default function VerifyEmailSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect to dashboard after 3 seconds
    const timer = setTimeout(() => {
      router.push('/account/dashboard');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <LinkioHeader variant="default" />
      
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            <CheckCircle className="h-20 w-20 text-green-600 mx-auto mb-6" />
            
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Email Verified Successfully!
            </h1>
            
            <p className="text-lg text-gray-600 mb-8">
              Your account is now active. You can access all features.
            </p>
            
            <div className="space-y-4">
              <Link
                href="/account/dashboard"
                className="inline-flex items-center justify-center gap-2 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Continue to Dashboard
                <ArrowRight className="h-5 w-5" />
              </Link>
              
              <p className="text-sm text-gray-500">
                Redirecting automatically in 3 seconds...
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}