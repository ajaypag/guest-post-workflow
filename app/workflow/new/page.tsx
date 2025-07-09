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
  const [formData, setFormData] = useState({
    clientName: '',
    clientUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
    
    // Pre-select client if coming from client page - TODO: Implement with API routes
    // const clientId = searchParams.get('clientId');
    // if (clientId) {
    //   const client = await clientStorage.getClient(clientId);
    //   if (client) {
    //     handleClientSelect(client);
    //   }
    // }
  }, [searchParams]);

  const loadClients = async () => {
    const session = AuthService.getSession();
    if (!session) return;

    try {
      const allClients = await clientStorage.getAllClients();
      setClients(allClients);
    } catch (error) {
      console.error('Error loading clients:', error);
      setClients([]); // Fallback to empty array on error
    }
  };

  const handleClientSelect = (client: Client | null) => {
    setSelectedClient(client);
    if (client) {
      setFormData({
        clientName: client.name,
        clientUrl: client.website
      });
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
      
      const workflow: GuestPostWorkflow = {
        id: generateUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        clientName: formData.clientName,
        clientUrl: formData.clientUrl,
        targetDomain: '', // Will be set in Step 1: Guest Post Site Selection
        currentStep: 0,
        createdBy: session?.name || 'Unknown User',
        createdByEmail: session?.email,
        steps: WORKFLOW_STEPS.map(step => ({
          ...step,
          status: 'pending' as const,
          inputs: {},
          outputs: {},
          completedAt: undefined
        })),
        metadata: selectedClient ? { clientId: selectedClient.id } : {}
      };

      console.log('Creating workflow:', workflow.id, 'for client:', workflow.clientName);
      await storage.saveWorkflow(workflow);
      console.log('Workflow saved successfully, navigating to:', `/workflow/${workflow.id}`);
      router.push(`/workflow/${workflow.id}`);
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
                    Select Client (Optional)
                  </label>
                  <select
                    value={selectedClient?.id || ''}
                    onChange={(e) => {
                      const client = e.target.value 
                        ? clients.find(c => c.id === e.target.value) || null
                        : null;
                      handleClientSelect(client);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Manual Entry</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} ({client.website})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Choose from existing clients to auto-fill data, or enter manually
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