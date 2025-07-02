'use client';

import { useState, useEffect } from 'react';
import { Plus, FileText, Trash2, Calendar, ExternalLink } from 'lucide-react';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import { format } from 'date-fns';
import Link from 'next/link';

export default function WorkflowList() {
  const [workflows, setWorkflows] = useState<GuestPostWorkflow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const allWorkflows = await storage.getAllWorkflows();
      setWorkflows(allWorkflows);
    } catch (error) {
      console.error('Error loading workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        await storage.deleteWorkflow(id);
        await loadWorkflows();
      } catch (error) {
        console.error('Error deleting workflow:', error);
        alert('Failed to delete workflow');
      }
    }
  };

  const getProgress = (workflow: GuestPostWorkflow) => {
    const completed = workflow.steps.filter(s => s.status === 'completed').length;
    return Math.round((completed / WORKFLOW_STEPS.length) * 100);
  };

  return (
    <div>
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Active Workflows</h2>
          <p className="text-gray-600 mt-1">Manage your guest post campaigns</p>
        </div>
        <Link
          href="/workflow/new"
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Workflow
        </Link>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No workflows yet</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Get started by creating your first guest post workflow. Our 15-step process will guide you through everything.
          </p>
          <Link
            href="/workflow/new"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Your First Workflow
          </Link>
        </div>
      ) : (
        <div className="grid gap-6">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-lg transition-shadow duration-200">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <div className="flex items-center mb-3">
                    <h3 className="text-xl font-semibold text-gray-900">{workflow.clientName}</h3>
                    <div className="ml-3 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                      {getProgress(workflow)}% Complete
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Target Site</div>
                      <p className="text-gray-900 font-medium">
                        {workflow.steps.find(s => s.id === 'domain-selection')?.outputs?.domain || 
                         workflow.targetDomain || 
                         'Not selected yet'}
                      </p>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Target Keyword</div>
                      <p className="text-gray-900 font-medium">
                        {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.finalKeyword || 
                         'Not determined yet'}
                      </p>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Article Title</div>
                      <p className="text-gray-900 font-medium text-sm leading-tight">
                        {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.postTitle || 
                         'Not created yet'}
                      </p>
                    </div>
                    
                    <div>
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Google Doc</div>
                      {workflow.steps.find(s => s.id === 'article-draft')?.outputs?.googleDocUrl ? (
                        <a 
                          href={workflow.steps.find(s => s.id === 'article-draft')?.outputs?.googleDocUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center"
                        >
                          View Document <ExternalLink className="w-3 h-3 ml-1" />
                        </a>
                      ) : (
                        <p className="text-gray-500 font-medium">Not created yet</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Created {format(new Date(workflow.createdAt), 'MMM d, yyyy')}
                      {workflow.createdBy && (
                        <span className="ml-2 text-gray-400">by {workflow.createdBy}</span>
                      )}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1.5" />
                      Updated {format(new Date(workflow.updatedAt), 'MMM d, h:mm a')}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(workflow.id)}
                  className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  title="Delete workflow"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                  <span>Progress</span>
                  <span>{getProgress(workflow)}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-3">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${getProgress(workflow)}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/workflow/${workflow.id}`}
                  className="flex-1 text-center px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                >
                  Continue Workflow
                </Link>
                <Link
                  href={`/workflow/${workflow.id}/overview`}
                  className="px-6 py-3 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                  Overview
                </Link>
                <button
                  onClick={async () => {
                    try {
                      const data = await storage.exportWorkflow(workflow.id);
                      const blob = new Blob([data], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `workflow-${workflow.clientName}-${workflow.id}.json`;
                      a.click();
                    } catch (error) {
                      console.error('Error exporting workflow:', error);
                      alert('Failed to export workflow');
                    }
                  }}
                  className="px-6 py-3 bg-gray-50 text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                >
                  Export
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}