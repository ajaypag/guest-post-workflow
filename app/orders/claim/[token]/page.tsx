'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Loader2, CheckCircle, AlertCircle, Package, 
  User, Mail, Lock, Building, ArrowRight, Globe, DollarSign, Target, Zap
} from 'lucide-react';
import LineItemsReviewTable from '@/components/orders/LineItemsReviewTable';
import type { LineItem } from '@/components/orders/LineItemsReviewTable';
import LinkioHeader from '@/components/LinkioHeader';
import ProposalVideoEmbed from '@/components/ProposalVideoEmbed';

interface OrderData {
  id: string;
  status: string;
  state?: string;
  totalPrice: number;
  totalRetail: number;
  includesClientReview?: boolean;
  rushDelivery?: boolean;
  account?: {
    companyName?: string;
    contactName?: string;
  };
  orderGroups?: any[];
  lineItems?: any[];
  shareExpiresAt?: string;
  proposalVideoUrl?: string;
  proposalMessage?: string;
}

export default function ClaimOrderPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  // Signup form fields (simplified to match main signup)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactName, setContactName] = useState('');

  // Scroll to signup form
  const scrollToSignupForm = () => {
    setShowSignupForm(true);
    setTimeout(() => {
      const signupElement = document.getElementById('signup-form');
      if (signupElement) {
        signupElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }, 100); // Small delay to ensure form is rendered
  };

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
      
      // Pre-fill contact name if available
      if (data.order?.account?.contactName) {
        setContactName(data.order.account.contactName);
      }
      
      // Use the modern lineItems directly from the order
      // The system has moved from siteSubmissions to orderLineItems
      if (data.order?.lineItems && data.order.lineItems.length > 0) {
        // Transform lineItems to the format expected by LineItemsReviewTable
        const transformedLineItems: LineItem[] = data.order.lineItems.map((item: any) => ({
          id: item.id,
          orderId: data.order.id,
          clientId: item.clientId,
          client: item.client,
          targetPageUrl: item.targetPageUrl || '',
          targetPageId: item.targetPageId,
          targetPage: item.targetPage,
          anchorText: item.anchorText || '',
          status: item.status || 'pending',
          assignedDomainId: item.assignedDomainId,
          assignedDomain: item.assignedDomain,
          estimatedPrice: item.estimatedPrice || item.approvedPrice || 0,
          wholesalePrice: item.wholesalePrice || 0,
          approvedPrice: item.approvedPrice,
          workflowId: item.workflowId,
          workflow: item.workflow,
          metadata: item.metadata || {},
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }));
        
        setLineItems(transformedLineItems);
      } else {
        // No line items available
        setLineItems([]);
      }
      
    } catch (error: any) {
      console.error('Error loading order:', error);
      setError(error.message || 'Failed to load order');
    } finally {
      setLoading(false);
    }
  };
  
  // No longer needed - submissions come from main API call

  const handleClaimOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation (matches main signup form)
    if (!email || !password || !contactName) {
      setError('All fields are required');
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
          contactName
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create account');
      }
      
      const result = await response.json();
      
      // Success! Redirect to verification pending page
      router.push(`/orders/claim/verification-pending?email=${encodeURIComponent(email)}&orderId=${result.orderId || ''}`)
      
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

  // Check if link is expired and calculate time remaining
  const isExpired = order.shareExpiresAt && new Date(order.shareExpiresAt) < new Date();
  const timeRemaining = order.shareExpiresAt ? 
    Math.max(0, Math.ceil((new Date(order.shareExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null;
  
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
    <>
      <LinkioHeader />
      <div className="min-h-screen bg-gray-50">
        {/* Hero Header with Clean Design */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Review Your Order</h1>
                <p className="text-gray-600 text-lg">
                  We've selected {lineItems.length} high-quality sites for your campaign
                </p>
              </div>
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-center min-w-[120px]">
                  <div className="text-3xl font-bold mb-1 text-orange-600">{timeRemaining}</div>
                  <div className="text-sm font-medium text-orange-600">
                    {timeRemaining === 1 ? 'day left' : 'days left'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 pb-32 max-w-none xl:max-w-[1600px] 2xl:max-w-[1920px]">
          {/* Top Action Button */}
          <div className="mb-8 text-center">
            {!showSignupForm ? (
              <button
                onClick={scrollToSignupForm}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Package className="mr-3 h-5 w-5" />
                Create Account & Claim Order
                <ArrowRight className="ml-3 h-5 w-5" />
              </button>
            ) : (
              <div className="text-gray-600">
                Complete the form below to claim your order
              </div>
            )}
          </div>

          {/* Personalized Video Proposal - Show if video URL exists */}
          {order.proposalVideoUrl && (
            <ProposalVideoEmbed 
              videoUrl={order.proposalVideoUrl}
              title="Your Personalized Proposal"
              message={order.proposalMessage}
            />
          )}
        
          {/* Order Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-emerald-50">
                  <CheckCircle className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">High Quality Sites</p>
                  <p className="text-2xl font-bold text-gray-900">{lineItems.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-50">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg. DR / Traffic</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(() => {
                      const itemsWithDR = lineItems.filter(li => li.metadata?.domainRating);
                      if (itemsWithDR.length === 0) return 0;
                      const totalDR = itemsWithDR.reduce((sum, li) => sum + (li.metadata?.domainRating || 0), 0);
                      return Math.round(totalDR / itemsWithDR.length);
                    })()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg Traffic: {(() => {
                      const itemsWithTraffic = lineItems.filter(li => li.metadata?.traffic);
                      if (itemsWithTraffic.length === 0) return '0';
                      const totalTraffic = itemsWithTraffic.reduce((sum, li) => sum + (li.metadata?.traffic || 0), 0);
                      const avgTraffic = totalTraffic / itemsWithTraffic.length;
                      
                      if (avgTraffic > 1000000) {
                        return (Math.round(avgTraffic / 100000) / 10) + 'M';
                      } else if (avgTraffic > 1000) {
                        return Math.round(avgTraffic / 1000) + 'K';
                      } else {
                        return Math.round(avgTraffic).toString();
                      }
                    })()}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-50">
                  <DollarSign className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Price Per Link</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(Math.round(order.totalPrice / lineItems.length))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Order Analysis - Show detailed site analysis with expandable rows */}
          {lineItems.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      Selected Sites for Your Campaign
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Each site has been carefully vetted and matched to your target audience
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-50 text-blue-700">
                      {lineItems.length} sites
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-0">
                <LineItemsReviewTable
                  orderId={order.id}
                  lineItems={lineItems}
                  userType="account"
                  permissions={{
                    canApproveReject: false,
                    canViewPricing: true,
                    canEditPricing: false,
                    canViewInternalTools: false,
                    canChangeStatus: false, // Read-only for claim page
                    canAssignTargetPages: false,
                    canGenerateWorkflows: false,
                    canMarkSitesReady: false,
                    canEditDomainAssignments: false,
                    canSetExclusionReason: false
                  }}
                  workflowStage="client_review"
                />
              </div>
            </div>
          )}

          {/* Claim Section */}
          {!showSignupForm ? (
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 text-center">
              <div className="max-w-2xl mx-auto">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  Ready to Get Started?
                </h3>
                <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                  Create your free account to claim this order and start tracking your campaign progress.
                  You'll get full access to performance analytics, content drafts, and direct communication with our team.
                </p>
                <button
                  onClick={scrollToSignupForm}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Create Account & Claim Order
                  <ArrowRight className="ml-3 h-5 w-5" />
                </button>
              </div>
            </div>
          ) : (
            <div id="signup-form" className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  Create Your Account
                </h3>
                <p className="text-gray-600">
                  Just a few details to get started with your campaign
                </p>
              </div>
              
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              
              <form onSubmit={handleClaimOrder} className="space-y-6">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Mail className="inline h-4 w-4 mr-2" />
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <User className="inline h-4 w-4 mr-2" />
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      <Lock className="inline h-4 w-4 mr-2" />
                      Password *
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Minimum 8 characters with letters and numbers"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSignupForm(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                    disabled={claiming}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={claiming}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200"
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
              
              <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-800 text-center">
                  🔒 Your information is secure and will only be used to manage your order
                </p>
              </div>
            </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Linkio</span>
            </div>
            
            <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-8 text-sm text-gray-600">
              <div className="text-center md:text-left">
                <p>© 2025 Linkio. All rights reserved.</p>
              </div>
              <div className="flex space-x-6">
                <a href="/privacy" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
                <a href="/terms" className="hover:text-gray-900 transition-colors">Terms of Service</a>
                <a href="/contact" className="hover:text-gray-900 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}