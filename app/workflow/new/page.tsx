'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import { clientStorage, sessionStorage } from '@/lib/userStorage';
import { AuthService } from '@/lib/auth';
import { Client } from '@/types/user';
import ClientSelector from '@/components/ClientSelector';

// Safe UUID generator
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function NewWorkflowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [targetPages, setTargetPages] = useState<any[]>([]);
  const [selectedTargetPageId, setSelectedTargetPageId] = useState<string>('');
  const [formData, setFormData] = useState({
    clientName: '',
    clientUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
  }, []);
  
  useEffect(() => {
    // Pre-select client if coming from bulk analysis or client page
    const clientId = searchParams.get('clientId');
    if (clientId && clients.length > 0) {
      const client = clients.find(c => c.id === clientId);
      if (client) {
        handleClientSelect(client);
      }
    }
  }, [searchParams, clients]);

  const loadClients = async () => {
    const session = AuthService.getSession();
    if (!session) return;

    try {
      // Fetch with additional data for rich display
      const response = await fetch('/api/clients?limit=1000&includeStats=true');
      if (response.ok) {
        const data = await response.json();
        setClients(data.clients || []);
      } else {
        // Fallback to storage method
        const allClients = await clientStorage.getAllClients();
        setClients(allClients);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]); // Fallback to empty array on error
    }
  };

  const handleClientSelect = async (client: Client | null) => {
    setSelectedClient(client);
    setTargetPages([]);
    setSelectedTargetPageId('');
    
    if (client) {
      setFormData({
        clientName: client.name,
        clientUrl: client.website
      });
      
      // Fetch target pages for this client
      try {
        const response = await fetch(`/api/clients/${client.id}/target-pages`);
        if (response.ok) {
          const data = await response.json();
          setTargetPages(data.targetPages || []);
        }
      } catch (error) {
        console.error('Error loading target pages:', error);
      }
    } else {
      setFormData({
        clientName: '',
        clientUrl: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Get current user session for creator information
      const session = AuthService.getSession();
      
      // Get guest post site and notes from URL params if present
      const guestPostSite = searchParams.get('guestPostSite') || '';
      const notes = searchParams.get('notes') || '';
      const targetPageId = searchParams.get('targetPageId') || '';
      
      const workflow: GuestPostWorkflow = {
        id: generateUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: formData.clientName,
        clientUrl: formData.clientUrl,
        targetDomain: guestPostSite, // Pre-fill from URL param if available
        currentStep: 0,
        createdBy: session?.name || 'Unknown User',
        createdByEmail: session?.email,
        steps: WORKFLOW_STEPS.map((step, index) => ({
          ...step,
          status: 'pending' as const,
          inputs: {},
          outputs: index === 0 && guestPostSite ? {
            domain: guestPostSite,
            notes: notes
          } : index === 1 && targetPageId ? {
            selectedTargetPageId: targetPageId
          } : index === 2 && selectedTargetPageId ? {
            // Pre-fill Topic Generation step if target page was selected
            clientTargetUrl: targetPages.find(tp => tp.id === selectedTargetPageId)?.url || ''
          } : {},
          completedAt: undefined
        })),
        metadata: selectedClient ? { 
          clientId: selectedClient.id,
          targetPageId: selectedTargetPageId || undefined 
        } : {}
      } as GuestPostWorkflow & { targetPageId?: string };

      console.log('Creating workflow:', workflow.id, 'for client:', workflow.clientName);
      
      // Save workflow and get the actual database ID from the response
      const currentSession = AuthService.getSession();
      if (!currentSession) throw new Error('User not authenticated');
      
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...workflow,
          userId: currentSession.userId,
          assignedUserId: workflow.assignedUserId || currentSession.userId
        }),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create workflow: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      const savedWorkflow = result.workflow;
      
      console.log('Workflow saved successfully, navigating to:', `/workflow/${savedWorkflow.id}`);
      router.push(`/workflow/${savedWorkflow.id}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to create workflow. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="mb-6">
            <Link
              href="/"
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Workflows
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold mb-6">Create New Workflow</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Client Selection */}
              {clients.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Client
                  </label>
                  <ClientSelector
                    clients={clients}
                    selectedClient={selectedClient}
                    onChange={handleClientSelect}
                    placeholder="Search or select a client..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Choose from existing clients to auto-fill data, or select "Manual Entry" to enter details manually
                  </p>
                </div>
              )}

              {/* Client Name */}
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Name
                </label>
                <input
                  type="text"
                  id="clientName"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter client name"
                  disabled={!!selectedClient}
                />
              </div>

              {/* Client URL */}
              <div>
                <label htmlFor="clientUrl" className="block text-sm font-medium text-gray-700 mb-2">
                  Client Website
                </label>
                <input
                  type="url"
                  id="clientUrl"
                  required
                  value={formData.clientUrl}
                  onChange={(e) => setFormData({ ...formData, clientUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://client-website.com"
                  disabled={!!selectedClient}
                />
              </div>

              {/* Target Page Selection (Optional) */}
              {selectedClient && targetPages.length > 0 && (
                <div>
                  <label htmlFor="targetPage" className="block text-sm font-medium text-gray-700 mb-2">
                    Target URL (Optional)
                  </label>
                  <select
                    id="targetPage"
                    value={selectedTargetPageId}
                    onChange={(e) => setSelectedTargetPageId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">-- Select a target URL (or choose later) --</option>
                    {targetPages.map(page => (
                      <option key={page.id} value={page.id}>
                        {page.url}
                        {page.description && ` - ${page.description}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    You can select a target URL now or add it later in Step 3
                  </p>
                </div>
              )}

              {/* Error Display */}
              {submitError && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                  {submitError}
                </div>
              )}

              {/* Submit */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.clientName.trim() || !formData.clientUrl.trim()}
                  className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating Workflow...' : 'Create Workflow'}
                </button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h3 className="text-sm font-medium text-blue-800 mb-2">Quick Start Guide:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Select an existing client to auto-fill their information</li>
                <li>• Or enter client information manually for new clients</li>
                <li>• Step 1 of the workflow will help you select the guest post website</li>
                <li>• Later steps will help you determine which client URLs to link to</li>
                <li>• You can <Link href="/clients" className="underline">manage clients</Link> to add target pages for linking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}

export default function NewWorkflow() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>}>
      <NewWorkflowContent />
    </Suspense>
  );
}