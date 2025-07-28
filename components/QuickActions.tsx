'use client';

import { ArrowRight, Building2, Search, FileText, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function QuickActions() {
  return (
    <div className="mb-8 bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Guest Post Pipeline</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stage 1: Client Setup */}
        <div className="relative">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">1. Setup Clients</h3>
                <p className="text-sm text-gray-600">Add target pages & keywords</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Link
                href="/clients"
                className="w-full text-sm px-3 py-2 bg-white text-blue-600 border border-blue-200 rounded hover:bg-blue-50 transition-colors flex items-center justify-between group"
              >
                <span>Manage Clients</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/clients?new=true"
                className="w-full text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-between group"
              >
                <span>Add New Client</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
          
          {/* Arrow to next stage */}
          <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Stage 2: Domain Analysis */}
        <div className="relative">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <Search className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">2. Analyze Domains</h3>
                <p className="text-sm text-gray-600">Qualify guest post sites</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Link
                href="/bulk-analysis"
                className="w-full text-sm px-3 py-2 bg-white text-purple-600 border border-purple-200 rounded hover:bg-purple-50 transition-colors flex items-center justify-between group"
              >
                <span>Bulk Analysis</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/clients"
                className="w-full text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-between group"
              >
                <span>Start New Analysis</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
          
          {/* Arrow to next stage */}
          <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
            <ArrowRight className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        {/* Stage 3: Create Workflows */}
        <div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <FileText className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">3. Create Guest Posts</h3>
                <p className="text-sm text-gray-600">Automated 15-step workflow</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <Link
                href="/workflow/new"
                className="w-full text-sm px-3 py-2 bg-white text-green-600 border border-green-200 rounded hover:bg-green-50 transition-colors flex items-center justify-between group"
              >
                <span>New Workflow</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <button
                onClick={() => {
                  const element = document.querySelector('.workflow-list-section');
                  element?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full text-sm px-3 py-2 text-gray-700 hover:bg-gray-50 rounded transition-colors flex items-center justify-between group text-left"
              >
                <span>View Active Workflows</span>
                <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}