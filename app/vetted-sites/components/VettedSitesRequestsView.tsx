'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import VettedSitesRequestForm from './VettedSitesRequestForm';
import VettedSitesRequestsList from './VettedSitesRequestsList';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface VettedSitesRequestsViewProps {
  availableClients: Array<{ id: string; name: string; accountId?: string }>;
  userType: 'internal' | 'account';
}

interface VettedSitesRequestData {
  targetUrls: string[];
  filters: {
    minDa?: number;
    maxCost?: number;
    topics?: string[];
    keywords?: string[];
    excludeDomains?: string[];
    includeOnlyDomains?: string[];
  };
  notes?: string;
  clientIds?: string[];
}

export default function VettedSitesRequestsView({
  availableClients,
  userType
}: VettedSitesRequestsViewProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState('new-request');

  const handleSubmitRequest = async (data: VettedSitesRequestData) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/vetted-sites/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit request');
      }

      const result = await response.json();
      
      toast.success('Request submitted successfully!', {
        description: 'We\'ll analyze your target URLs and send you an email when results are ready.',
        duration: 5000,
      });

      // Switch to requests list tab and refresh
      setActiveTab('my-requests');
      setRefreshTrigger(prev => prev + 1);

    } catch (error) {
      console.error('Error submitting request:', error);
      toast.error('Failed to submit request', {
        description: error instanceof Error ? error.message : 'Please try again later.',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestClick = (request: any) => {
    console.log('Request clicked:', request);
    // TODO: Implement request detail modal or navigation
    toast.info('Request details', {
      description: `Status: ${request.status}`,
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="new-request">New Request</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="new-request" className="space-y-6">
          <VettedSitesRequestForm
            availableClients={availableClients}
            onSubmit={handleSubmitRequest}
            isSubmitting={isSubmitting}
            userType={userType}
          />
        </TabsContent>

        <TabsContent value="my-requests" className="space-y-6">
          <VettedSitesRequestsList
            userType={userType}
            onRequestClick={handleRequestClick}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}