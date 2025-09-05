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
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Search,
  CheckSquare,
  Square,
  Activity,
  History
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
  lastAnalyzedAt?: string;
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
  onAnalyze?: (campaignIds: string[]) => void;
}

export function CampaignStatusView({ workspace = 'main', onAnalyze }: CampaignStatusViewProps) {
  const [campaigns, setCampaigns] = useState<CampaignStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [selectedCampaigns, setSelectedCampaigns] = useState<Set<string>>(new Set());
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{totalNew: number; message: string} | null>(null);
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

  const handleCampaignToggle = (campaignId: string) => {
    setSelectedCampaigns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(campaignId)) {
        newSet.delete(campaignId);
      } else {
        newSet.add(campaignId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedCampaigns.size === campaigns.length) {
      setSelectedCampaigns(new Set());
    } else {
      setSelectedCampaigns(new Set(campaigns.map(c => c.campaignId)));
    }
  };

  const handleSelectWithActivity = () => {
    const withActivity = campaigns.filter(c => (c.newReplies || 0) > 0);
    setSelectedCampaigns(new Set(withActivity.map(c => c.campaignId)));
  };

  const handleSelectUnchecked = () => {
    const unchecked = campaigns.filter(c => !c.lastAnalyzedAt);
    setSelectedCampaigns(new Set(unchecked.map(c => c.campaignId)));
  };

  const handleSmartBulkProcess = async () => {
    console.log('🤖 Smart Bulk Process initiated for campaigns:', Array.from(selectedCampaigns));
    
    if (selectedCampaigns.size === 0) return;
    
    const campaignIds = Array.from(selectedCampaigns);
    setImporting('bulk'); // Using 'bulk' as a special indicator
    
    // Show starting notification
    const startMessage = `🤖 Smart processing ${campaignIds.length} campaigns...`;
    setNotifications(prev => [...prev, startMessage]);
    
    try {
      // Process each selected campaign
      for (const campaignId of campaignIds) {
        const campaign = campaigns.find(c => c.campaignId === campaignId);
        if (!campaign) continue;
        
        console.log(`Processing campaign: ${campaign.campaignName}`);
        
        // Import replies from this campaign
        const response = await fetch('/api/admin/manyreach/campaign-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'import-new',
            workspace,
            campaignId,
          })
        });
        
        if (!response.ok) {
          console.error(`Failed to process campaign ${campaignId}`);
          continue;
        }
        
        const result = await response.json();
        console.log(`Campaign ${campaignId} processed:`, result);
        
        // Small delay between campaigns to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Success notification
      const successMessage = `✅ Successfully processed ${campaignIds.length} campaigns!`;
      setNotifications(prev => [...prev, successMessage]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== successMessage));
      }, 5000);
      
      // Refresh the campaign list
      await fetchCampaignStatus();
      
      // Clear selection
      setSelectedCampaigns(new Set());
      
    } catch (error) {
      console.error('Smart bulk processing error:', error);
      const errorMessage = `❌ Smart processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setNotifications(prev => [...prev, errorMessage]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== errorMessage));
      }, 5000);
    } finally {
      setImporting(null);
      // Clear the start message
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== startMessage));
      }, 1000);
    }
  };

  const handleAnalyzeSelected = async () => {
    console.log('🔵 handleAnalyzeSelected called, selectedCampaigns:', selectedCampaigns);
    
    if (selectedCampaigns.size === 0) {
      console.log('⚠️ No campaigns selected');
      setNotifications(prev => [...prev, '⚠️ Please select at least one campaign to analyze']);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => !n.includes('Please select')));
      }, 3000);
      return;
    }

    setAnalyzing(true);
    const campaignIds = Array.from(selectedCampaigns);
    console.log('📊 Analyzing campaigns:', campaignIds);
    
    // Show starting notification
    const startMessage = `🔍 Analyzing ${campaignIds.length} campaigns for new emails...`;
    setNotifications(prev => [...prev, startMessage]);
    
    try {
      const url = `/api/admin/manyreach/bulk-analysis?workspace=${workspace}&campaignIds=${campaignIds.join(',')}`;
      console.log('🌐 Fetching:', url);
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Response not OK:', response.status);
        throw new Error(`Analysis failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('✅ Analysis response:', data);
      console.log('📊 Analysis details:', {
        totalNewEmails: data.analysis?.totalNewEmails,
        totalDuplicates: data.analysis?.totalDuplicates,
        totalIgnored: data.analysis?.totalIgnored,
        campaignBreakdownLength: data.analysis?.campaignBreakdown?.length,
        firstCampaign: data.analysis?.campaignBreakdown?.[0]
      });
      
      // Remove start message
      setNotifications(prev => prev.filter(n => n !== startMessage));
      
      if (onAnalyze) {
        onAnalyze(campaignIds);
      }
      
      // Show detailed results
      const totalNew = data.analysis?.totalNewEmails || 0;
      const campaignBreakdown = data.analysis?.campaignBreakdown || [];
      
      console.log('📊 Processing results - totalNew:', totalNew, 'type:', typeof totalNew);
      
      // Store the result for persistent display
      if (totalNew > 0) {
        const campaignsWithNew = campaignBreakdown.filter((c: any) => c.newEmails > 0);
        const message = `✅ Found ${totalNew} new emails across ${campaignsWithNew.length} campaigns`;
        setAnalysisResult({ totalNew, message });
        
        // Show individual campaign results
        campaignsWithNew.forEach((campaign: any) => {
          const campaignMessage = `📧 ${campaign.campaignName}: ${campaign.newEmails} new emails`;
          console.log('📧 Campaign result:', campaignMessage);
        });
      } else {
        const message = `ℹ️ No new emails found in ${campaignIds.length} campaigns. All emails have already been imported.`;
        setAnalysisResult({ totalNew: 0, message });
        console.log('ℹ️ Analysis complete:', message);
      }
      
      // Clear result after 10 seconds
      setTimeout(() => {
        setAnalysisResult(null);
      }, 10000);
      
      // Clear selection after successful analysis
      setSelectedCampaigns(new Set());
      
      // Refresh to update last analyzed timestamps and new reply counts
      await fetchCampaignStatus();
      
    } catch (error) {
      console.error('Analysis error:', error);
      // Remove start message
      setNotifications(prev => prev.filter(n => n !== startMessage));
      
      const message = `❌ Failed to analyze campaigns: ${error instanceof Error ? error.message : 'Unknown error'}`;
      setNotifications(prev => [...prev, message]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n !== message));
      }, 5000);
    } finally {
      setAnalyzing(false);
    }
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

      {/* Analysis Result */}
      {analysisResult && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {analysisResult.totalNew > 0 ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  Analysis Complete
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-blue-600" />
                  Analysis Complete
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-base">{analysisResult.message}</p>
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
          
          {/* Smart Selection Buttons */}
          {campaigns.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
              >
                {selectedCampaigns.size === campaigns.length ? (
                  <>
                    <Square className="h-3 w-3 mr-2" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-3 w-3 mr-2" />
                    Select All
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectWithActivity}
                disabled={campaigns.filter(c => (c.newReplies || 0) > 0).length === 0}
              >
                <Activity className="h-3 w-3 mr-2" />
                Select with Activity ({campaigns.filter(c => (c.newReplies || 0) > 0).length})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectUnchecked}
                disabled={campaigns.filter(c => !c.lastAnalyzedAt).length === 0}
              >
                <History className="h-3 w-3 mr-2" />
                Select Unchecked ({campaigns.filter(c => !c.lastAnalyzedAt).length})
              </Button>
              
              <div className="flex-1" />
              <Button
                variant="default"
                size="sm"
                onClick={handleAnalyzeSelected}
                disabled={analyzing || selectedCampaigns.size === 0}
              >
                {analyzing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    Analyzing {selectedCampaigns.size} campaigns...
                  </>
                ) : (
                  <>
                    <Search className="h-3 w-3 mr-2" />
                    Check for new emails{selectedCampaigns.size > 0 ? ` (${selectedCampaigns.size})` : ''}
                  </>
                )}
              </Button>
              
              {/* Smart Bulk Process Button */}
              {selectedCampaigns.size > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSmartBulkProcess}
                  disabled={analyzing || Boolean(importing)}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                      Processing {selectedCampaigns.size} campaigns...
                    </>
                  ) : (
                    <>
                      🤖 Smart Bulk Process ({selectedCampaigns.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
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
                  className={`border rounded-lg p-4 transition-colors ${
                    selectedCampaigns.has(campaign.campaignId) ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Checkbox */}
                      <button
                        onClick={() => handleCampaignToggle(campaign.campaignId)}
                        className="mt-1 focus:outline-none"
                      >
                        {selectedCampaigns.has(campaign.campaignId) ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                        )}
                      </button>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">{campaign.campaignName}</h3>
                          <Badge variant="secondary" className="text-xs">
                            {(campaign as any).workspaceDisplay || (campaign as any).workspace || campaign.workspace}
                          </Badge>
                          {campaign.newReplies && campaign.newReplies > 0 && (
                            <Badge variant="default" className="bg-green-600">
                              {campaign.newReplies} new
                            </Badge>
                          )}
                          {campaign.lastAnalyzedAt && (
                            <Badge variant="outline" className="text-xs">
                              <History className="h-3 w-3 mr-1" />
                              Checked {formatDate(campaign.lastAnalyzedAt)}
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
                      
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last import: {formatDate(campaign.lastImportAt)}
                          </span>
                          {campaign.lastAnalyzedAt && (
                            <span className="flex items-center gap-1">
                              <Search className="h-3 w-3" />
                              Last analyzed: {formatDate(campaign.lastAnalyzedAt)}
                            </span>
                          )}
                        </div>
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