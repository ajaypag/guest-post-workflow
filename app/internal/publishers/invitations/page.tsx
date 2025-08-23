'use client';

import { useState, useEffect } from 'react';
import { 
  Mail, 
  Send, 
  Users, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
  Filter,
  Search,
  ChevronRight,
  Download,
  Pause,
  Play,
  BarChart3
} from 'lucide-react';

interface ShadowPublisher {
  id: string;
  email: string;
  contactName: string | null;
  companyName: string | null;
  accountStatus: string;
  emailVerified: boolean;
  invitationToken: string | null;
  invitationSentAt: string | null;
  invitationStatus: 'not_sent' | 'sent' | 'opened' | 'clicked' | 'claimed' | 'failed';
  claimedAt: string | null;
  createdAt: string;
  websiteCount: number;
  offeringCount: number;
  source: string;
}

interface SendingStats {
  totalEligible: number;
  sent: number;
  failed: number;
  claimed: number;
  pending: number;
  sendingRate: number;
}

export default function PublisherInvitationsPage() {
  const [publishers, setPublishers] = useState<ShadowPublisher[]>([]);
  const [selectedPublishers, setSelectedPublishers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [paused, setPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [emailPreview, setEmailPreview] = useState<{ html: string; text: string } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [sendingProgress, setSendingProgress] = useState(0);
  const [stats, setStats] = useState<SendingStats>({
    totalEligible: 0,
    sent: 0,
    failed: 0,
    claimed: 0,
    pending: 0,
    sendingRate: 5 // emails per minute
  });

  useEffect(() => {
    loadPublishers();
    loadStats();
  }, []);

  const loadPublishers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/publishers/shadow');
      if (response.ok) {
        const data = await response.json();
        setPublishers(data.publishers || []);
      }
    } catch (error) {
      console.error('Failed to load publishers:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/internal/publishers/invitations/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleSelectAll = () => {
    const filtered = getFilteredPublishers();
    if (selectedPublishers.size === filtered.length) {
      setSelectedPublishers(new Set());
    } else {
      setSelectedPublishers(new Set(filtered.map(p => p.id)));
    }
  };

  const handleSelectPublisher = (id: string) => {
    const newSelected = new Set(selectedPublishers);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPublishers(newSelected);
  };

  const getFilteredPublishers = () => {
    return publishers.filter(publisher => {
      const matchesSearch = searchTerm === '' || 
        publisher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        publisher.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        publisher.companyName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || 
        (filterStatus === 'not_sent' && !publisher.invitationSentAt) ||
        (filterStatus === 'sent' && publisher.invitationSentAt && !publisher.claimedAt) ||
        (filterStatus === 'claimed' && publisher.claimedAt) ||
        (filterStatus === 'failed' && publisher.invitationStatus === 'failed');
      
      return matchesSearch && matchesFilter;
    });
  };

  const previewEmailTemplate = async () => {
    try {
      const response = await fetch('/api/internal/publishers/invitations/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publisherId: Array.from(selectedPublishers)[0] || publishers[0]?.id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setEmailPreview(data);
        setShowPreview(true);
      }
    } catch (error) {
      console.error('Failed to preview email:', error);
    }
  };

  const sendInvitations = async () => {
    if (selectedPublishers.size === 0) {
      alert('Please select publishers to send invitations to');
      return;
    }

    if (!confirm(`Send invitations to ${selectedPublishers.size} publishers?`)) {
      return;
    }

    setSending(true);
    setSendingProgress(0);
    
    const publisherIds = Array.from(selectedPublishers);
    const chunks = [];
    
    // Split into batches
    for (let i = 0; i < publisherIds.length; i += batchSize) {
      chunks.push(publisherIds.slice(i, i + batchSize));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const [index, chunk] of chunks.entries()) {
      if (paused) {
        break;
      }

      try {
        const response = await fetch('/api/internal/publishers/invitations/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ publisherIds: chunk })
        });

        const result = await response.json();
        totalSent += result.sent || 0;
        totalFailed += result.failed || 0;
        
        setSendingProgress(((index + 1) / chunks.length) * 100);
        
        // Update local state
        const sentIds = result.sentIds || [];
        setPublishers(prev => prev.map(p => 
          sentIds.includes(p.id) 
            ? { ...p, invitationSentAt: new Date().toISOString(), invitationStatus: 'sent' as const }
            : p
        ));

        // Rate limiting delay
        if (index < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 60000 / stats.sendingRate));
        }
      } catch (error) {
        console.error('Failed to send batch:', error);
        totalFailed += chunk.length;
      }
    }

    setSending(false);
    setSelectedPublishers(new Set());
    await loadStats();
    
    alert(`Sending complete!\nSent: ${totalSent}\nFailed: ${totalFailed}`);
  };

  const exportData = () => {
    const filtered = getFilteredPublishers();
    const csv = [
      ['Email', 'Contact Name', 'Company', 'Status', 'Invitation Sent', 'Claimed', 'Websites', 'Offerings'],
      ...filtered.map(p => [
        p.email,
        p.contactName || '',
        p.companyName || '',
        p.invitationStatus,
        p.invitationSentAt || '',
        p.claimedAt || '',
        p.websiteCount.toString(),
        p.offeringCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `publisher-invitations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const filteredPublishers = getFilteredPublishers();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Mail className="h-7 w-7 text-indigo-600" />
                Publisher Invitations Manager
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Send and manage invitations to shadow publishers
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={exportData}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={loadPublishers}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Eligible</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.totalEligible}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Sent</p>
                <p className="text-2xl font-semibold text-green-600">{stats.sent}</p>
              </div>
              <Send className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-semibold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Claimed</p>
                <p className="text-2xl font-semibold text-blue-600">{stats.claimed}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-semibold text-red-600">{stats.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by email, name, or company..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Filter */}
              <div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="all">All Publishers</option>
                  <option value="not_sent">Not Invited</option>
                  <option value="sent">Invitation Sent</option>
                  <option value="claimed">Claimed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Batch Size */}
              <div>
                <select
                  value={batchSize}
                  onChange={(e) => setBatchSize(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  disabled={sending}
                >
                  <option value={5}>Batch: 5 emails</option>
                  <option value={10}>Batch: 10 emails</option>
                  <option value={25}>Batch: 25 emails</option>
                  <option value={50}>Batch: 50 emails</option>
                  <option value={100}>Batch: 100 emails</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={previewEmailTemplate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Preview
                </button>
                <button
                  onClick={sendInvitations}
                  disabled={sending || selectedPublishers.size === 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send ({selectedPublishers.size})
                    </>
                  )}
                </button>
                {sending && (
                  <button
                    onClick={() => setPaused(!paused)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {sending && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Sending progress</span>
                  <span>{Math.round(sendingProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${sendingProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Publishers Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-gray-900">
                Shadow Publishers ({filteredPublishers.length})
              </h2>
              <button
                onClick={handleSelectAll}
                className="text-sm text-indigo-600 hover:text-indigo-900"
              >
                {selectedPublishers.size === filteredPublishers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Publisher
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assets
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invitation Sent
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPublishers.map((publisher) => (
                    <tr key={publisher.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedPublishers.has(publisher.id)}
                          onChange={() => handleSelectPublisher(publisher.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {publisher.companyName || 'Unknown Company'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {publisher.contactName || 'No contact name'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{publisher.email}</div>
                        <div className="text-sm text-gray-500">Source: {publisher.source}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {publisher.claimedAt ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Claimed
                          </span>
                        ) : publisher.invitationSentAt ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Not Sent
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{publisher.websiteCount} websites</div>
                        <div>{publisher.offeringCount} offerings</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {publisher.invitationSentAt ? (
                          new Date(publisher.invitationSentAt).toLocaleDateString()
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {!publisher.invitationSentAt && (
                          <button
                            onClick={() => {
                              setSelectedPublishers(new Set([publisher.id]));
                              sendInvitations();
                            }}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Send Invite
                          </button>
                        )}
                        {publisher.invitationSentAt && !publisher.claimedAt && (
                          <button
                            onClick={() => {
                              setSelectedPublishers(new Set([publisher.id]));
                              sendInvitations();
                            }}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            Resend
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Email Preview Modal */}
      {showPreview && emailPreview && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Email Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: emailPreview.html }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}