'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Send,
  Info,
  Shield,
  ChevronRight
} from 'lucide-react';

interface VerificationStatus {
  website: {
    id: string;
    domain: string;
  };
  verification: {
    status: 'pending' | 'verified' | 'failed' | 'expired';
    method: string;
    requestedAt: string;
    verifiedAt?: string;
    expiresAt?: string;
    lastAttemptAt?: string;
    attemptCount?: number;
    maxAttempts?: number;
    nextRetryAt?: string;
    emailSentTo?: string;
  };
  canResend: boolean;
  resendCooldown?: number; // seconds until can resend
}

export default function VerificationStatusPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: websiteId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [resending, setResending] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');

  // Fetch verification status
  const fetchStatus = async () => {
    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}/verification-status`);
      if (!response.ok) throw new Error('Failed to fetch status');
      const data = await response.json();
      setStatus(data);
      
      // Set email address if available
      if (data.verification?.emailSentTo) {
        setEmailAddress(data.verification.emailSentTo);
      }
    } catch (err) {
      setError('Unable to load verification status');
    } finally {
      setLoading(false);
    }
  };

  // Calculate time remaining
  useEffect(() => {
    if (status?.verification?.expiresAt) {
      const interval = setInterval(() => {
        const expires = new Date(status.verification.expiresAt!);
        const now = new Date();
        const diff = expires.getTime() - now.getTime();
        
        if (diff <= 0) {
          setTimeLeft('Expired');
          clearInterval(interval);
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          setTimeLeft(`${hours}h ${minutes}m remaining`);
        }
      }, 60000); // Update every minute
      
      return () => clearInterval(interval);
    }
  }, [status]);

  // Auto-refresh status every 30 seconds if pending
  useEffect(() => {
    fetchStatus();
    
    if (status?.verification?.status === 'pending') {
      const interval = setInterval(fetchStatus, 30000);
      return () => clearInterval(interval);
    }
  }, [websiteId, status?.verification?.status]);

  // Handle resend
  const handleResend = async () => {
    if (!emailAddress || !emailAddress.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setResending(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/publisher/websites/${websiteId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'email',
          token: `linkio-verify-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
          emailAddress
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited
          setError(data.error || 'Too many attempts. Please wait before trying again.');
        } else {
          throw new Error(data.error || 'Failed to resend verification');
        }
      } else {
        setSuccess(data.message || 'Verification email sent successfully!');
        // Refresh status
        setTimeout(fetchStatus, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification Not Found</h2>
          <p className="text-gray-600 mb-4">No verification request found for this website.</p>
          <Link
            href={`/publisher/websites/${websiteId}/verify`}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Start Verification
            <ChevronRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  const { website, verification, canResend } = status;
  const isPending = verification.status === 'pending';
  const isVerified = verification.status === 'verified';
  const isFailed = verification.status === 'failed' || verification.status === 'expired';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/publisher/websites/${websiteId}`}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Website
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Verification Status
        </h1>
        <p className="text-gray-600">{website.domain}</p>
      </div>

      {/* Status Card */}
      <div className={`rounded-lg border-2 p-8 mb-6 ${
        isVerified ? 'bg-green-50 border-green-200' :
        isPending ? 'bg-blue-50 border-blue-200' :
        'bg-red-50 border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-4">
              {isVerified ? (
                <CheckCircle className="w-8 h-8 text-green-500 mr-3" />
              ) : isPending ? (
                <Clock className="w-8 h-8 text-blue-500 mr-3 animate-pulse" />
              ) : (
                <XCircle className="w-8 h-8 text-red-500 mr-3" />
              )}
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">
                  {isVerified ? 'Verified' :
                   isPending ? 'Verification Pending' :
                   verification.status === 'expired' ? 'Verification Expired' :
                   'Verification Failed'}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Method: {verification.method === 'email' ? 'Email' : verification.method.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Status Details */}
            <div className="space-y-3 mb-6">
              {verification.emailSentTo && (
                <div className="flex items-center text-sm">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Sent to:</span>
                  <span className="ml-2 font-medium">{verification.emailSentTo}</span>
                </div>
              )}
              
              {verification.requestedAt && (
                <div className="flex items-center text-sm">
                  <Clock className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Requested:</span>
                  <span className="ml-2 font-medium">
                    {new Date(verification.requestedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {isPending && timeLeft && (
                <div className="flex items-center text-sm">
                  <AlertCircle className="w-4 h-4 text-blue-400 mr-2" />
                  <span className="text-blue-600 font-medium">{timeLeft}</span>
                </div>
              )}

              {isVerified && verification.verifiedAt && (
                <div className="flex items-center text-sm">
                  <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                  <span className="text-gray-600">Verified at:</span>
                  <span className="ml-2 font-medium">
                    {new Date(verification.verifiedAt).toLocaleString()}
                  </span>
                </div>
              )}

              {verification.attemptCount !== undefined && (
                <div className="flex items-center text-sm">
                  <RefreshCw className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600">Attempts:</span>
                  <span className="ml-2 font-medium">
                    {verification.attemptCount} / {verification.maxAttempts || 5}
                  </span>
                </div>
              )}
            </div>

            {/* Action Messages */}
            {isPending && (
              <div className="bg-blue-100 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  Next Steps
                </h3>
                <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                  <li>Check your email for the verification link</li>
                  <li>Click the link in the email to verify ownership</li>
                  <li>This page will automatically update when verified</li>
                </ol>
              </div>
            )}

            {isVerified && (
              <div className="bg-green-100 rounded-lg p-4">
                <p className="text-green-800">
                  <strong>Success!</strong> Your website ownership has been verified.
                  You can now manage this website and its offerings.
                </p>
              </div>
            )}

            {isFailed && (
              <div className="bg-red-100 rounded-lg p-4">
                <p className="text-red-800">
                  {verification.status === 'expired' 
                    ? 'Your verification link has expired. Please request a new one below.'
                    : 'Verification failed. Please try again or contact support if the issue persists.'}
                </p>
              </div>
            )}
          </div>

          {/* Status Icon */}
          <div className="ml-8">
            <Shield className={`w-24 h-24 ${
              isVerified ? 'text-green-200' :
              isPending ? 'text-blue-200' :
              'text-red-200'
            }`} />
          </div>
        </div>
      </div>

      {/* Resend Section */}
      {!isVerified && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Didn't receive the email?
          </h3>
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={emailAddress}
                onChange={(e) => setEmailAddress(e.target.value)}
                placeholder="admin@example.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={resending || !canResend}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the email address where you want to receive the verification link
              </p>
            </div>

            <button
              onClick={handleResend}
              disabled={resending || !canResend || !emailAddress}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Resend Verification Email
                </>
              )}
            </button>

            {!canResend && status.resendCooldown && (
              <p className="text-sm text-gray-500">
                You can resend in {Math.ceil(status.resendCooldown / 60)} minutes
              </p>
            )}
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Troubleshooting Tips:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your spam or junk folder</li>
              <li>• Make sure the email address is correct</li>
              <li>• Add noreply@linkio.com to your contacts</li>
              <li>• Try a different verification method if email isn't working</li>
            </ul>
            
            <Link
              href={`/publisher/websites/${websiteId}/verify`}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 mt-3"
            >
              Try a different verification method
              <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>
      )}

      {/* Success Actions */}
      {isVerified && (
        <div className="flex gap-4">
          <Link
            href={`/publisher/websites/${websiteId}`}
            className="flex-1 text-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Website Details
          </Link>
          <Link
            href="/publisher/websites"
            className="flex-1 text-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Back to Websites
          </Link>
        </div>
      )}
    </div>
  );
}