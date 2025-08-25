'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  Building2, 
  Lock, 
  User,
  Zap,
  Globe,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingFooter from '@/components/MarketingFooter';

function ClaimForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [publisherInfo, setPublisherInfo] = useState<any>(null);
  const [formData, setFormData] = useState({
    password: '',
    contactName: '',
    companyName: '',
  });
  
  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setError('No claim token provided');
      setValidating(false);
      return;
    }
    
    validateToken();
  }, [token]);
  
  const validateToken = async () => {
    try {
      const response = await fetch(`/api/publisher/claim?token=${token}`);
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Invalid claim token');
      } else {
        setPublisherInfo(data.publisher);
        setFormData(prev => ({
          ...prev,
          contactName: data.publisher.contactName || '',
          companyName: data.publisher.companyName || '',
        }));
      }
    } catch (err) {
      setError('Failed to validate claim token');
    } finally {
      setValidating(false);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Validate password
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (!formData.contactName.trim()) {
      setError('Contact name is required');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/publisher/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setError(data.error || 'Failed to claim account');
      } else {
        setSuccess(true);
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push(data.redirectUrl || '/publisher/dashboard');
        }, 2000);
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Validating your invitation</h3>
          <p className="text-gray-600">Please wait while we verify your claim token...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !publisherInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Claim Failed</h3>
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <p className="text-sm text-gray-600 mb-6">
              If you believe this is an error, please contact our support team for assistance.
            </p>
            <div className="flex flex-col gap-3">
              <Link
                href="/contact"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Contact Support
              </Link>
              <Link
                href="/publisher"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Back to Publisher Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Linkio!</h3>
            <p className="text-gray-600 mb-6">
              Your publisher account has been successfully activated. You're being redirected to complete your onboarding...
            </p>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                <span className="text-blue-600 font-medium">Redirecting to onboarding...</span>
              </div>
            </div>
            <Link
              href="/publisher/onboarding"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Go to onboarding manually →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main claim form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4 mr-2" />
            Publisher Account Activation
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Claim Your Publisher Account</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Complete your account setup to start managing your websites and earning from quality guest posts.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Left Column - Benefits */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">What's Next?</h2>
              <div className="space-y-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <Globe className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Add Your Websites</h3>
                    <p className="text-gray-600 text-sm">Connect your websites and set up your content offerings with custom pricing.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Set Your Rates</h3>
                    <p className="text-gray-600 text-sm">Define your pricing, turnaround times, and editorial guidelines.</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mr-4">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-1">Start Earning</h3>
                    <p className="text-gray-600 text-sm">Receive high-quality guest post requests and grow your revenue stream.</p>
                  </div>
                </div>
              </div>
            </div>

            {publisherInfo && (
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                <h3 className="font-semibold text-gray-900 mb-3">Account Information</h3>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 w-16">Email:</span>
                    <span className="text-sm font-medium text-gray-900">{publisherInfo.email}</span>
                  </div>
                  {publisherInfo.source === 'manyreach' && (
                    <div className="bg-blue-100 rounded-lg p-3 mt-3">
                      <p className="text-xs text-blue-800">
                        <strong>How we found you:</strong> You responded to our outreach email expressing interest in guest posting opportunities.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Form */}
          <div className="bg-white rounded-xl shadow-lg p-8">
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="contactName" className="text-base font-medium">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="contactName"
                    type="text"
                    value={formData.contactName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, contactName: e.target.value }))}
                    required
                    placeholder="John Doe"
                    className="pl-10 py-3 text-base"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="companyName" className="text-base font-medium">
                  Company Name (Optional)
                </Label>
                <div className="relative mt-2">
                  <Building2 className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="companyName"
                    type="text"
                    value={formData.companyName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                    placeholder="Your Company LLC"
                    className="pl-10 py-3 text-base"
                  />
                </div>
              </div>

              <div className="border-t pt-6">
                <Label htmlFor="password" className="text-base font-medium">
                  Create Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    className="pl-10 py-3 text-base"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">Choose a strong password with at least 8 characters.</p>
              </div>

              <Button
                type="submit"
                className="w-full py-4 text-base font-medium"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    Activate My Account
                    <CheckCircle className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/publisher/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClaimPage() {
  return (
    <>
      <LinkioHeader />
      <Suspense fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading...</h3>
          </div>
        </div>
      }>
        <ClaimForm />
      </Suspense>
      <MarketingFooter />
    </>
  );
}