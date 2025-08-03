'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService, type AuthSession } from '@/lib/auth';
import { 
  ArrowLeft, Loader2, CheckCircle, XCircle, Globe, LinkIcon, 
  AlertCircle, Save, ExternalLink, Target
} from 'lucide-react';

interface SiteSubmission {
  id: string;
  domainId: string;
  domain?: {
    id: string;
    domain: string;
    dr?: number;
    traffic?: number;
    status?: string;
  };
  targetPageUrl?: string;
  anchorText?: string;
  submissionStatus: string;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
}

export default function SiteSelectionsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const groupId = params.groupId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submissions, setSubmissions] = useState<SiteSubmission[]>([]);
  const [suggestedSites, setSuggestedSites] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [orderGroup, setOrderGroup] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const currentSession = AuthService.getSession();
      if (!currentSession) {
        router.push('/login');
        return;
      }
      setSession(currentSession);
      loadData();
    };
    
    checkAuth();
  }, [orderId, groupId]);

  const loadData = async () => {
    try {
      // Load site selections data
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/site-selections`);
      if (!response.ok) {
        throw new Error('Failed to load site selections');
      }
      
      const data = await response.json();
      setSubmissions(data.currentSelections || []);
      setSuggestedSites(data.suggested || []);
      
      // Load order group details
      const groupResponse = await fetch(`/api/orders/${orderId}/groups/${groupId}`);
      if (groupResponse.ok) {
        const groupData = await groupResponse.json();
        setOrderGroup(groupData.orderGroup);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setMessage({ type: 'error', text: 'Failed to load site selections' });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (submissionId: string, newStatus: string) => {
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, submissionStatus: newStatus }
          : sub
      )
    );
  };

  const handleFieldChange = (submissionId: string, field: string, value: string) => {
    setSubmissions(prev => 
      prev.map(sub => 
        sub.id === submissionId 
          ? { ...sub, [field]: value }
          : sub
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      // Transform submissions to the expected format
      const selections = submissions.map(sub => ({
        domainId: sub.domainId,
        status: sub.submissionStatus === 'client_approved' ? 'approved' :
                sub.submissionStatus === 'client_rejected' ? 'rejected' : 'pending',
        targetPageUrl: sub.targetPageUrl,
        anchorText: sub.anchorText,
        reviewNotes: sub.clientReviewNotes
      }));
      
      const response = await fetch(`/api/orders/${orderId}/groups/${groupId}/site-selections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selections })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save selections');
      }
      
      const result = await response.json();
      setMessage({ 
        type: 'success', 
        text: result.message || 'Site selections saved successfully' 
      });
      
      // Reload data to get updated state
      await loadData();
    } catch (err) {
      console.error('Error saving selections:', err);
      setMessage({ type: 'error', text: 'Failed to save selections' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <Link
                href={`/orders/${orderId}/internal`}
                className="text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">
                Site Selections
              </h1>
            </div>
            
            {orderGroup && (
              <div className="text-sm text-gray-600">
                <span className="font-medium">{orderGroup.client?.name}</span> • 
                <span className="ml-2">{orderGroup.linkCount} links required</span>
              </div>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
              message.type === 'error' ? 'bg-red-50 text-red-800' :
              message.type === 'success' ? 'bg-green-50 text-green-800' :
              'bg-blue-50 text-blue-800'
            }`}>
              <AlertCircle className="h-5 w-5 mt-0.5" />
              <div className="flex-1">{message.text}</div>
            </div>
          )}

          {/* Site Submissions */}
          {submissions.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="p-6">
                <h2 className="text-lg font-semibold mb-4">Current Submissions</h2>
                
                <div className="space-y-4">
                  {submissions.map((submission) => (
                    <div key={submission.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium text-gray-900 flex items-center gap-2">
                            <Globe className="h-4 w-4 text-gray-400" />
                            {submission.domain?.domain || submission.domainId}
                          </h3>
                          {submission.domain && (
                            <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                              {submission.domain.dr && <span>DR: {submission.domain.dr}</span>}
                              {submission.domain.traffic && <span>Traffic: {submission.domain.traffic.toLocaleString()}</span>}
                            </div>
                          )}
                        </div>
                        
                        <select
                          value={submission.submissionStatus}
                          onChange={(e) => handleStatusChange(submission.id, e.target.value)}
                          className={`px-3 py-1 rounded-md text-sm font-medium border ${
                            submission.submissionStatus === 'client_approved' 
                              ? 'bg-green-50 text-green-800 border-green-200' 
                              : submission.submissionStatus === 'client_rejected'
                              ? 'bg-red-50 text-red-800 border-red-200'
                              : 'bg-yellow-50 text-yellow-800 border-yellow-200'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="client_approved">Approved</option>
                          <option value="client_rejected">Rejected</option>
                        </select>
                      </div>
                      
                      {submission.submissionStatus === 'client_approved' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <Target className="h-4 w-4 inline mr-1" />
                              Target Page URL
                            </label>
                            <input
                              type="text"
                              value={submission.targetPageUrl || ''}
                              onChange={(e) => handleFieldChange(submission.id, 'targetPageUrl', e.target.value)}
                              placeholder="https://example.com/page"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              <LinkIcon className="h-4 w-4 inline mr-1" />
                              Anchor Text
                            </label>
                            <input
                              type="text"
                              value={submission.anchorText || ''}
                              onChange={(e) => handleFieldChange(submission.id, 'anchorText', e.target.value)}
                              placeholder="Link text"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>
                      )}
                      
                      {submission.submissionStatus === 'client_rejected' && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Rejection Reason
                          </label>
                          <textarea
                            value={submission.clientReviewNotes || ''}
                            onChange={(e) => handleFieldChange(submission.id, 'clientReviewNotes', e.target.value)}
                            placeholder="Please provide a reason for rejection..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                            rows={2}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
              <p className="text-gray-500">No site submissions yet for this order group.</p>
              {orderGroup?.bulkAnalysisProjectId && (
                <Link
                  href={`/clients/${orderGroup.clientId}/bulk-analysis/projects/${orderGroup.bulkAnalysisProjectId}`}
                  className="inline-flex items-center mt-4 text-blue-600 hover:text-blue-800"
                >
                  Go to Bulk Analysis
                  <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}