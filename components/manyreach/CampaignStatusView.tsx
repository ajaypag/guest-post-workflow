'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  Download, 
  AlertCircle, 
  Clock, 
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail
} from 'lucide-react';

interface CampaignStatus {
  campaignId: string;
  campaignName: string;
  workspace: string;
  totalProspects: number;
  repliedProspects: number;
  lastImportAt?: string;
  totalImported: number;
  totalIgnored: number;
  newReplies?: number;
}

interface ImportProgress {
  campaignId: string;
  status: 'processing' | 'completed' | 'error';
  processed: number;
  total: number;
  currentEmail?: string;
  message?: string;
}

interface CampaignStatusViewProps {
  workspace?: string;
}

export function CampaignStatusView({ workspace = 'main' }: CampaignStatusViewProps) {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchCampaignStatus = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const response = await fetch(`/api/admin/manyreach/campaign-status?workspace=${workspace}`);
      const data = await response.json();
      
      if (data.campaigns) {
        setCampaigns(data.campaigns);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error('Error fetching campaign status:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignStatus();
    
    // Set up auto-refresh every 30 seconds
    refreshInterval.current = setInterval(() => {
      // Only refresh if not currently importing
      if (!importing && !importProgress) {
        fetchCampaignStatus(false); // Don't show loading indicator for auto-refresh
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [workspace]);

  useEffect(() => {
    // Cleanup polling on unmount
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, []);

  const startImportPolling = (campaignId: string) => {
    // Poll every 2 seconds for import progress
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`/api/admin/manyreach/import-progress?campaignId=${campaignId}&workspace=${workspace}`);
        const data = await response.json();
        
        if (data.progress) {
          setImportProgress(data.progress);
          
          if (data.progress.status === 'completed' || data.progress.status === 'error') {
            // Stop polling when done
            if (pollingInterval.current) {
              clearInterval(pollingInterval.current);
              pollingInterval.current = null;
            }
            
            // Show completion notification
            const message = data.progress.status === 'completed' 
              ? `✅ Successfully imported ${data.progress.processed} emails from "${campaigns.find(c => c.campaignId === campaignId)?.campaignName}"`
              : `❌ Import failed: ${data.progress.message}`;
            
            setNotifications(prev => [...prev, message]);
            
            // Clear import progress after 3 seconds
            setTimeout(() => {
              setImportProgress(null);
              setImporting(null);
              fetchCampaignStatus(); // Refresh the view
            }, 3000);
            
            // Clear notification after 5 seconds
            setTimeout(() => {
              setNotifications(prev => prev.filter(n => n !== message));
            }, 5000);
          }
        }
      } catch (error) {
        console.error('Error polling import progress:', error);
      }
    }, 2000);
  };

  const handleImport = async (campaignId: string, onlyNew: boolean = false) => {
    setImporting(campaignId);
    
    const campaign = campaigns.find(c => c.campaignId === campaignId);
    if (!campaign) return;
    
    // Set initial progress state
    setImportProgress({
      campaignId,
      status: 'processing',
      processed: 0,
      total: campaign.repliedProspects || 0,
      currentEmail: 'Starting import...'
    });
    
    // Show starting notification
    const startMessage = `🚀 Starting import for "${campaign.campaignName}"...`;
    setNotifications(prev => [...prev, startMessage]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== startMessage));
    }, 3000);
    
    try {
      const sinceDate = onlyNew && campaign.lastImportAt ? campaign.lastImportAt : undefined;
      
      // Start the import
      const response = await fetch('/api/admin/manyreach/campaign-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-new',
          workspace,
          campaignId,
          sinceDate
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Start polling for progress
        startImportPolling(campaignId);
      } else {
        setImportProgress({
          campaignId,
          status: 'error',
          processed: 0,
          total: 0,
          message: result.error
        });
        setTimeout(() => {
          setImportProgress(null);
          setImporting(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Import error:', error);
      setImportProgress({
        campaignId,
        status: 'error',
        processed: 0,
        total: 0,
        message: 'Import failed'
      });
      setTimeout(() => {
        setImportProgress(null);
        setImporting(null);
      }, 3000);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading campaign status...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
          {notifications.map((notification, index) => (
            <div
              key={index}
              className="bg-white border rounded-lg shadow-lg p-4 animate-in slide-in-from-right"
            >
              {notification}
            </div>
          ))}
        </div>
      )}
      
      {/* Import Progress Modal */}
      {importProgress && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Importing Emails
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span className="font-medium">
                  {importProgress.processed} / {importProgress.total}
                </span>
              </div>
              
              <Progress 
                value={(importProgress.processed / Math.max(importProgress.total, 1)) * 100} 
                className="h-2"
              />
              
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {importProgress.status === 'processing' ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{importProgress.currentEmail || 'Processing...'}</span>
                  </>
                ) : importProgress.status === 'completed' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Import completed successfully!</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-600" />
                    <span>{importProgress.message || 'Import failed'}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Import Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-2xl font-bold">{summary.totalCampaigns}</div>
                <div className="text-sm text-gray-500">Total Campaigns</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {summary.totalNewReplies}
                </div>
                <div className="text-sm text-gray-500">New Replies</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{summary.totalImported}</div>
                <div className="text-sm text-gray-500">Total Imported</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-400">
                  {summary.totalIgnored}
                </div>
                <div className="text-sm text-gray-500">Ignored</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {summary.campaignsWithNewReplies}
                </div>
                <div className="text-sm text-gray-500">Need Import</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Campaign List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Campaigns</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Auto-refreshing every 30s</span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchCampaignStatus()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh Now
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No campaigns found in workspace "{workspace}"
              </div>
            ) : (
              campaigns.map((campaign) => (
                <div 
                  key={campaign.campaignId}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{campaign.campaignName}</h3>
                        {campaign.newReplies && campaign.newReplies > 0 && (
                          <Badge variant="default" className="bg-green-600">
                            {campaign.newReplies} new
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <span>
                          {campaign.repliedProspects} / {campaign.totalProspects} replied
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {campaign.totalImported} imported
                        </span>
                        {campaign.totalIgnored > 0 && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <EyeOff className="h-3 w-3" />
                              {campaign.totalIgnored} ignored
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        Last import: {formatDate(campaign.lastImportAt)}
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {campaign.newReplies && campaign.newReplies > 0 && (
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleImport(campaign.campaignId, true)}
                          disabled={importing === campaign.campaignId}
                        >
                          {importing === campaign.campaignId ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Download className="h-4 w-4 mr-2" />
                              Import New ({campaign.newReplies})
                            </>
                          )}
                        </Button>
                      )}
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleImport(campaign.campaignId, false)}
                        disabled={importing === campaign.campaignId}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Import All
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}