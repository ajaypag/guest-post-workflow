'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';

export default function NewWorkflow() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    clientName: '',
    clientUrl: '',
    targetDomain: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const workflow: GuestPostWorkflow = {
      id: crypto?.randomUUID ? crypto.randomUUID() : `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      clientName: formData.clientName,
      clientUrl: formData.clientUrl,
      targetDomain: formData.targetDomain,
      currentStep: 0,
      steps: WORKFLOW_STEPS.map(step => ({
        ...step,
        status: 'pending' as const,
        inputs: {},
        outputs: {},
        completedAt: undefined
      })),
      metadata: {}
    };

    storage.saveWorkflow(workflow);
    router.push(`/workflow/${workflow.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto">
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
        <h2 className="text-2xl font-bold mb-6">Create New Workflow</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
              Client Name
            </label>
            <input
              type="text"
              id="clientName"
              required
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Vanta"
            />
          </div>

          <div>
            <label htmlFor="clientUrl" className="block text-sm font-medium text-gray-700 mb-1">
              Client URL
            </label>
            <input
              type="url"
              id="clientUrl"
              required
              value={formData.clientUrl}
              onChange={(e) => setFormData({ ...formData, clientUrl: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., https://vanta.com"
            />
          </div>

          <div>
            <label htmlFor="targetDomain" className="block text-sm font-medium text-gray-700 mb-1">
              Target Domain (Guest Post Site)
            </label>
            <input
              type="text"
              id="targetDomain"
              required
              value={formData.targetDomain}
              onChange={(e) => setFormData({ ...formData, targetDomain: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., techcrunch.com"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Create Workflow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}