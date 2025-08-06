'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Loader2, CheckCircle, AlertCircle, Package, 
  User, Mail, Lock, Building, ArrowRight
} from 'lucide-react';

interface OrderData {
  id: string;
  status: string;
  state?: string;
  totalPrice: number;
  account?: {
    companyName?: string;
    contactName?: string;
  };
  orderGroups?: any[];
  shareExpiresAt?: string;
}

export default function ClaimOrderPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  // Signup form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [contactName, setContactName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    loadOrderByToken();
  }, [token]);

  const loadOrderByToken = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/claim/${token}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Invalid or expired link');
      }
      
      const data = await response.json();
      setOrder(data.order);
      
      // Pre-fill company name if available
      if (data.order?.account?.companyName) {
        setCompanyName(data.order.account.companyName);
      }
      
    } catch (error: any) {
      console.error('Error loading order:', error);
      setError(error.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    
    try {
      setClaiming(true);
      setError('');
      
      // Create account and claim order in one request
      const response = await fetch(`/api/orders/claim/${token}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          contactName,
          companyName,
          phone
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }
      
      const result = await response.json();
      
      // Success! Redirect to login with success message
      router.push(`/login?claimed=true&email=${encodeURIComponent(email)}`);
      
    } catch (error: any) {
      console.error('Error claiming order:', error);
      setError(error.message || 'Failed to claim order');
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!order) return null;

  // Check if link is expired
  const isExpired = order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date();
  
  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Link Expired</h2>
          <p className="text-gray-600">This share link has expired. Please request a new link from the sender.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Review & Claim Order</h1>
              <p className="mt-1 text-sm text-gray-600">
                Review the order details below and create an account to claim it
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Order Value</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(order.totalPrice)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Order Preview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Order Details</h2>
          </div>
          
          {/* Simple order summary - don't use OrderSiteReviewTable as it needs too much data */}
          <div className="p-6">
            {order.orderGroups && order.orderGroups.length > 0 ? (
              <div className="space-y-4">
                {order.orderGroups.map((group: any) => (
                  <div key={group.id} className="border-l-4 border-blue-500 pl-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">
                        {group.client?.name || 'Unknown Client'}
                      </h3>
                      <span className="text-sm text-gray-500">
                        {group.linkCount} {group.linkCount === 1 ? 'link' : 'links'}
                      </span>
                    </div>
                    {group.client?.website && (
                      <p className="text-sm text-gray-600">
                        Website: {group.client.website}
                      </p>
                    )}
                    {group.targetPages && group.targetPages.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Target Pages:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {group.targetPages.slice(0, 3).map((page: any, idx: number) => (
                            <li key={idx} className="truncate">
                              • {page.url || page}
                            </li>
                          ))}
                          {group.targetPages.length > 3 && (
                            <li className="text-gray-400">
                              • {group.targetPages.length - 3} more...
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Total Links: {order.orderGroups.reduce((sum: number, g: any) => sum + g.linkCount, 0)}
                    </span>
                    {order.includesClientReview && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        Includes Client Review
                      </span>
                    )}
                    {order.rushDelivery && (
                      <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded">
                        Rush Delivery
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500">No order details available</p>
            )}
          </div>
        </div>

        {/* Claim Section */}
        {!showSignupForm ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Ready to Claim This Order?
            </h3>
            <p className="text-gray-600 mb-6">
              Create a free account to manage this order and track its progress
            </p>
            <button
              onClick={() => setShowSignupForm(true)}
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Create Account & Claim Order
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              Create Your Account
            </h3>
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            
            <form onSubmit={handleClaimOrder} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="inline h-4 w-4 mr-1" />
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    Contact Name *
                  </label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="inline h-4 w-4 mr-1" />
                    Password *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Minimum 8 characters"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Lock className="inline h-4 w-4 mr-1" />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Building className="inline h-4 w-4 mr-1" />
                    Company Name *
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowSignupForm(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50"
                  disabled={claiming}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={claiming}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {claiming ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Create Account & Claim
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}