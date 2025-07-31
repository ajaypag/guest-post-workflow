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
  Globe
} from 'lucide-react';

interface ClaimData {
  client: {
    id: string;
    name: string;
    website: string;
    description?: string;
  };
  hasOrders: boolean;
  orderCount?: number;
}

export default function ClaimClientPage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;
  
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState('');
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [expired, setExpired] = useState(false);
  
  // Registration form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    contactName: '',
    companyName: '',
  });
  
  // Validate token and load client data
  useEffect(() => {
    validateToken();
  }, [token]);
  
  const validateToken = async () => {
    try {
      const response = await fetch(`/api/claim/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setClaimData(data);
      } else if (response.status === 404) {
        setError('Invalid claim link');
      } else if (response.status === 410) {
        setExpired(true);
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
    
    setClaiming(true);
    
    try {
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          ...formData,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Auto-login the user
        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
          }),
        });
        
        if (loginResponse.ok) {
          // Redirect to account dashboard
          router.push('/account/dashboard');
        } else {
          // Redirect to login if auto-login fails
          router.push('/account/login?claimed=true');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to claim client');
      }
    } catch (error) {
      console.error('Error claiming client:', error);
      setError('Failed to claim client');
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
  
  if (expired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-lg shadow-md p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Expired</h1>
            <p className="text-gray-600 mb-6">
              This claim link has already been used or has expired.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              If you need assistance, please contact your account representative.
            </p>
            <Link
              href="/account/login"
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
              href="/"
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Go to Home
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
        {/* Left Panel - Client Info */}
        <div className="hidden lg:flex lg:w-1/2 bg-blue-600 text-white p-12 flex-col justify-center">
          <div className="max-w-md">
            <Shield className="h-12 w-12 mb-8" />
            <h1 className="text-4xl font-bold mb-6">Claim Your Brand</h1>
            
            <div className="mb-8 p-6 bg-blue-700 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Building className="h-6 w-6" />
                <h2 className="text-xl font-semibold">{claimData.client.name}</h2>
              </div>
              <a 
                href={claimData.client.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-200 hover:text-white"
              >
                <Globe className="h-4 w-4" />
                {claimData.client.website}
              </a>
              {claimData.client.description && (
                <p className="text-blue-100 mt-3">{claimData.client.description}</p>
              )}
            </div>
            
            {claimData.hasOrders && (
              <div className="flex items-center gap-3 text-blue-100">
                <CheckCircle className="h-5 w-5" />
                <p>
                  {claimData.orderCount} active order{claimData.orderCount !== 1 ? 's' : ''} ready for you
                </p>
              </div>
            )}
            
            <p className="text-blue-100 mt-6">
              Create your account to manage this brand and access all features.
            </p>
          </div>
        </div>
        
        {/* Right Panel - Registration Form */}
        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900">Create Your Account</h2>
              <p className="mt-2 text-gray-600">
                Complete your registration to claim {claimData.client.name}
              </p>
            </div>
            
            <form onSubmit={handleClaim} className="space-y-6">
              {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {error}
                </div>
              )}
              
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
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="john@example.com"
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
                    placeholder={claimData.client.name}
                  />
                </div>
              </div>
              
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
                    Creating Account...
                  </>
                ) : (
                  <>
                    Claim Brand & Create Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </button>
              
              <p className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/account/login" className="text-blue-600 hover:text-blue-700 font-medium">
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