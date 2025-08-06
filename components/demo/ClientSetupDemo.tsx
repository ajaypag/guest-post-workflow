'use client';

import { useState } from 'react';
import { Plus, Search, Globe, Target, Sparkles, X, Check } from 'lucide-react';

// Sample demo data
const demoClients = [
  { 
    id: '1', 
    name: 'TechFlow Solutions', 
    website: 'https://techflow.com',
    targetPages: [
      { url: 'https://techflow.com/ai-automation', keywords: 'AI automation, workflow automation, business AI' },
      { url: 'https://techflow.com/data-analytics', keywords: 'data analytics, business intelligence, BI tools' }
    ]
  },
  { 
    id: '2', 
    name: 'HealthHub Wellness', 
    website: 'https://healthhub.com',
    targetPages: [
      { url: 'https://healthhub.com/nutrition-guide', keywords: 'nutrition tips, healthy eating, diet planning' }
    ]
  },
  { 
    id: '3', 
    name: 'FinanceFirst Advisory', 
    website: 'https://financefirst.com',
    targetPages: []
  }
];

export default function ClientSetupDemo() {
  const [clients, setClients] = useState(demoClients);
  const [selectedClient, setSelectedClient] = useState(demoClients[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);

  const handleAddTarget = () => {
    setShowTargetModal(true);
    setAiAnalyzing(true);
    
    // Simulate AI analysis
    setTimeout(() => {
      setAiAnalyzing(false);
      const newTarget = {
        url: 'https://techflow.com/cloud-solutions',
        keywords: 'cloud computing, SaaS solutions, cloud migration'
      };
      
      setClients(prev => prev.map(c => 
        c.id === selectedClient.id 
          ? { ...c, targetPages: [...c.targetPages, newTarget] }
          : c
      ));
      
      setSelectedClient(prev => ({
        ...prev,
        targetPages: [...prev.targetPages, newTarget]
      }));
      
      setTimeout(() => setShowTargetModal(false), 1500);
    }, 2000);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Client Management Dashboard</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Client Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {clients.map(client => (
          <div 
            key={client.id}
            onClick={() => setSelectedClient(client)}
            className={`
              p-4 rounded-lg border-2 cursor-pointer transition-all
              ${selectedClient.id === client.id 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-200 hover:border-gray-300 bg-white'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <Globe className="w-5 h-5 text-gray-400" />
              <span className="text-xs text-gray-500">{client.targetPages.length} pages</span>
            </div>
            <div className="font-medium text-gray-900 text-sm">{client.name}</div>
            <div className="text-xs text-gray-500 truncate">{client.website}</div>
          </div>
        ))}
      </div>

      {/* Selected Client Details */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-medium text-gray-900">Target Pages for {selectedClient.name}</h4>
          <button 
            onClick={handleAddTarget}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Target Page
          </button>
        </div>

        <div className="space-y-3">
          {selectedClient.targetPages.map((page, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 mb-1">{page.url}</div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-yellow-500" />
                    <span className="text-xs text-gray-600">AI-extracted keywords:</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {page.keywords.split(', ').map((keyword, i) => (
                      <span key={i} className="px-2 py-0.5 bg-white text-xs text-gray-700 rounded-full border border-gray-200">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {selectedClient.targetPages.length === 0 && (
            <div className="py-8 text-center text-gray-500">
              <Target className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm">No target pages yet</p>
              <p className="text-xs mt-1">Add target URLs to analyze</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Target Modal (simplified) */}
      {showTargetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Target Page</h3>
              <button onClick={() => setShowTargetModal(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            {aiAnalyzing ? (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
                  <Sparkles className="w-6 h-6 text-blue-600 animate-pulse" />
                </div>
                <p className="text-gray-900 font-medium mb-2">AI is analyzing the page...</p>
                <p className="text-sm text-gray-500">Extracting keywords and understanding content</p>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-gray-900 font-medium mb-2">Target page added!</p>
                <p className="text-sm text-gray-500">Keywords extracted successfully</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Annotation */}
      <div className="absolute -right-4 top-20 w-48">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 shadow-lg">
          <div className="text-xs font-semibold text-yellow-800 mb-1">Why This Matters</div>
          <div className="text-xs text-yellow-700">
            AI automatically extracts keywords and analyzes each page, saving hours of manual research
          </div>
        </div>
      </div>
    </div>
  );
}