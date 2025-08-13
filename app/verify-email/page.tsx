'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Mail, Loader2, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'already-verified'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) {
      // Automatically verify when token is present
      verifyEmail(token);
    } else {
      setStatus('error');
      setMessage('No verification token provided');
    }
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${verificationToken}`);
      const data = await response.json();

      if (response.ok) {
        if (data.alreadyVerified) {
          setStatus('already-verified');
          setMessage('Your email is already verified');
        } else {
          setStatus('success');
          setMessage('Email verified successfully!');
          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/account/dashboard');
          }, 2000);
        }
      } else {
        setStatus('error');
        setMessage(data.error || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <LinkioHeader variant="default" />
      
      <div className="flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-xl p-8 text-center">
            {status === 'loading' && (
              <>
                <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verifying Your Email...
                </h2>
                <p className="text-gray-600">
                  Please wait while we verify your email address.
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Email Verified!
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Redirecting to your dashboard...
                </p>
                <Link
                  href="/account/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {status === 'already-verified' && (
              <>
                <CheckCircle className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Already Verified
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <Link
                  href="/account/dashboard"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Verification Failed
                </h2>
                <p className="text-gray-600 mb-6">
                  {message}
                </p>
                <div className="space-y-3">
                  <Link
                    href="/signup"
                    className="block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Sign Up Again
                  </Link>
                  <Link
                    href="/account/login"
                    className="block px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                  >
                    Go to Login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}