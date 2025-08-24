'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Building,
  Mail,
  User,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  Shield,
  Globe,
  Phone
} from 'lucide-react';

interface PublisherClaimData {
  email: string;
  contactName?: string;
  companyName?: string;
  source: string;
  confidenceScore?: number;
  invitationSentAt: string;
  expiresAt?: string;
  requiresVerificationCode: boolean;
  attemptsRemaining: number;
}

export default function PublisherClaimPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [claimData, setClaimData] = useState<PublisherClaimData | null>(null);
  const [expired, setExpired] = useState(false);
  
  // Registration form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    contactName: '',
    companyName: '',
    phone: '',
    verificationCode: '',
  });
  
  // Validate token and load publisher data
  useEffect(() => {
    validateToken();
  }, [token]);
  
  const validateToken = async () => {
    try {
      const response = await fetch(`/api/publisher/claim?token=${token}`);
      
      if (response.ok) {
        const data = await response.json();
        setClaimData(data.publisher);
        // Pre-populate form with existing data
        setFormData(prev => ({
          ...prev,
          email: data.publisher.email,
          contactName: data.publisher.contactName || '',
          companyName: data.publisher.companyName || '',
        }));
      } else if (response.status === 404) {
        setError('Invalid claim link');
      } else if (response.status === 400) {
        setExpired(true);
      } else if (response.status === 429) {
        const data = await response.json();
        setError(data.error);
      } else {
        setError('Unable to validate claim link');
      }
    } catch (error) {
      console.error('Error validating token:', error);
      setError('Failed to validate claim link');
    } finally {
      setLoading(false);
    }
  };
  
  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate form
    if (!formData.email || !formData.password || !formData.contactName) {
      setError('Please fill in all required fields');
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    if (claimData?.requiresVerificationCode && !formData.verificationCode) {
      setError('Verification code is required');
      return;
    }
    
    setClaiming(true);
    
    try {
      const response = await fetch('/api/publisher/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          email: formData.email,
          password: formData.password,
          contactName: formData.contactName,
          companyName: formData.companyName,
          phone: formData.phone,
          verificationCode: formData.verificationCode || undefined,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Success - redirect to publisher login
        router.push('/publisher/login?claimed=true&email=' + encodeURIComponent(formData.email));
      } else {
        setError(data.error || 'Failed to claim publisher account');
        
        // Update attempts remaining if provided
        if (data.attemptsRemaining !== undefined) {
          setClaimData(prev => prev ? { ...prev, attemptsRemaining: data.attemptsRemaining } : null);
        }
      }
    } catch (error) {
      console.error('Error claiming publisher:', error);
      setError('Failed to claim publisher account');
    } finally {
      setClaiming(false);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Validating claim link...</p>
        </div>
      </div>
    );
  }
  
  if (expired || error.includes('expired') || error.includes('attempts')) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {error.includes('attempts') ? 'Account Locked' : 'Link Expired'}
            </h1>
            <p className="text-gray-600 mb-6">
              {error || 'This claim link has already been used or has expired.'}
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Please contact support for assistance: info@linkio.com
            </p>
            <Link
              href="/publisher/login"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go to Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (error && !claimData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <Link
              href="/publisher/login"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Go to Publisher Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!claimData) return null;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        {/* Left Panel - Publisher Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white p-12 flex-col justify-center">
          <div className="max-w-md">
            <Shield className="h-12 w-12 mb-8" />
            <h1 className="text-4xl font-bold mb-6">Claim Your Publisher Account</h1>
            
            <div className="mb-8 p-6 bg-blue-700 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Building className="h-6 w-6" />
                <h2 className="text-xl font-semibold">
                  {claimData.companyName || 'Your Publishing Business'}
                </h2>
              </div>
              <div className="space-y-2 text-blue-200">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>{claimData.email}</span>
                </div>
                {claimData.contactName && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{claimData.contactName}</span>
                  </div>
                )}
                <div className="text-xs">
                  Source: {claimData.source} 
                  {claimData.confidenceScore && (
                    <span className="ml-2">
                      (Confidence: {Math.round(claimData.confidenceScore * 100)}%)
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5" />
                <p>Manage your publisher profile</p>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5" />
                <p>Set pricing and offerings</p>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5" />
                <p>Receive and manage orders</p>
              </div>
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5" />
                <p>Track earnings and payments</p>
              </div>
            </div>
            
            <p className="text-blue-100 mt-6 text-sm">
              Complete your registration to activate your publisher account and start receiving guest post opportunities.
            </p>
          </div>
        </div>
        
        {/* Right Panel - Registration Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Activate Your Account</h2>
              <p className="mt-2 text-gray-600">
                Complete your publisher registration
              </p>
              {claimData.attemptsRemaining < 3 && (
                <div className="mt-2 text-orange-600 text-sm">
                  {claimData.attemptsRemaining} attempt{claimData.attemptsRemaining !== 1 ? 's' : ''} remaining
                </div>
              )}
            </div>
            
            <form onSubmit={handleClaim} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    disabled
                    value={formData.email}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name
                </label>
                <div className="relative">
                  <Building className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Publishing Company"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              
              {claimData.requiresVerificationCode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.verificationCode}
                    onChange={(e) => setFormData({ ...formData, verificationCode: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-center tracking-wider font-mono"
                    placeholder="ABC123"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter the 6-character verification code sent to your email
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">At least 8 characters</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={claiming}
                className="w-full flex justify-center items-center px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Activating Account...
                  </>
                ) : (
                  <>
                    Activate Publisher Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
              
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/publisher/login" className="text-blue-600 hover:text-blue-700 font-medium">
                  Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}