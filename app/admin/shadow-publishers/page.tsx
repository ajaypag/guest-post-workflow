'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import AdminHeader from '@/components/AdminHeader';

interface EmailLog {
  id: string;
  emailFrom: string;
  emailSubject: string;
  receivedAt: string;
  status: string;
  confidenceScore: string;
  parsedData: any;
  errorMessage?: string;
}

interface ReviewQueueItem {
  id: string;
  logId: string;
  priority: number;
  status: string;
  queueReason: string;
  suggestedActions: any;
  autoApproveAt?: string;
  emailLog?: EmailLog;
}

interface ShadowPublisher {
  id: string;
  email: string;
  contactName?: string;
  companyName?: string;
  accountStatus: string;
  source: string;
  emailVerified: boolean;
  invitationToken?: string;
  invitationSentAt?: string;
  claimedAt?: string;
  createdAt: string;
  websites?: any[];
  offerings?: any[];
}

export default function ShadowPublishersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueueItem[]>([]);
  const [shadowPublishers, setShadowPublishers] = useState<ShadowPublisher[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [selectedTab, setSelectedTab] = useState<'queue' | 'publishers' | 'logs'>('queue');
  const [stats, setStats] = useState({
    pendingReview: 0,
    autoApproved: 0,
    shadowPublishers: 0,
    claimedPublishers: 0,
    failedEmails: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch review queue
      const queueRes = await fetch('/api/admin/shadow-publishers/review-queue');
      if (!queueRes.ok) throw new Error('Failed to fetch review queue');
      const queueData = await queueRes.json();
      setReviewQueue(queueData.items || []);
      
      // Fetch shadow publishers
      const publishersRes = await fetch('/api/admin/shadow-publishers');
      if (!publishersRes.ok) throw new Error('Failed to fetch shadow publishers');
      const publishersData = await publishersRes.json();
      setShadowPublishers(publishersData.publishers || []);
      
      // Fetch email logs
      const logsRes = await fetch('/api/admin/shadow-publishers/email-logs');
      if (!logsRes.ok) throw new Error('Failed to fetch email logs');
      const logsData = await logsRes.json();
      setEmailLogs(logsData.logs || []);
      
      // Calculate stats
      setStats({
        pendingReview: queueData.items?.filter((i: ReviewQueueItem) => i.status === 'pending').length || 0,
        autoApproved: queueData.items?.filter((i: ReviewQueueItem) => i.autoApproveAt).length || 0,
        shadowPublishers: publishersData.publishers?.filter((p: ShadowPublisher) => p.accountStatus === 'shadow').length || 0,
        claimedPublishers: publishersData.publishers?.filter((p: ShadowPublisher) => p.accountStatus === 'active').length || 0,
        failedEmails: logsData.logs?.filter((l: EmailLog) => l.status === 'failed').length || 0,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (queueItemId: string) => {
    try {
      const res = await fetch(`/api/admin/shadow-publishers/review-queue/${queueItemId}/approve`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to approve item');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve');
    }
  };

  const handleReject = async (queueItemId: string) => {
    try {
      const res = await fetch(`/api/admin/shadow-publishers/review-queue/${queueItemId}/reject`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to reject item');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    }
  };

  const handleSendInvitation = async (publisherId: string) => {
    try {
      const res = await fetch(`/api/admin/shadow-publishers/${publisherId}/send-invitation`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to send invitation');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  };

  const handleReprocess = async (emailLogId: string) => {
    try {
      const res = await fetch(`/api/admin/shadow-publishers/email-logs/${emailLogId}/reprocess`, {
        method: 'POST',
      });
      
      if (!res.ok) throw new Error('Failed to reprocess email');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reprocess');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'text-red-600';
    if (priority >= 5) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      case 'failed': return 'text-red-600';
      case 'shadow': return 'text-blue-600';
      case 'active': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">Loading shadow publisher data...</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <AdminHeader />
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Shadow Publisher Management</h1>
          <Button onClick={fetchData}>Refresh</Button>
        </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingReview}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Auto-Approve Queue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.autoApproved}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Shadow Publishers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.shadowPublishers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Claimed Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.claimedPublishers}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failedEmails}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b">
        <button
          className={`pb-2 px-1 ${selectedTab === 'queue' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          onClick={() => setSelectedTab('queue')}
        >
          Review Queue
        </button>
        <button
          className={`pb-2 px-1 ${selectedTab === 'publishers' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          onClick={() => setSelectedTab('publishers')}
        >
          Shadow Publishers
        </button>
        <button
          className={`pb-2 px-1 ${selectedTab === 'logs' ? 'border-b-2 border-blue-600 font-semibold' : ''}`}
          onClick={() => setSelectedTab('logs')}
        >
          Email Logs
        </button>
      </div>

      {/* Tab Content */}
      {selectedTab === 'queue' && (
        <Card>
          <CardHeader>
            <CardTitle>Review Queue</CardTitle>
            <CardDescription>
              Email extractions requiring manual review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reviewQueue.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No items in review queue
                </div>
              ) : (
                reviewQueue.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className={`font-semibold ${getPriorityColor(item.priority)}`}>
                            Priority: {item.priority}
                          </span>
                          <span className={`${getStatusColor(item.status)}`}>
                            {item.status}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          Reason: {item.queueReason}
                        </div>
                        {item.autoApproveAt && (
                          <div className="text-sm text-blue-600">
                            Auto-approve at: {formatDate(item.autoApproveAt)}
                          </div>
                        )}
                      </div>
                      
                      {item.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(item.id)}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(item.id)}
                          >
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                    
                    {item.suggestedActions && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="font-medium mb-1">Extracted Data:</div>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(item.suggestedActions, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTab === 'publishers' && (
        <Card>
          <CardHeader>
            <CardTitle>Shadow Publishers</CardTitle>
            <CardDescription>
              Publishers created from email responses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {shadowPublishers.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No shadow publishers found
                </div>
              ) : (
                shadowPublishers.map((publisher) => (
                  <div key={publisher.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-semibold">{publisher.email}</div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {publisher.contactName && <div>Contact: {publisher.contactName}</div>}
                          {publisher.companyName && <div>Company: {publisher.companyName}</div>}
                          <div className={getStatusColor(publisher.accountStatus)}>
                            Status: {publisher.accountStatus}
                          </div>
                          <div>Source: {publisher.source}</div>
                          <div>Created: {formatDate(publisher.createdAt)}</div>
                          {publisher.claimedAt && (
                            <div className="text-green-600">
                              Claimed: {formatDate(publisher.claimedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {publisher.accountStatus === 'shadow' && !publisher.invitationSentAt && (
                        <Button
                          size="sm"
                          onClick={() => handleSendInvitation(publisher.id)}
                        >
                          Send Invitation
                        </Button>
                      )}
                      
                      {publisher.invitationToken && (
                        <div className="text-sm">
                          <div className="text-gray-600">Invitation sent</div>
                          {publisher.invitationSentAt && (
                            <div className="text-xs">{formatDate(publisher.invitationSentAt)}</div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {publisher.websites && publisher.websites.length > 0 && (
                      <div className="bg-gray-50 p-3 rounded">
                        <div className="font-medium text-sm mb-1">Websites:</div>
                        <div className="text-sm space-y-1">
                          {publisher.websites.map((w: any, idx: number) => (
                            <div key={idx}>{w.domain}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle>Email Processing Logs</CardTitle>
            <CardDescription>
              Recent email webhook processing history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emailLogs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No email logs found
                </div>
              ) : (
                emailLogs.map((log) => (
                  <div key={log.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-semibold">{log.emailFrom}</div>
                        <div className="text-sm text-gray-600">
                          Subject: {log.emailSubject}
                        </div>
                        <div className="text-sm text-gray-600">
                          Received: {formatDate(log.receivedAt)}
                        </div>
                        <div className={`text-sm ${getStatusColor(log.status)}`}>
                          Status: {log.status}
                        </div>
                        {log.confidenceScore && (
                          <div className="text-sm">
                            Confidence: {(parseFloat(log.confidenceScore) * 100).toFixed(0)}%
                          </div>
                        )}
                        {log.errorMessage && (
                          <div className="text-sm text-red-600">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </div>
                      
                      {log.status === 'failed' && (
                        <Button
                          size="sm"
                          onClick={() => handleReprocess(log.id)}
                        >
                          Reprocess
                        </Button>
                      )}
                    </div>
                    
                    {log.parsedData && (
                      <div className="bg-gray-50 p-3 rounded text-sm">
                        <div className="font-medium mb-1">Parsed Data:</div>
                        <pre className="text-xs overflow-x-auto">
                          {JSON.stringify(log.parsedData, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}