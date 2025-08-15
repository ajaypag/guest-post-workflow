'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export default function PublisherVerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('No verification token provided');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/auth/publisher/verify-email?token=${token}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setSuccess(true);
        setUser(data.user);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred during verification');
      } finally {
        setLoading(false);
      }
    };

    verifyEmail();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your email...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          {success ? (
            <>
              {/* Success State */}
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Email Verified!
              </h1>
              <p className="text-gray-600 mb-6">
                Your publisher account has been successfully verified.
              </p>
              
              {user && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-green-800">
                    <strong>Welcome, {user.name}!</strong>
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Your account ({user.email}) is now active and ready to use.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Link
                  href="/publisher/login"
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Sign In to Your Account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
                
                <p className="text-sm text-gray-600">
                  You can now sign in and start managing your publisher dashboard.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Error State */}
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Verification Failed
              </h1>
              <p className="text-gray-600 mb-4">
                We couldn't verify your email address.
              </p>
              
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
                {error}
              </div>

              <div className="space-y-3">
                <Link
                  href="/publisher/verify-pending"
                  className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Request New Verification Email
                </Link>
                
                <Link
                  href="/publisher/signup"
                  className="block text-sm text-blue-600 hover:text-blue-700"
                >
                  Create a New Account
                </Link>
                
                <Link
                  href="/publisher/login"
                  className="block text-sm text-gray-600 hover:text-gray-700"
                >
                  Back to Sign In
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Need help? <Link href="/contact" className="text-blue-600 hover:text-blue-700">Contact Support</Link>
          </p>
        </div>
      </div>
    </div>
  );
}