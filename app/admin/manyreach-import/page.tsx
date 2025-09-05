'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, CheckCircle2, CheckCircle, XCircle, AlertCircle, Eye, RefreshCw, Clock, Activity, ChevronLeft, Mail, Key, FileText, BarChart, Search } from 'lucide-react';
import { CampaignStatusView } from '@/components/manyreach/CampaignStatusView';
import { DraftsListInfinite } from '@/components/manyreach/DraftsListInfinite';
import { DuplicateDetectionPreview } from '@/components/manyreach/DuplicateDetectionPreview';
import { DraftEditor } from '@/components/manyreach/DraftEditor';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
// Simple toast notification
const useToast = () => ({
  toast: ({ title, description, variant }: any) => {
    if (variant === 'destructive') {
      console.error(`${title}: ${description}`);
      alert(`Error: ${description}`);
    } else {
      console.log(`${title}: ${description}`);
      // For success messages, just log to console
      console.log(`✅ ${title}: ${description}`);
    }
  }
});

interface Campaign {
  id: string;
  name: string;
  status: string;
  totalProspects: number;
  sentCount: number;
  repliedCount: number;
  importedCount: number;
  draftCount: number;
  pendingCount: number;
  approvedCount: number;
  campaignId?: string;
  workspace?: string;
  workspaceDisplay?: string;
}

interface Draft {
  id: string;
  email_log_id?: string;
  parsed_data: any;
  edited_data?: any;
  status: 'pending' | 'approved' | 'rejected';
  review_notes?: string;
  created_at: string;
  email_from: string;
  email_subject: string;
  campaign_name: string;
  raw_content?: string;
  html_content?: string;
}

export default function ManyReachImportPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState('status');
  
  // Email processing controls
  const [emailLimit, setEmailLimit] = useState<number>(10);
  const [unlimitedEmails, setUnlimitedEmails] = useState<boolean>(false);
  const [onlyReplied, setOnlyReplied] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  // Enhanced Draft filtering
  const [showOnlyWithOffers, setShowOnlyWithOffers] = useState<boolean>(false);
  const [showOnlyWithPricing, setShowOnlyWithPricing] = useState<boolean>(false);
  const [offerTypeFilter, setOfferTypeFilter] = useState<'all' | 'guest_post' | 'link_insertion' | 'link_exchange'>('all');
  const [priceRangeFilter, setPriceRangeFilter] = useState<'all' | '0-100' | '100-500' | '500-1000' | '1000+'>('all');
  const [minPriceFilter, setMinPriceFilter] = useState<number>(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(10000);
  
  // Bulk operations
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Smart bulk campaign processing
  const [smartBulkProcessing, setSmartBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{current: number; total: number; campaign?: string}>({current: 0, total: 0});
  
  // Bulk analysis state
  const [bulkAnalysisData, setBulkAnalysisData] = useState<any>(null);
  const [showBulkAnalysis, setShowBulkAnalysis] = useState(false);
  const [analyzingCampaigns, setAnalyzingCampaigns] = useState(false);
  const [selectedCampaignsForAnalysis, setSelectedCampaignsForAnalysis] = useState<string[]>([]);
  
  const { toast } = useToast();

  // Enhanced draft filtering function
  const filterDrafts = (draftsList: Draft[]) => {
    return draftsList.filter(draft => {
      const data = draft.edited_data || draft.parsed_data;
      
      // Basic offer filter
      if (showOnlyWithOffers && !data.hasOffer) return false;
      
      // Pricing filter
      if (showOnlyWithPricing) {
        const hasPrice = data.offerings?.some((o: any) => 
          o.basePrice !== null && o.basePrice !== undefined && o.basePrice > 0
        );
        if (!hasPrice) return false;
      }
      
      // Offer type filter (guest posts, link insertion, etc.)
      if (offerTypeFilter !== 'all') {
        const hasMatchingOfferType = data.offerings?.some((o: any) => 
          o.offeringType === offerTypeFilter
        );
        if (!hasMatchingOfferType) return false;
      }
      
      // Price range filter
      if (priceRangeFilter !== 'all' && data.offerings) {
        const prices = data.offerings
          .filter((o: any) => o.basePrice !== null && o.basePrice !== undefined)
          .map((o: any) => o.basePrice);
          
        if (prices.length === 0) return false;
        
        const minPrice = Math.min(...prices);
        
        switch (priceRangeFilter) {
          case '0-100':
            if (minPrice > 100) return false;
            break;
          case '100-500':
            if (minPrice < 100 || minPrice > 500) return false;
            break;
          case '500-1000':
            if (minPrice < 500 || minPrice > 1000) return false;
            break;
          case '1000+':
            if (minPrice < 1000) return false;
            break;
        }
      }
      
      // Custom price range filter
      if (data.offerings && (minPriceFilter > 0 || maxPriceFilter < 10000)) {
        const prices = data.offerings
          .filter((o: any) => o.basePrice !== null && o.basePrice !== undefined)
          .map((o: any) => o.basePrice);
          
        if (prices.length === 0) return false;
        
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        
        if (minPrice < minPriceFilter || maxPrice > maxPriceFilter) return false;
      }
      
      return true;
    });
  };

  // Analyze all campaigns to see what's new and avoid duplicates
  const analyzeBulkCampaigns = async () => {
    setAnalyzingCampaigns(true);
    setShowBulkAnalysis(false);
    setBulkAnalysisData(null);
    
    try {
      const response = await fetch('/api/admin/manyreach/bulk-analysis?workspace=all');
      
      if (!response.ok) {
        throw new Error('Failed to analyze campaigns');
      }
      
      const data = await response.json();
      setBulkAnalysisData(data.analysis);
      setShowBulkAnalysis(true);
      
      if (data.analysis.totalNewEmails === 0) {
        toast({
          title: 'All caught up! 🎉',
          description: 'No new emails to import. All replies have been processed.',
        });
      } else {
        toast({
          title: `Found ${data.analysis.totalNewEmails} new emails! 📧`,
          description: `${data.analysis.totalDuplicates} duplicates avoided, ${data.analysis.totalIgnored} ignored`,
        });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: 'Analysis failed',
        description: error instanceof Error ? error.message : 'Failed to analyze campaigns',
        variant: 'destructive'
      });
    } finally {
      setAnalyzingCampaigns(false);
    }
  };
  
  // Import only new emails from selected campaigns
  const importNewEmailsFromAnalysis = async (campaignIds: string[]) => {
    setSmartBulkProcessing(true);
    setBulkProgress({ current: 0, total: campaignIds.length });
    
    try {
      const response = await fetch('/api/admin/manyreach/bulk-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-new-emails',
          workspace: 'all',
          campaignIds
        })
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Import complete! ✅',
        description: `Imported ${data.totalImported} new emails from ${campaignIds.length} campaigns`,
      });
      
      // Refresh the analysis
      await analyzeBulkCampaigns();
      
      // Refresh drafts
      await fetchDrafts();
      
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import emails',
        variant: 'destructive'
      });
    } finally {
      setSmartBulkProcessing(false);
      setBulkProgress({ current: 0, total: 0 });
    }
  };

  // Smart bulk processing - systematically processes all campaigns with intelligent logic
  const smartBulkProcessAllCampaigns = async () => {
    if (campaigns.length === 0) {
      toast({
        title: 'No campaigns available',
        description: 'Load campaigns first before running bulk processing',
        variant: 'destructive'
      });
      return;
    }

    const confirmed = confirm(
      `🤖 Smart Bulk Processing\n\n` +
      `This will intelligently process ${campaigns.length} campaigns:\n` +
      `• Prioritize campaigns with replies\n` +
      `• Skip campaigns already processed recently\n` +
      `• Process in batches to avoid API rate limits\n` +
      `• Apply email limit of ${emailLimit} per campaign\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setSmartBulkProcessing(true);
    setBulkProgress({current: 0, total: campaigns.length});

    try {
      // Sort campaigns by priority (more replies = higher priority)
      const sortedCampaigns = [...campaigns].sort((a, b) => {
        return (b.repliedCount || 0) - (a.repliedCount || 0);
      });

      for (let i = 0; i < sortedCampaigns.length; i++) {
        const campaign = sortedCampaigns[i];
        
        setBulkProgress({
          current: i + 1, 
          total: campaigns.length,
          campaign: campaign.name
        });

        // Skip campaigns with no replies if onlyReplied is enabled
        if (onlyReplied && (campaign.repliedCount || 0) === 0) {
          console.log(`Skipping ${campaign.name} - no replies`);
          continue;
        }

        // Skip campaigns already processed (have high imported count)
        if ((campaign.importedCount || 0) >= (campaign.repliedCount || 0) * 0.8) {
          console.log(`Skipping ${campaign.name} - already mostly processed`);
          continue;
        }

        try {
          // Call existing importCampaign function
          const response = await fetch('/api/admin/manyreach/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              campaignId: campaign.id,
              workspaceName: campaign.workspace || 'main',
              limit: unlimitedEmails ? null : emailLimit,
              onlyReplied,
              previewMode
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log(`✅ Processed ${campaign.name}: ${data.result?.imported || 0} imported`);
          }
          
          // Small delay between campaigns to be API-friendly
          if (i < sortedCampaigns.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.error(`Failed to process campaign ${campaign.name}:`, error);
          // Continue with next campaign instead of failing entirely
        }
      }

      toast({
        title: 'Smart Bulk Processing Complete! 🎉',
        description: `Processed ${campaigns.length} campaigns intelligently`,
      });

      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();

    } catch (error) {
      console.error('Smart bulk processing failed:', error);
      toast({
        title: 'Smart Bulk Processing Failed',
        description: error instanceof Error ? error.message : 'Processing failed',
        variant: 'destructive'
      });
    } finally {
      setSmartBulkProcessing(false);
      setBulkProgress({current: 0, total: 0});
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchDrafts();
  }, []);
  

  const fetchCampaigns = async () => {
    try {
      const response = await fetch('/api/admin/manyreach/campaigns?workspace=all');
      if (!response.ok) throw new Error('Failed to fetch campaigns');
      const data = await response.json();
      setCampaigns(data.campaigns || []);
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch campaigns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const exportDraftsToCSV = () => {
    const csvData = drafts.map(draft => {
      const data = draft.edited_data || draft.parsed_data;
      return {
        'Domain': data.domain || '',
        'Campaign': draft.campaign_name || '',
        'Status': draft.status || 'pending',
        'Has Offer': data.hasOffer ? 'Yes' : 'No',
        'Offerings': data.offerings?.map((o: any) => o.name).join('; ') || '',
        'Prices': data.offerings?.map((o: any) => o.basePrice || 'N/A').join('; ') || '',
        'Email From': draft.email_from || '',
        'Created': new Date(draft.created_at).toLocaleDateString(),
      };
    });
    
    const csvHeader = Object.keys(csvData[0] || {}).join(',');
    const csvRows = csvData.map(row => 
      Object.values(row).map(val => 
        typeof val === 'string' && val.includes(',') ? `"${val}"` : val
      ).join(',')
    );
    const csv = [csvHeader, ...csvRows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manyreach-drafts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: 'Export Complete',
      description: `Exported ${drafts.length} drafts to CSV`,
    });
  };

  const fetchDrafts = async () => {
    try {
      const response = await fetch('/api/admin/manyreach/drafts');
      if (!response.ok) throw new Error('Failed to fetch drafts');
      const data = await response.json();
      const draftsArray = Array.isArray(data.drafts) ? data.drafts : [];
      setDrafts(draftsArray);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      setDrafts([]); // Ensure drafts is always an array
    }
  };

  const [importProgress, setImportProgress] = useState<{
    [key: string]: { processed: number; total: number; status: string; message?: string }
  }>({});

  const bulkImportCampaigns = async () => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: 'No campaigns selected',
        description: 'Please select at least one campaign to import',
        variant: 'destructive'
      });
      return;
    }

    setBulkImporting(true);
    
    try {
      // Import each campaign sequentially
      for (const campaignId of selectedCampaigns) {
        await importCampaign(campaignId);
      }
      
      toast({
        title: 'Bulk import complete',
        description: `Successfully imported ${selectedCampaigns.length} campaigns`,
      });
      
      // Clear selection
      setSelectedCampaigns([]);
    } catch (error) {
      console.error('Bulk import failed:', error);
      toast({
        title: 'Bulk import failed',
        description: error instanceof Error ? error.message : 'Failed to import campaigns',
        variant: 'destructive'
      });
    } finally {
      setBulkImporting(false);
    }
  };

  const importCampaign = async (campaignId: string) => {
    setImporting(campaignId);
    
    // Initialize progress
    setImportProgress(prev => ({
      ...prev,
      [campaignId]: { processed: 0, total: 0, status: 'starting', message: 'Starting import...' }
    }));

    try {
      // Start the import
      const response = await fetch('/api/admin/manyreach/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          campaignId,
          workspaceName: campaigns.find(c => c.id === campaignId || c.campaignId === campaignId)?.workspace || 'main',
          limit: unlimitedEmails ? null : emailLimit,
          onlyReplied,
          previewMode
        })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const data = await response.json();
      
      // Update final progress
      setImportProgress(prev => ({
        ...prev,
        [campaignId]: { 
          processed: data.result.imported || 0, 
          total: data.result.imported || 0, 
          status: 'completed',
          message: `Import complete: ${data.result.imported} replies imported, ${data.result.skipped} skipped`
        }
      }));
      
      toast({
        title: 'Import Complete',
        description: `Imported ${data.result.imported} replies, skipped ${data.result.skipped}`,
      });
      
      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        setImportProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[campaignId];
          return newProgress;
        });
      }, 3000);
      
    } catch (error) {
      console.error('Import error:', error);
      
      setImportProgress(prev => ({
        ...prev,
        [campaignId]: { 
          processed: 0, 
          total: 0, 
          status: 'error',
          message: error instanceof Error ? error.message : 'Import failed'
        }
      }));
      
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setImporting(null);
    }
  };

  const updateDraft = async (draftId: string, updates: any) => {
    try {
      // Properly handle the updates object structure
      const updatePayload = {
        draftId,
        editedData: updates.editedData,
        status: updates.status,
        reviewNotes: updates.reviewNotes
      };
      
      const response = await fetch('/api/admin/manyreach/drafts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });
      
      if (!response.ok) throw new Error('Update failed');
      
      toast({
        title: 'Draft Updated',
        description: 'Changes saved successfully',
      });
      
      await fetchDrafts();
      
    } catch (error) {
      console.error('Update error:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    }
  };

  const clearTestData = async () => {
    setClearing(true);
    try {
      const response = await fetch('/api/admin/manyreach/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error('Clear failed');
      
      toast({
        title: 'Data Cleared',
        description: 'All test data has been cleared. You can now import fresh data.',
      });
      
      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();
      setSelectedDraft(null);
      
    } catch (error) {
      console.error('Clear error:', error);
      toast({
        title: 'Clear Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setClearing(false);
    }
  };

  const bulkApproveDrafts = async () => {
    if (selectedDraftIds.length === 0) {
      toast({
        title: 'No drafts selected',
        description: 'Please select at least one draft to approve',
        variant: 'destructive'
      });
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/admin/manyreach/drafts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: selectedDraftIds,
          action: 'approve'
        })
      });

      if (!response.ok) throw new Error('Bulk approval failed');

      const result = await response.json();
      
      toast({
        title: 'Bulk Approval Complete',
        description: `Successfully approved ${result.processed} drafts`,
      });

      // Refresh and clear selection
      await fetchDrafts();
      setSelectedDraftIds([]);
    } catch (error) {
      toast({
        title: 'Bulk Approval Failed',
        description: error instanceof Error ? error.message : 'Failed to approve drafts',
        variant: 'destructive'
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const bulkRejectDrafts = async () => {
    if (selectedDraftIds.length === 0) {
      toast({
        title: 'No drafts selected',
        description: 'Please select at least one draft to reject',
        variant: 'destructive'
      });
      return;
    }

    setBulkProcessing(true);
    try {
      const response = await fetch('/api/admin/manyreach/drafts/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftIds: selectedDraftIds,
          action: 'reject'
        })
      });

      if (!response.ok) throw new Error('Bulk rejection failed');

      const result = await response.json();
      
      toast({
        title: 'Bulk Rejection Complete',
        description: `Successfully rejected ${result.processed} drafts`,
      });

      // Refresh and clear selection
      await fetchDrafts();
      setSelectedDraftIds([]);
    } catch (error) {
      toast({
        title: 'Bulk Rejection Failed',
        description: error instanceof Error ? error.message : 'Failed to reject drafts',
        variant: 'destructive'
      });
    } finally {
      setBulkProcessing(false);
    }
  };

  const reprocessDraft = async (draftId: string) => {
    try {
      const response = await fetch('/api/admin/manyreach/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId })
      });
      
      if (!response.ok) throw new Error('Failed to reprocess draft');
      
      const result = await response.json();
      
      toast({
        title: 'Success',
        description: 'Draft re-processed with updated extraction',
      });
      
      // Update the draft in the list
      setDrafts(prevDrafts => 
        prevDrafts.map(d => 
          d.id === draftId 
            ? { ...d, parsed_data: result.parsedData, edited_data: null }
            : d
        )
      );
      
      // Update selected draft if it's the one being reprocessed
      if (selectedDraft?.id === draftId) {
        setSelectedDraft({
          ...selectedDraft,
          parsed_data: result.parsedData,
          edited_data: null
        });
      }
      
    } catch (error) {
      console.error('Error reprocessing draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to reprocess draft',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">ManyReach Import V3</h1>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">Import publisher replies and create draft records for review</p>
            </div>
          <Button
            onClick={clearTestData}
            className="w-full sm:w-auto text-red-600 hover:text-red-700 hover:bg-red-50"
            disabled={clearing}
            variant="outline"
          >
            {clearing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Clearing...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Test Data
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Workspace and Processing Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Settings</CardTitle>
          <CardDescription>Configure email processing options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Refresh Button */}
            <div>
              <label className="block text-sm font-medium mb-2">All Workspaces</label>
              <Button
                onClick={() => {
                  setLoading(true);
                  fetchCampaigns();
                }}
                variant="outline"
                size="sm"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄 Refresh Campaigns'}
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Showing campaigns from all active workspaces
              </p>
            </div>

            {/* Email Limit */}
            <div>
              <label className="block text-sm font-medium mb-2">Email Limit</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    className="flex-1 p-2 border rounded-md disabled:bg-gray-100"
                    value={emailLimit}
                    onChange={(e) => setEmailLimit(parseInt(e.target.value) || 10)}
                    disabled={unlimitedEmails}
                  />
                  <label className="flex items-center whitespace-nowrap">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={unlimitedEmails}
                      onChange={(e) => setUnlimitedEmails(e.target.checked)}
                    />
                    <span className="text-sm">Process All</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  {unlimitedEmails 
                    ? '⚠️ Will process ALL emails (may incur high API costs)'
                    : 'Maximum number of emails to process per campaign'
                  }
                </p>
              </div>
            </div>

            {/* Processing Options */}
            <div>
              <label className="block text-sm font-medium mb-2">Processing Options</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={onlyReplied}
                    onChange={(e) => setOnlyReplied(e.target.checked)}
                  />
                  <span className="text-sm">Only process replied prospects</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="mr-2"
                    checked={previewMode}
                    onChange={(e) => setPreviewMode(e.target.checked)}
                  />
                  <span className="text-sm">Preview mode (dry run without saving)</span>
                </label>
              </div>
            </div>

            {/* Campaign Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">Campaign Filter</label>
              <div className="text-sm text-gray-600">
                {selectedCampaigns.length > 0 
                  ? `Processing ${selectedCampaigns.length} selected campaigns`
                  : 'Processing all campaigns'
                }
              </div>
              <p className="text-xs text-gray-500 mt-1">Select specific campaigns from the list below</p>
            </div>
          </div>

          {/* Cost Estimate */}
          <div className="mt-4 p-3 bg-blue-50 rounded-md">
            <div className="text-sm font-medium text-blue-900">
              Estimated Processing Cost
            </div>
            <div className="text-xs text-blue-700 mt-1">
              {previewMode 
                ? 'Preview mode - No API costs will be incurred'
                : unlimitedEmails
                ? `⚠️ Processing ALL emails from ${selectedCampaigns.length || campaigns.length} campaigns - costs may be significant`
                : `Processing up to ${emailLimit} emails per campaign × ${selectedCampaigns.length || campaigns.length} campaigns`
              }
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="status" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm py-2 px-1 sm:px-3">
            <Activity className="mr-0 sm:mr-2 h-4 w-4 mb-1 sm:mb-0" />
            <span className="hidden sm:inline">Status Overview</span>
            <span className="sm:hidden">Status</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="text-xs sm:text-sm py-2 px-1 sm:px-3">Campaigns</TabsTrigger>
          <TabsTrigger value="drafts" className="text-xs sm:text-sm py-2 px-1 sm:px-3">
            <span>Drafts</span>
            {Array.isArray(drafts) && drafts.length > 0 && <Badge className="ml-1 sm:ml-2 text-xs">{drafts.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <CampaignStatusView workspace="all" />
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ManyReach Campaigns</CardTitle>
                  <CardDescription>Import replies from your email campaigns with smart bulk processing</CardDescription>
                </div>
                <div className="flex gap-2">
                  {/* Check for New Emails - Primary Action */}
                  <Button
                    onClick={analyzeBulkCampaigns}
                    disabled={analyzingCampaigns || campaigns.length === 0}
                    variant="default"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {analyzingCampaigns ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Search className="mr-2 h-4 w-4" />
                        Check for New Emails
                      </>
                    )}
                  </Button>
                  
                  {/* Smart Bulk Processing */}
                  <Button
                    onClick={smartBulkProcessAllCampaigns}
                    disabled={smartBulkProcessing || campaigns.length === 0}
                    variant="secondary"
                    className="bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                  >
                    {smartBulkProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        🤖 Smart Processing... ({bulkProgress.current}/{bulkProgress.total})
                      </>
                    ) : (
                      <>🤖 Smart Bulk Process All ({campaigns.length} campaigns)</>
                    )}
                  </Button>
                  
                  {selectedCampaigns.length > 0 && (
                    <>
                      <Button
                        onClick={bulkImportCampaigns}
                        disabled={bulkImporting || smartBulkProcessing}
                        variant="default"
                      >
                        {bulkImporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing {selectedCampaigns.length} campaigns...
                          </>
                        ) : (
                          <>Import {selectedCampaigns.length} Selected</>
                        )}
                      </Button>
                      <Button
                        onClick={() => setSelectedCampaigns([])}
                        variant="outline"
                        disabled={smartBulkProcessing}
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {/* Smart Processing Progress */}
              {smartBulkProcessing && (
                <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-purple-900">🤖 Smart Bulk Processing Active</div>
                    <div className="text-sm text-purple-700">
                      {bulkProgress.current} of {bulkProgress.total} campaigns
                    </div>
                  </div>
                  {bulkProgress.campaign && (
                    <div className="text-sm text-purple-700 mb-2">
                      Currently processing: <span className="font-medium">{bulkProgress.campaign}</span>
                    </div>
                  )}
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-purple-600 mt-2">
                    ✨ Intelligently prioritizing campaigns with replies and skipping already processed ones
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All checkbox */}
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <input
                      type="checkbox"
                      checked={campaigns.length > 0 && selectedCampaigns.length === campaigns.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCampaigns(campaigns.map(c => c.id));
                        } else {
                          setSelectedCampaigns([]);
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm font-medium">Select All</span>
                  </div>
                  
                  {campaigns.map((campaign) => (
                    <div key={campaign.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={selectedCampaigns.includes(campaign.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCampaigns([...selectedCampaigns, campaign.id]);
                              } else {
                                setSelectedCampaigns(selectedCampaigns.filter(id => id !== campaign.id));
                              }
                            }}
                            className="rounded"
                          />
                          <div>
                            <h3 className="font-semibold">{campaign.name}</h3>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              <span className="font-medium text-blue-600">Workspace: {campaign.workspaceDisplay || campaign.workspace || 'Unknown'}</span>
                              <span>Sent: {campaign.sentCount}</span>
                              <span>Replied: {campaign.repliedCount}</span>
                              <span>Imported: {campaign.importedCount}</span>
                              <span>Drafts: {campaign.draftCount}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                            {campaign.status}
                          </Badge>
                          <Button
                            onClick={() => importCampaign(campaign.id)}
                            disabled={importing === campaign.id || bulkImporting}
                            size="sm"
                          >
                            {importing === campaign.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                              </>
                            ) : (
                              <>
                                <Download className="mr-2 h-4 w-4" />
                                Import Replies
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      {importProgress[campaign.id] && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">
                              {importProgress[campaign.id].status === 'completed' ? '✅ ' : 
                               importProgress[campaign.id].status === 'error' ? '❌ ' : '⏳ '}
                              {importProgress[campaign.id].message || 'Processing...'}
                            </span>
                            {importProgress[campaign.id].total > 0 && (
                              <span className="text-gray-600">
                                {importProgress[campaign.id].processed} / {importProgress[campaign.id].total}
                              </span>
                            )}
                          </div>
                          {importProgress[campaign.id].status === 'processing' && (
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ 
                                  width: `${importProgress[campaign.id].total > 0 
                                    ? (importProgress[campaign.id].processed / importProgress[campaign.id].total) * 100 
                                    : 0}%` 
                                }}
                              />
                            </div>
                          )}
                        </div>
                      )}
                      
                      {campaign.pendingCount > 0 && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-orange-600">
                            {campaign.pendingCount} pending review
                          </Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {campaigns.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No campaigns found. Check your ManyReach API key configuration.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Bulk Analysis Results */}
          {showBulkAnalysis && bulkAnalysisData && (
            <Card className="mt-4">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>📊 Email Analysis Results</CardTitle>
                    <CardDescription>
                      Found {bulkAnalysisData.totalNewEmails} new emails to import across {bulkAnalysisData.totalCampaigns} campaigns
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {bulkAnalysisData.totalNewEmails > 0 && (
                      <Button
                        onClick={() => {
                          const campaignIds = bulkAnalysisData.campaignBreakdown
                            .filter((c: any) => c.newEmails > 0)
                            .map((c: any) => c.campaignId);
                          importNewEmailsFromAnalysis(campaignIds);
                        }}
                        disabled={smartBulkProcessing}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        {smartBulkProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" />
                            Import All New Emails
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      onClick={() => setShowBulkAnalysis(false)}
                      variant="ghost"
                      size="sm"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{bulkAnalysisData.totalNewEmails}</div>
                    <div className="text-sm text-gray-600">New Emails</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{bulkAnalysisData.totalDuplicates}</div>
                    <div className="text-sm text-gray-600">Duplicates Avoided</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">{bulkAnalysisData.totalIgnored}</div>
                    <div className="text-sm text-gray-600">Ignored</div>
                  </div>
                </div>
                
                {/* Campaign Breakdown */}
                {bulkAnalysisData.campaignBreakdown.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">Campaign Details:</h4>
                    {bulkAnalysisData.campaignBreakdown.map((campaign: any) => (
                      <div key={campaign.campaignId} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-medium">{campaign.campaignName}</h5>
                            <div className="flex gap-4 text-sm text-gray-600 mt-1">
                              <span className="text-green-600">✅ {campaign.newEmails} new</span>
                              <span className="text-yellow-600">⚠️ {campaign.duplicates} duplicates</span>
                              <span className="text-red-600">🚫 {campaign.ignored} ignored</span>
                            </div>
                          </div>
                          {campaign.newEmails > 0 && (
                            <Button
                              onClick={() => importNewEmailsFromAnalysis([campaign.campaignId])}
                              disabled={smartBulkProcessing}
                              size="sm"
                              variant="outline"
                            >
                              Import {campaign.newEmails}
                            </Button>
                          )}
                        </div>
                        
                        {/* Show first few emails */}
                        {campaign.emails && campaign.emails.length > 0 && (
                          <div className="mt-2 text-xs text-gray-500">
                            <details>
                              <summary className="cursor-pointer hover:text-gray-700">
                                View emails ({campaign.emails.length})
                              </summary>
                              <div className="mt-2 space-y-1">
                                {campaign.emails.slice(0, 10).map((email: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2">
                                    <span className={
                                      email.status === 'new' ? 'text-green-600' :
                                      email.status === 'duplicate' ? 'text-yellow-600' :
                                      'text-red-600'
                                    }>
                                      {email.status === 'new' ? '✅' :
                                       email.status === 'duplicate' ? '⚠️' : '🚫'}
                                    </span>
                                    <span>{email.email}</span>
                                    {email.existsInCampaign && (
                                      <span className="text-gray-400">
                                        (exists in campaign {email.existsInCampaign})
                                      </span>
                                    )}
                                  </div>
                                ))}
                                {campaign.emails.length > 10 && (
                                  <div className="text-gray-400">...and {campaign.emails.length - 10} more</div>
                                )}
                              </div>
                            </details>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {bulkAnalysisData.totalNewEmails === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-medium">All caught up!</p>
                    <p className="text-sm text-gray-600 mt-1">No new emails to import. All replies have been processed.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="drafts">
          {/* Draft Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{drafts.length}</div>
                <div className="text-sm text-gray-600">Total Drafts</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">
                  {drafts.filter(d => (d.edited_data || d.parsed_data)?.hasOffer).length}
                </div>
                <div className="text-sm text-gray-600">With Offers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {drafts.filter(d => {
                    const data = d.edited_data || d.parsed_data;
                    return data?.offerings?.some((o: any) => o.basePrice !== null && o.basePrice !== undefined && o.basePrice > 0);
                  }).length}
                </div>
                <div className="text-sm text-gray-600">With Pricing</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600">
                  {drafts.filter(d => {
                    const data = d.edited_data || d.parsed_data;
                    return data?.hasOffer && data?.offerings?.some((o: any) => 
                      o.basePrice === null || o.basePrice === undefined
                    );
                  }).length}
                </div>
                <div className="text-sm text-gray-600">Need Price Info</div>
              </CardContent>
            </Card>
          </div>

          {/* Draft Filters and Bulk Actions */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Draft Management</CardTitle>
                  <CardDescription>Filter and manage draft publishers</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={exportDraftsToCSV}
                    variant="outline"
                    size="sm"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  {selectedDraftIds.length > 0 && (
                    <>
                      <Button
                        onClick={bulkApproveDrafts}
                        disabled={bulkProcessing}
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {bulkProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Approve {selectedDraftIds.length}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={bulkRejectDrafts}
                        disabled={bulkProcessing}
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject {selectedDraftIds.length}
                      </Button>
                      <Button
                        onClick={() => setSelectedDraftIds([])}
                        variant="ghost"
                        size="sm"
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Filters */}
              <div>
                <h4 className="text-sm font-medium mb-2">Basic Filters</h4>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={showOnlyWithOffers}
                      onChange={(e) => setShowOnlyWithOffers(e.target.checked)}
                    />
                    <span className="text-sm">Only drafts with offers</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={showOnlyWithPricing}
                      onChange={(e) => setShowOnlyWithPricing(e.target.checked)}
                    />
                    <span className="text-sm">Only drafts with pricing</span>
                  </label>
                </div>
              </div>

              {/* Offer Type Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Offer Type</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={offerTypeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferTypeFilter('all')}
                  >
                    All Types
                  </Button>
                  <Button
                    variant={offerTypeFilter === 'guest_post' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferTypeFilter('guest_post')}
                  >
                    Guest Post
                  </Button>
                  <Button
                    variant={offerTypeFilter === 'link_insertion' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferTypeFilter('link_insertion')}
                  >
                    Link Insertion
                  </Button>
                  <Button
                    variant={offerTypeFilter === 'link_exchange' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setOfferTypeFilter('link_exchange')}
                  >
                    Link Exchange
                  </Button>
                </div>
              </div>

              {/* Price Range Filter */}
              <div>
                <h4 className="text-sm font-medium mb-2">Price Range</h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={priceRangeFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceRangeFilter('all')}
                  >
                    All Prices
                  </Button>
                  <Button
                    variant={priceRangeFilter === '0-100' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceRangeFilter('0-100')}
                  >
                    $0-$100
                  </Button>
                  <Button
                    variant={priceRangeFilter === '100-500' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceRangeFilter('100-500')}
                  >
                    $100-$500
                  </Button>
                  <Button
                    variant={priceRangeFilter === '500-1000' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceRangeFilter('500-1000')}
                  >
                    $500-$1000
                  </Button>
                  <Button
                    variant={priceRangeFilter === '1000+' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPriceRangeFilter('1000+')}
                  >
                    $1000+
                  </Button>
                </div>
              </div>

              {/* Custom Price Range */}
              <div>
                <h4 className="text-sm font-medium mb-2">Custom Price Range</h4>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    placeholder="Min $"
                    className="w-32 p-2 border rounded-md"
                    value={minPriceFilter}
                    onChange={(e) => setMinPriceFilter(parseInt(e.target.value) || 0)}
                  />
                  <span className="text-gray-500">to</span>
                  <input
                    type="number"
                    placeholder="Max $"
                    className="w-32 p-2 border rounded-md"
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(parseInt(e.target.value) || 10000)}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMinPriceFilter(0);
                      setMaxPriceFilter(10000);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {/* Filter Summary */}
              <div className="text-sm text-gray-600 pt-2 border-t">
                Showing {filterDrafts(drafts).length} of {drafts.length} drafts
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Use new infinite scroll component */}
            <div className="lg:col-span-4">
              <DraftsListInfinite 
                onDraftSelect={setSelectedDraft}
                onDraftUpdate={fetchDrafts}
                showOnlyWithOffers={showOnlyWithOffers}
                showOnlyWithPricing={showOnlyWithPricing}
                offerTypeFilter={offerTypeFilter}
                priceRangeFilter={priceRangeFilter}
                minPriceFilter={minPriceFilter}
                maxPriceFilter={maxPriceFilter}
                selectedDraftIds={selectedDraftIds}
                onSelectionChange={setSelectedDraftIds}
              />
            </div>
            
            {/* Draft Editor - restored from original */}
            <div className="lg:col-span-8">
              {selectedDraft ? (
                <DraftEditor
                  draft={selectedDraft}
                  onUpdate={(updates) => updateDraft(selectedDraft.id, updates)}
                  onReprocess={() => reprocessDraft(selectedDraft.id)}
                  onDelete={() => {
                    setSelectedDraft(null);
                    fetchDrafts(); // Refresh the draft list
                  }}
                />
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center text-gray-500">
                      Select a draft to review
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
