'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Loader2, Download, CheckCircle2, XCircle, AlertCircle, Eye, RefreshCw, Clock, Activity, ChevronLeft, Mail, Key, FileText, BarChart, History } from 'lucide-react';
import { CampaignStatusView } from '@/components/manyreach/CampaignStatusView';
import { DraftsListInfinite } from '@/components/manyreach/DraftsListInfinite';
import { DuplicateDetectionPreview } from '@/components/manyreach/DuplicateDetectionPreview';
import { DraftEditor } from '@/components/manyreach/DraftEditor';
import ValidationRunHistory from '@/components/admin/ValidationRunHistory';
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
  
  // Workspace and email processing controls
  const [workspaces, setWorkspaces] = useState<{workspace_name: string; is_active: boolean}[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string>('main');
  const [emailLimit, setEmailLimit] = useState<number>(10);
  const [unlimitedEmails, setUnlimitedEmails] = useState<boolean>(false);
  const [onlyReplied, setOnlyReplied] = useState<boolean>(true);
  const [previewMode, setPreviewMode] = useState<boolean>(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  
  // Enhanced Draft filtering
  const [showOnlyWithOffers, setShowOnlyWithOffers] = useState<boolean>(false);
  const [showOnlyWithPricing, setShowOnlyWithPricing] = useState<boolean>(false);
  const [offerTypeFilter, setOfferTypeFilter] = useState<string>('all'); // 'all', 'guest_post', 'link_insertion', 'link_exchange'
  const [priceRangeFilter, setPriceRangeFilter] = useState<string>('all'); // 'all', '0-100', '100-500', '500-1000', '1000+'
  const [minPriceFilter, setMinPriceFilter] = useState<number>(0);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(10000);
  
  // Bulk operations
  const [bulkImporting, setBulkImporting] = useState(false);
  const [selectedDraftIds, setSelectedDraftIds] = useState<string[]>([]);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  
  // Smart bulk campaign processing
  const [smartBulkProcessing, setSmartBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{current: number; total: number; campaign?: string}>({current: 0, total: 0});
  
  // Aggregate new email checking
  const [checkingNewEmails, setCheckingNewEmails] = useState(false);
  const [newEmailsData, setNewEmailsData] = useState<{
    totalNewEmails: number;
    uniqueCampaigns: number;
    duplicateCampaigns: number;
    campaigns: any[];
  } | null>(null);
  const [streamingProgress, setStreamingProgress] = useState<{
    currentWorkspace?: string;
    currentWorkspaceIndex?: number;
    totalWorkspaces?: number;
    currentCampaign?: string;
    currentCampaignIndex?: number;
    totalCampaigns?: number;
    currentMessage?: string;
    prospectsChecked?: number;
    totalProspects?: number;
    repliesFound?: number;
  } | null>(null);
  const [importingAllNew, setImportingAllNew] = useState(false);
  
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

  // Check for new emails across all workspaces with streaming
  const checkForNewEmails = async () => {
    setCheckingNewEmails(true);
    setStreamingProgress(null);
    setNewEmailsData(null);
    
    try {
      const response = await fetch('/api/admin/manyreach/check-new-emails?stream=true');
      if (!response.ok) throw new Error('Failed to start checking for new emails');
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('Stream event:', data);
                
                switch (data.type) {
                  case 'status':
                    setStreamingProgress(prev => ({
                      ...prev,
                      currentMessage: data.message,
                      totalWorkspaces: data.totalWorkspaces || prev?.totalWorkspaces
                    }));
                    break;
                    
                  case 'workspace':
                    setStreamingProgress(prev => ({
                      ...prev,
                      currentWorkspace: data.workspace,
                      currentWorkspaceIndex: data.index,
                      totalWorkspaces: data.total,
                      currentMessage: data.message,
                      currentCampaign: undefined, // Reset campaign progress
                      currentCampaignIndex: undefined,
                      totalCampaigns: data.campaignCount
                    }));
                    break;
                    
                  case 'campaign':
                    setStreamingProgress(prev => ({
                      ...prev,
                      currentCampaign: data.campaign,
                      currentCampaignIndex: data.campaignIndex,
                      totalCampaigns: data.totalCampaigns,
                      currentMessage: data.message,
                      prospectsChecked: undefined, // Reset prospect progress
                      totalProspects: data.prospectCount,
                      repliesFound: 0
                    }));
                    break;
                    
                  case 'prospect':
                    setStreamingProgress(prev => ({
                      ...prev,
                      prospectsChecked: data.checked,
                      totalProspects: data.total,
                      repliesFound: data.found,
                      currentMessage: data.message
                    }));
                    break;
                    
                  case 'result':
                    // Campaign finished with results
                    console.log(`Found ${data.campaign.estimatedNewEmails} new replies in ${data.campaign.campaignName}`);
                    break;
                    
                  case 'error':
                    console.error('Stream error:', data.error);
                    toast({
                      title: 'Partial Error',
                      description: `Error in ${data.workspace}: ${data.error}`,
                      variant: 'destructive'
                    });
                    break;
                    
                  case 'complete':
                    setNewEmailsData(data);
                    setStreamingProgress(null);
                    
                    if (data.totalNewEmails === 0) {
                      toast({
                        title: 'No New Replies',
                        description: 'All campaigns are up to date. No new replies found.',
                      });
                    } else {
                      toast({
                        title: 'New Replies Found!',
                        description: `Found ${data.totalNewEmails} new replies across ${data.uniqueCampaigns} unique campaigns (${data.duplicateCampaigns} duplicates detected)`,
                      });
                    }
                    break;
                }
              } catch (parseError) {
                console.error('Failed to parse streaming data:', parseError);
              }
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Error checking for new emails:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Failed to check for new emails',
        variant: 'destructive'
      });
      setStreamingProgress(null);
    } finally {
      setCheckingNewEmails(false);
    }
  };

  // Import all new emails from unique campaigns
  const importAllNewEmails = async () => {
    if (!newEmailsData || newEmailsData.totalNewEmails === 0) return;
    
    const confirmed = confirm(
      `Import ${newEmailsData.totalNewEmails} new emails from ${newEmailsData.uniqueCampaigns} unique campaigns?\n\n` +
      `This will skip ${newEmailsData.duplicateCampaigns} duplicate campaigns.`
    );
    
    if (!confirmed) return;
    
    setImportingAllNew(true);
    try {
      const response = await fetch('/api/admin/manyreach/check-new-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onlyUnique: true })
      });
      
      if (!response.ok) throw new Error('Import failed');
      
      const result = await response.json();
      
      toast({
        title: 'Import Complete!',
        description: result.message,
      });
      
      // Refresh data
      await fetchCampaigns();
      await fetchDrafts();
      
      // Clear the new emails data
      setNewEmailsData(null);
      
    } catch (error) {
      console.error('Error importing new emails:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'Failed to import new emails',
        variant: 'destructive'
      });
    } finally {
      setImportingAllNew(false);
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
              workspaceName: selectedWorkspace,
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
    fetchWorkspaces();
    fetchDrafts();
  }, []);

  useEffect(() => {
    if (selectedWorkspace) {
      fetchCampaigns();
    }
  }, [selectedWorkspace]); // Re-fetch when workspace changes
  
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/admin/manyreach-keys');
      const data = await response.json();
      const activeWorkspaces = (data.workspaces || []).filter((ws: any) => ws.is_active);
      setWorkspaces(activeWorkspaces);
      
      // Set default workspace if available
      if (activeWorkspaces.length > 0 && !selectedWorkspace) {
        setSelectedWorkspace(activeWorkspaces[0].workspace_name);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  const fetchCampaigns = async () => {
    try {
      const response = await fetch(`/api/admin/manyreach/campaigns?workspace=${selectedWorkspace}`);
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
          workspaceName: selectedWorkspace,
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

      {/* New Replies Check Card */}
      <Card className="mb-6 border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                Check All Workspaces for New Replies
              </CardTitle>
              <CardDescription>
                Automatically detect and import new replies across all unique campaigns
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Check Button */}
            {!newEmailsData && (
              <Button
                onClick={checkForNewEmails}
                disabled={checkingNewEmails}
                variant="outline"
                className="w-full border-blue-300 hover:bg-blue-100"
              >
                {checkingNewEmails ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {streamingProgress?.currentMessage || 'Checking all workspaces for new emails...'}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Check for New Replies Across All Workspaces
                  </>
                )}
              </Button>
            )}
            
            {/* Streaming Progress Display */}
            {checkingNewEmails && streamingProgress && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="space-y-3">
                  <div className="text-sm font-medium text-blue-800">
                    {streamingProgress.currentMessage}
                  </div>
                  
                  {/* Workspace Progress */}
                  {streamingProgress.totalWorkspaces && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-blue-600">
                        <span>Workspace Progress</span>
                        <span>{streamingProgress.currentWorkspaceIndex || 0}/{streamingProgress.totalWorkspaces}</span>
                      </div>
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${((streamingProgress.currentWorkspaceIndex || 0) / streamingProgress.totalWorkspaces) * 100}%` 
                          }}
                        ></div>
                      </div>
                      {streamingProgress.currentWorkspace && (
                        <div className="text-xs text-blue-600">
                          Current: {streamingProgress.currentWorkspace}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Campaign Progress */}
                  {streamingProgress.totalCampaigns && streamingProgress.currentCampaign && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-green-600">
                        <span>Campaign Progress</span>
                        <span>{streamingProgress.currentCampaignIndex || 0}/{streamingProgress.totalCampaigns}</span>
                      </div>
                      <div className="w-full bg-green-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${((streamingProgress.currentCampaignIndex || 0) / streamingProgress.totalCampaigns) * 100}%` 
                          }}
                        ></div>
                      </div>
                      <div className="text-xs text-green-600">
                        Current: {streamingProgress.currentCampaign}
                      </div>
                    </div>
                  )}
                  
                  {/* Prospect Progress */}
                  {streamingProgress.totalProspects && streamingProgress.prospectsChecked && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-orange-600">
                        <span>Prospect Validation</span>
                        <span>{streamingProgress.prospectsChecked}/{streamingProgress.totalProspects} ({streamingProgress.repliesFound || 0} real replies)</span>
                      </div>
                      <div className="w-full bg-orange-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-300" 
                          style={{ 
                            width: `${(streamingProgress.prospectsChecked / streamingProgress.totalProspects) * 100}%` 
                          }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Results Display */}
            {newEmailsData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-blue-600">
                      {newEmailsData.totalNewEmails}
                    </div>
                    <div className="text-sm text-gray-600">New Replies</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-green-600">
                      {newEmailsData.uniqueCampaigns}
                    </div>
                    <div className="text-sm text-gray-600">Unique Campaigns</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-orange-600">
                      {newEmailsData.duplicateCampaigns}
                    </div>
                    <div className="text-sm text-gray-600">Duplicate Campaigns</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border">
                    <div className="text-2xl font-bold text-purple-600">
                      {newEmailsData.campaigns?.filter((c: any) => !c.isDuplicate && c.estimatedNewEmails > 0).length || 0}
                    </div>
                    <div className="text-sm text-gray-600">To Import</div>
                  </div>
                </div>
                
                {/* Import Button */}
                {newEmailsData.totalNewEmails > 0 && (
                  <div className="flex gap-4">
                    <Button
                      onClick={importAllNewEmails}
                      disabled={importingAllNew}
                      className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                    >
                      {importingAllNew ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Importing {newEmailsData.totalNewEmails} new emails...
                        </>
                      ) : (
                        <>
                          <Download className="mr-2 h-4 w-4" />
                          Import All {newEmailsData.totalNewEmails} New Replies
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setNewEmailsData(null)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
                
                {/* Campaign Details */}
                {newEmailsData.campaigns && newEmailsData.campaigns.length > 0 && (
                  <div className="mt-4">
                    <details className="cursor-pointer">
                      <summary className="text-sm font-medium text-gray-700">
                        View Campaign Details ({newEmailsData.campaigns.length} campaigns)
                      </summary>
                      <div className="mt-2 max-h-64 overflow-y-auto space-y-2 text-sm">
                        {newEmailsData.campaigns.map((campaign: any, idx: number) => (
                          <div 
                            key={idx} 
                            className={`p-2 rounded ${campaign.isDuplicate ? 'bg-gray-100 opacity-60' : 'bg-white'} border`}
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-medium">{campaign.campaignName}</span>
                                <span className="text-xs text-gray-500 ml-2">
                                  ({campaign.workspaceName})
                                </span>
                                {campaign.isDuplicate && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Duplicate of {campaign.duplicateOf}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-green-600 font-medium">
                                  +{campaign.estimatedNewEmails} new
                                </span>
                                <span className="text-gray-500">
                                  ({campaign.currentImportedCount} imported)
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Workspace and Processing Controls */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Import Settings</CardTitle>
          <CardDescription>Configure workspace and email processing options</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Workspace Selector */}
            <div>
              <label className="block text-sm font-medium mb-2">Workspace</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 p-2 border rounded-md"
                  value={selectedWorkspace}
                  onChange={(e) => {
                    setSelectedWorkspace(e.target.value);
                    // Campaigns will auto-refresh due to useEffect
                  }}
                >
                  {workspaces.length === 0 ? (
                    <option value="">No workspaces configured</option>
                  ) : (
                    workspaces.map(ws => (
                      <option key={ws.workspace_name} value={ws.workspace_name}>
                        {ws.workspace_name}
                      </option>
                    ))
                  )}
                </select>
                <Button
                  onClick={() => {
                    setLoading(true);
                    fetchCampaigns();
                  }}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '🔄 Refresh'}
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select which ManyReach workspace to import from
                {workspaces.length === 0 && (
                  <span> • <a href="/admin/manyreach-keys" className="text-blue-600 hover:underline">Configure API keys</a></span>
                )}
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
        <TabsList className="grid w-full grid-cols-4 h-auto">
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
          <TabsTrigger value="history" className="flex flex-col sm:flex-row items-center justify-center text-xs sm:text-sm py-2 px-1 sm:px-3">
            <History className="mr-0 sm:mr-2 h-4 w-4 mb-1 sm:mb-0" />
            <span className="hidden sm:inline">Run History</span>
            <span className="sm:hidden">History</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="status">
          <CampaignStatusView workspace={selectedWorkspace} />
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
        </TabsContent>

        <TabsContent value="drafts">
          {/* Draft Filters and Bulk Actions - moved from hidden section */}
          <Card className="mb-4">
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle>Draft Management</CardTitle>
                  <CardDescription>Filter and manage draft publishers</CardDescription>
                </div>
                {selectedDraftIds.length > 0 && (
                  <div className="flex gap-2">
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
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
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
          
          {/* OLD CONTENT BELOW - HIDDEN */}
          <div style={{ display: 'none' }}>
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
                  {drafts.filter(d => (d.edited_data || d.parsed_data).hasOffer).length}
                </div>
                <div className="text-sm text-gray-600">With Offers</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">
                  {drafts.filter(d => {
                    const data = d.edited_data || d.parsed_data;
                    return data.offerings?.some((o: any) => o.basePrice !== null && o.basePrice !== undefined);
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
                    return data.hasOffer && data.offerings?.some((o: any) => 
                      o.basePrice === null || o.basePrice === undefined
                    );
                  }).length}
                </div>
                <div className="text-sm text-gray-600">Need Price Info</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Draft Filters */}
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Filter Drafts</CardTitle>
              <CardDescription>Show only relevant drafts for review</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
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
                <div className="ml-auto text-sm text-gray-600">
                  Showing {(() => {
                    const filtered = drafts.filter(draft => {
                      const data = draft.edited_data || draft.parsed_data;
                      if (showOnlyWithOffers && !data.hasOffer) return false;
                      if (showOnlyWithPricing) {
                        const hasPrice = data.offerings?.some((o: any) => 
                          o.basePrice !== null && o.basePrice !== undefined
                        );
                        if (!hasPrice) return false;
                      }
                      return true;
                    });
                    return filtered.length;
                  })()} of {drafts.length} drafts
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Draft List */}
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle>Draft Publishers</CardTitle>
                  <CardDescription>Review and approve imported data</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Array.isArray(drafts) && filterDrafts(drafts).map((draft) => {
                      const data = draft.edited_data || draft.parsed_data;
                      return (
                        <div
                          key={draft.id}
                          className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                            selectedDraft?.id === draft.id ? 'border-blue-500 bg-blue-50' : ''
                          }`}
                          onClick={() => setSelectedDraft(draft)}
                        >
                          <div className="font-medium">
                            {data.publisher?.companyName || 'Unknown Publisher'}
                            {data.extractionMetadata && (
                              <span className="ml-2 text-xs bg-green-100 text-green-800 px-1 rounded">V3 Simplified</span>
                            )}
                          </div>
                          {data.publisher?.contactName && (
                            <div className="text-sm text-gray-700">Contact: {data.publisher.contactName}</div>
                          )}
                          <div className="text-sm text-gray-600">{draft.email_from}</div>
                          
                          <div className="flex flex-wrap gap-1 mt-2">
                            {draft.status === 'pending' && (
                              <Badge variant="outline" className="text-orange-600">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                            {draft.status === 'approved' && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Approved
                              </Badge>
                            )}
                            {draft.status === 'rejected' && (
                              <Badge variant="outline" className="text-red-600">
                                <XCircle className="w-3 h-3 mr-1" />
                                Rejected
                              </Badge>
                            )}
                            
                            {data.hasOffer ? (
                              <>
                                <Badge variant="outline" className="text-blue-600 bg-blue-50">
                                  ✅ Has Offer
                                </Badge>
                                {data.offerings?.some((o: any) => o.basePrice !== null && o.basePrice !== undefined) && (
                                  <Badge variant="outline" className="text-green-600 bg-green-50">
                                    💰 Has Pricing
                                  </Badge>
                                )}
                                {data.offerings?.some((o: any) => o.basePrice === null || o.basePrice === undefined) && (
                                  <Badge variant="outline" className="text-orange-600 bg-orange-50">
                                    ❓ Needs Price Info
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <Badge variant="outline" className="text-yellow-600 bg-yellow-50">
                                ⚠️ No Offer
                              </Badge>
                            )}
                            
                            {!data.hasOffer && data.extractionMetadata?.extractionNotes && (
                              <Badge variant="outline" className="text-gray-600" title={data.extractionMetadata.extractionNotes}>
                                📝 {data.extractionMetadata.extractionNotes.substring(0, 30)}...
                              </Badge>
                            )}
                            
                            {data.websites?.length > 0 && (
                              <Badge variant="outline" className="text-blue-600">
                                {data.websites.length} Website{data.websites.length > 1 ? 's' : ''}
                              </Badge>
                            )}
                            
                            {data.extractionMetadata?.confidence > 0 && (
                              <Badge variant="outline" className="text-gray-600">
                                {Math.round(data.extractionMetadata.confidence * 100)}% Confidence
                              </Badge>
                            )}
                          </div>
                          
                          {data.extractionMetadata?.keyQuotes?.[0] && (
                            <div className="text-xs text-gray-500 mt-1 italic">
                              "{data.extractionMetadata.keyQuotes[0].substring(0, 50)}..."
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {(!Array.isArray(drafts) || drafts.length === 0) && (
                      <div className="text-center py-8 text-gray-500">
                        No drafts yet. Import some campaigns first.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Draft Editor */}
            <div className="col-span-8">
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
          </div> {/* Close hidden div */}
        </TabsContent>

        <TabsContent value="history">
          <ValidationRunHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
