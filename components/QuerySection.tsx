'use client';

import { useState } from 'react';
import { Search, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { GeneratedQuery, getQueryUrl } from '@/lib/utils/queryGenerator';
import Link from 'next/link';

interface QuerySectionProps {
  categoryName: string;
  queries: GeneratedQuery[];
}

export default function QuerySection({ categoryName, queries }: QuerySectionProps) {
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayQueries = showAll ? queries : queries.slice(0, 12);

  const copyToClipboard = async (query: string) => {
    try {
      await navigator.clipboard.writeText(query);
      setCopiedQuery(query);
      setTimeout(() => setCopiedQuery(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const openInGoogle = (query: string) => {
    window.open(getQueryUrl(query), '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-blue-50">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Search className="w-5 h-5 text-green-600" />
          {categoryName} Guest Post Search Queries
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Ready-to-use Google search queries to find {categoryName.toLowerCase()} guest posting opportunities beyond our database
        </p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayQueries.map((query, index) => (
            <div key={index} className="p-3 border rounded-lg hover:bg-gray-50 group transition-colors">
              <div className="mb-2">
                <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                  {query.type}
                </span>
              </div>
              <div className="font-mono text-sm text-gray-900 mb-2 break-all">
                {query.query}
              </div>
              <div className="text-xs text-gray-500 mb-3">
                {query.description}
              </div>
              
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => copyToClipboard(query.query)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Copy query"
                >
                  {copiedQuery === query.query ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
                <button
                  onClick={() => openInGoogle(query.query)}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                >
                  <ExternalLink className="w-2.5 h-2.5" />
                  Search
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {queries.length > 12 && (
          <div className="mt-6 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
            >
              {showAll ? 'Show Less' : `Show All ${queries.length} Queries`}
            </button>
          </div>
        )}
      </div>
      
      {/* URL Input CTA */}
      <div className="px-6 py-4 border-t bg-gradient-to-r from-blue-50 to-green-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-4">
            <p className="font-medium text-gray-900 mb-1">Skip the Manual Search</p>
            <p className="text-sm text-gray-600">
              Paste your target URL below and get dedicated {categoryName.toLowerCase()} site suggestions
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="url"
              placeholder="https://your-website.com/page-that-needs-backlinks"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
            <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors whitespace-nowrap">
              Get My Sites
            </button>
          </div>
          
          <p className="text-xs text-gray-500 text-center mt-2">
            We'll analyze your page and suggest the best {categoryName.toLowerCase()} sites for backlinks
          </p>
        </div>
      </div>
    </div>
  );
}