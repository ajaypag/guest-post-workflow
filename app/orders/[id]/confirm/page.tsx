'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { formatCurrency } from '@/lib/utils/formatting';
import { UserSelector } from '@/components/ui/UserSelector';
import {
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Globe,
  Target,
  Sparkles,
  Package,
  Building,
  User,
  KeyRound,
  FileText,
  RefreshCw
} from 'lucide-react';

interface TargetPageStatus {
  id: string;
  url: string;
  hasKeywords: boolean;
  hasDescription: boolean;
  keywordCount: number;
  clientName: string;
}

interface OrderGroup {
  id: string;
  clientId: string;
  linkCount: number;
  targetPages: Array<{ url: string; pageId?: string }>;
  client: {
    id: string;
    name: string;
    website: string;
  };
}

export default function OrderConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [orderGroups, setOrderGroups] = useState<OrderGroup[]>([]);
  const [targetPageStatuses, setTargetPageStatuses] = useState<TargetPageStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingKeywords, setGeneratingKeywords] = useState(false);
  const [currentProcessingPage, setCurrentProcessingPage] = useState<string | null>(null);
  const [confirmingOrder, setConfirmingOrder] = useState(false);
  const [selectedPages, setSelectedPages] = useState<Set<string>>(new Set());
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'info' | 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    loadOrderDetails();
  }, [params.id]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Load order
      const orderResponse = await fetch(`/api/orders/${params.id}`);
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load order (${orderResponse.status})`);
      }
      const orderData = await orderResponse.json();
      setOrder(orderData);
      
      // Check if order is in correct status
      if (orderData.status !== 'pending_confirmation') {
        setMessage({ 
          type: 'warning', 
          text: 'This order is not pending confirmation. Redirecting...' 
        });
        setTimeout(() => router.push(`/orders/${params.id}`), 2000);
        return;
      }
      
      // Load order groups
      const groupsResponse = await fetch(`/api/orders/${params.id}/groups`);
      if (!groupsResponse.ok) {
        throw new Error('Failed to load order groups');
      }
      const groupsData = await groupsResponse.json();
      setOrderGroups(groupsData.groups);
      
      // Check target page statuses
      await checkTargetPageStatuses(groupsData.groups);
      
    } catch (error) {
      console.error('Error loading order details:', error);
      setMessage({ type: 'error', text: 'Failed to load order details' });
    } finally {
      setLoading(false);
    }
  };
  
  const checkTargetPageStatuses = async (groups: OrderGroup[]) => {
    const statuses: TargetPageStatus[] = [];
    
    for (const group of groups) {
      for (const targetPage of group.targetPages) {
        if (targetPage.pageId) {
          // Load target page details
          try {
            const response = await fetch(`/api/target-pages/${targetPage.pageId}`);
            if (response.ok) {
              const pageData = await response.json();
              statuses.push({
                id: pageData.id,
                url: pageData.url,
                hasKeywords: !!(pageData.keywords && pageData.keywords.trim() !== ''),
                hasDescription: !!(pageData.description && pageData.description.trim() !== ''),
                keywordCount: pageData.keywords ? pageData.keywords.split(',').filter((k: string) => k.trim()).length : 0,
                clientName: group.client.name
              });
            }
          } catch (error) {
            console.error(`Failed to load target page ${targetPage.pageId}:`, error);
          }
        }
      }
    }
    
    setTargetPageStatuses(statuses);
    
    // Auto-select pages that need keywords
    const pagesNeedingKeywords = statuses.filter(p => !p.hasKeywords).map(p => p.id);
    setSelectedPages(new Set(pagesNeedingKeywords));
  };
  
  const generateKeywordsForSelected = async () => {
    if (selectedPages.size === 0) {
      setMessage({ type: 'warning', text: 'Please select target pages to generate keywords for' });
      return;
    }
    
    setGeneratingKeywords(true);
    setMessage({ type: 'info', text: `Generating keywords for ${selectedPages.size} target pages...` });
    
    let successCount = 0;
    let failureCount = 0;
    let currentIndex = 0;
    const totalPages = selectedPages.size;
    
    for (const pageId of selectedPages) {
      const page = targetPageStatuses.find(p => p.id === pageId);
      if (!page) continue;
      
      currentIndex++;
      setCurrentProcessingPage(page.url);
      setMessage({ 
        type: 'info', 
        text: `Processing ${currentIndex}/${totalPages}: ${page.url}` 
      });
      
      try {
        // Generate keywords
        if (!page.hasKeywords) {
          const keywordResponse = await fetch(`/api/target-pages/${pageId}/keywords`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!keywordResponse.ok) {
            const errorData = await keywordResponse.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to generate keywords (${keywordResponse.status})`);
          }
        }
        
        // Generate description
        if (!page.hasDescription) {
          const descResponse = await fetch(`/api/target-pages/${pageId}/description`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUrl: page.url })
          });
          
          if (!descResponse.ok) {
            const errorData = await descResponse.json().catch(() => ({}));
            console.error(`Failed to generate description for ${page.url}:`, errorData.error || descResponse.statusText);
            // Continue with other pages even if description fails
          }
        }
        
        successCount++;
        
        // Add a small delay between API calls to avoid rate limits
        if (currentIndex < totalPages) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
        }
      } catch (error: any) {
        console.error(`Failed to generate content for ${page.url}:`, error);
        failureCount++;
        // Store the error for display
        const errorMessage = error.message || 'Unknown error';
        setMessage({ 
          type: 'error', 
          text: `Error processing ${page.url}: ${errorMessage}` 
        });
      }
    }
    
    setGeneratingKeywords(false);
    setCurrentProcessingPage(null);
    
    if (failureCount === 0) {
      setMessage({ 
        type: 'success', 
        text: `Successfully generated keywords for ${successCount} target pages` 
      });
    } else {
      setMessage({ 
        type: 'warning', 
        text: `Generated keywords for ${successCount} pages, ${failureCount} failed` 
      });
    }
    
    // Reload target page statuses
    await checkTargetPageStatuses(orderGroups);
  };
  
  const confirmOrder = async () => {
    // Check if all target pages have keywords
    const pagesWithoutKeywords = targetPageStatuses.filter(p => !p.hasKeywords);
    if (pagesWithoutKeywords.length > 0) {
      setMessage({ 
        type: 'warning', 
        text: `${pagesWithoutKeywords.length} target pages still need keywords. Please generate them first.` 
      });
      return;
    }
    
    setConfirmingOrder(true);
    setMessage({ type: 'info', text: 'Confirming order and creating bulk analysis projects...' });
    
    try {
      const response = await fetch(`/api/orders/${params.id}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo: assignedTo || null })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to confirm order');
      }
      
      const result = await response.json();
      setMessage({ 
        type: 'success', 
        text: `Order confirmed! Created ${result.projectsCreated} bulk analysis projects.` 
      });
      
      // Redirect to order detail page after 2 seconds
      setTimeout(() => {
        router.push(`/orders/${params.id}`);
      }, 2000);
      
    } catch (error: any) {
      console.error('Error confirming order:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to confirm order' });
      setConfirmingOrder(false);
    }
  };
  
  const allPagesHaveKeywords = targetPageStatuses.every(p => p.hasKeywords);
  const selectedPagesNeedingKeywords = Array.from(selectedPages).filter(pageId => {
    const page = targetPageStatuses.find(p => p.id === pageId);
    return page && !page.hasKeywords;
  });

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  if (!order) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-4xl mx-auto px-4 py-8">
            <div className="text-center text-gray-500">Order not found</div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href={`/orders/${order.id}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Order
            </Link>
            
            <h1 className="text-2xl font-bold text-gray-900">Confirm Order #{order.id.slice(0, 8)}</h1>
            <p className="text-gray-600 mt-2">
              Review target pages and generate keywords before confirming the order
            </p>
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              {message.type === 'error' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'warning' ? <AlertCircle className="h-5 w-5 mt-0.5" /> :
               message.type === 'success' ? <CheckCircle className="h-5 w-5 mt-0.5" /> :
               <AlertCircle className="h-5 w-5 mt-0.5" />}
              <div className="flex-1">{message.text}</div>
            </div>
          )}

          {/* Order Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Advertiser</p>
                <p className="font-medium">{order.advertiserName}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Amount</p>
                <p className="font-medium">{formatCurrency(order.totalRetail)}</p>
              </div>
              <div>
                <p className="text-gray-500">Number of Clients</p>
                <p className="font-medium">{orderGroups.length}</p>
              </div>
              <div>
                <p className="text-gray-500">Total Links</p>
                <p className="font-medium">{orderGroups.reduce((sum, g) => sum + g.linkCount, 0)}</p>
              </div>
            </div>
          </div>

          {/* Target Pages Status */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Target Pages Status</h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {targetPageStatuses.filter(p => p.hasKeywords).length} Ready
                </span>
                <span className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  {targetPageStatuses.filter(p => !p.hasKeywords).length} Need Keywords
                </span>
              </div>
            </div>

            {targetPageStatuses.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No target pages found for this order</p>
            ) : (
              <div className="space-y-2">
                {targetPageStatuses.map((page) => (
                  <div key={page.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                    page.hasKeywords ? 'bg-gray-50 border-gray-200' : 'bg-yellow-50 border-yellow-200'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedPages.has(page.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedPages);
                        if (e.target.checked) {
                          newSelected.add(page.id);
                        } else {
                          newSelected.delete(page.id);
                        }
                        setSelectedPages(newSelected);
                      }}
                      disabled={page.hasKeywords}
                      className="rounded text-indigo-600"
                    />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-sm">{page.url}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {page.clientName}
                        </span>
                        {page.hasKeywords ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <KeyRound className="h-3 w-3" />
                            {page.keywordCount} keywords
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <KeyRound className="h-3 w-3" />
                            No keywords
                          </span>
                        )}
                        {page.hasDescription ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <FileText className="h-3 w-3" />
                            Has description
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-gray-400">
                            <FileText className="h-3 w-3" />
                            No description
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generate Keywords Button */}
            {!allPagesHaveKeywords && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  {selectedPagesNeedingKeywords.length > 0 
                    ? `${selectedPagesNeedingKeywords.length} selected pages need keywords`
                    : 'Select pages to generate keywords'
                  }
                </p>
                <button
                  onClick={generateKeywordsForSelected}
                  disabled={generatingKeywords || selectedPagesNeedingKeywords.length === 0}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingKeywords ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {currentProcessingPage ? 'Processing...' : 'Generating...'}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Keywords
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Assign To (Optional) */}
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Assignment (Optional)</h2>
            <UserSelector
              value={assignedTo}
              onChange={setAssignedTo}
              placeholder="Select a user to assign bulk analysis projects to"
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-2">
              Leave empty to create unassigned projects
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push(`/orders/${order.id}`)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmOrder}
              disabled={!allPagesHaveKeywords || confirmingOrder}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {confirmingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin inline" />
                  Confirming...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2 inline" />
                  Confirm Order
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}