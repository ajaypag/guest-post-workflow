'use client';

import { useState } from 'react';
import { 
  Search, 
  Copy, 
  CheckCircle, 
  Zap, 
  ArrowRight,
  ArrowLeft,
  Settings,
  Target,
  Globe,
  Filter,
  Plus,
  X
} from 'lucide-react';
import Link from 'next/link';

// Popular guest post search operators organized by type
const SEARCH_OPERATORS = {
  basic: [
    { operator: '"write for us"', description: 'Direct write for us pages' },
    { operator: '"guest post"', description: 'General guest posting opportunities' },
    { operator: '"guest author"', description: 'Sites seeking guest authors' },
    { operator: '"contribute"', description: 'Contribution opportunities' },
    { operator: '"submit"', description: 'Submission guidelines' }
  ],
  advanced: [
    { operator: 'inurl:write-for-us', description: 'URLs containing write-for-us' },
    { operator: 'inurl:guest-post', description: 'URLs containing guest-post' },
    { operator: 'inurl:contribute', description: 'URLs containing contribute' },
    { operator: 'intitle:"write for us"', description: 'Page titles with write for us' },
    { operator: 'intitle:"guest post"', description: 'Page titles with guest post' }
  ],
  quality: [
    { operator: 'site:medium.com', description: 'Specific high-authority sites' },
    { operator: 'filetype:pdf', description: 'PDF guest post guidelines' },
    { operator: '"guest posting guidelines"', description: 'Detailed submission rules' },
    { operator: '"editorial guidelines"', description: 'Editorial standards' },
    { operator: '"submission requirements"', description: 'Submission criteria' }
  ],
  niche: [
    { operator: '"guest post" + "business"', description: 'Business niche guest posts' },
    { operator: '"write for us" + "health"', description: 'Health niche opportunities' },
    { operator: '"contribute" + "technology"', description: 'Tech contribution pages' },
    { operator: '"guest author" + "finance"', description: 'Finance guest authoring' },
    { operator: '"submit article" + "lifestyle"', description: 'Lifestyle article submissions' }
  ]
};

const COMMON_NICHES = [
  'business', 'health', 'technology', 'finance', 'lifestyle', 'fitness', 
  'travel', 'food', 'marketing', 'SEO', 'real estate', 'education',
  'parenting', 'fashion', 'beauty', 'sports', 'gaming', 'crypto'
];

interface GeneratedQuery {
  query: string;
  type: string;
  description: string;
}

export default function SearchQueryGeneratorPage() {
  const [keywords, setKeywords] = useState('');
  const [selectedOperators, setSelectedOperators] = useState<string[]>(['"write for us"']);
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [customOperators, setCustomOperators] = useState<string[]>([]);
  const [newCustomOperator, setNewCustomOperator] = useState('');
  const [generatedQueries, setGeneratedQueries] = useState<GeneratedQuery[]>([]);
  const [copiedQuery, setCopiedQuery] = useState<string | null>(null);

  const addCustomOperator = () => {
    if (newCustomOperator.trim() && !customOperators.includes(newCustomOperator.trim())) {
      setCustomOperators([...customOperators, newCustomOperator.trim()]);
      setNewCustomOperator('');
    }
  };

  const removeCustomOperator = (operator: string) => {
    setCustomOperators(customOperators.filter(op => op !== operator));
  };

  const toggleOperator = (operator: string) => {
    setSelectedOperators(prev => 
      prev.includes(operator) 
        ? prev.filter(op => op !== operator)
        : [...prev, operator]
    );
  };

  const toggleNiche = (niche: string) => {
    setSelectedNiches(prev => 
      prev.includes(niche) 
        ? prev.filter(n => n !== niche)
        : [...prev, niche]
    );
  };

  const generateQueries = () => {
    const queries: GeneratedQuery[] = [];
    const keywordList = keywords.split(',').map(k => k.trim()).filter(k => k);
    const allOperators = [...selectedOperators, ...customOperators];
    
    // Basic keyword + operator combinations
    allOperators.forEach(operator => {
      if (keywordList.length === 0) {
        queries.push({
          query: operator,
          type: 'Basic',
          description: `Find sites using: ${operator}`
        });
      } else {
        keywordList.forEach(keyword => {
          queries.push({
            query: `${operator} + "${keyword}"`,
            type: 'Keyword + Operator',
            description: `${keyword} guest posting opportunities`
          });
        });
      }
    });

    // Niche-specific queries
    selectedNiches.forEach(niche => {
      queries.push({
        query: `"write for us" + "${niche}"`,
        type: 'Niche Specific',
        description: `${niche} guest posting sites`
      });
      
      if (keywordList.length > 0) {
        keywordList.forEach(keyword => {
          queries.push({
            query: `"guest post" + "${niche}" + "${keyword}"`,
            type: 'Niche + Keyword',
            description: `${niche} sites accepting ${keyword} content`
          });
        });
      }
    });

    // Advanced combinations
    if (keywordList.length > 0) {
      keywordList.forEach(keyword => {
        queries.push({
          query: `inurl:write-for-us + "${keyword}"`,
          type: 'Advanced URL',
          description: `Write-for-us pages in ${keyword} niche`
        });
        
        queries.push({
          query: `intitle:"guest post" + "${keyword}" + "guidelines"`,
          type: 'Advanced Title',
          description: `Guest post guidelines for ${keyword}`
        });
      });
    }

    // Quality-focused queries
    if (keywordList.length > 0) {
      keywordList.forEach(keyword => {
        queries.push({
          query: `"${keyword}" + "guest posting guidelines" + "high quality"`,
          type: 'Quality Focus',
          description: `High-quality ${keyword} guest posting sites`
        });
      });
    }

    setGeneratedQueries(queries);
  };

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
    const encodedQuery = encodeURIComponent(query);
    window.open(`https://www.google.com/search?q=${encodedQuery}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">Linkio</div>
                <div className="text-xs text-gray-500 -mt-1">Guest Post Query Generator</div>
              </div>
            </Link>
            
            <div className="flex items-center gap-4">
              <Link 
                href="/account/login" 
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Sign In
              </Link>
              <Link 
                href="/signup/marketing" 
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/guest-posting-sites" className="hover:text-gray-900 flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" />
              Guest Posting Sites
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Search Query Generator</span>
          </nav>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Google Search Query Generator</h1>
          <p className="text-gray-600 text-lg">
            Generate powerful Google search queries to find guest posting opportunities. 
            Better than manual searching - discover sites you'd never find otherwise.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Configure Your Search
          </h2>
          
          {/* Keywords Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Keywords (optional)
            </label>
            <input
              type="text"
              placeholder="e.g., digital marketing, SEO, content strategy"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              Separate multiple keywords with commas. Leave blank for general queries.
            </p>
          </div>

          {/* Search Operators */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search Operators
            </h3>
            
            {Object.entries(SEARCH_OPERATORS).map(([category, operators]) => (
              <div key={category} className="mb-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2 capitalize">
                  {category} Operators
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {operators.map((op) => (
                    <label key={op.operator} className="flex items-start gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedOperators.includes(op.operator)}
                        onChange={() => toggleOperator(op.operator)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-sm font-mono text-gray-900">{op.operator}</div>
                        <div className="text-xs text-gray-500">{op.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {/* Custom Operators */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Operators</h4>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Add custom search operator..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  value={newCustomOperator}
                  onChange={(e) => setNewCustomOperator(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCustomOperator()}
                />
                <button
                  onClick={addCustomOperator}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {customOperators.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customOperators.map((operator) => (
                    <span
                      key={operator}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {operator}
                      <button
                        onClick={() => removeCustomOperator(operator)}
                        className="hover:text-blue-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Niche Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Target Niches (optional)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {COMMON_NICHES.map((niche) => (
                <label key={niche} className="flex items-center gap-2 p-2 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedNiches.includes(niche)}
                    onChange={() => toggleNiche(niche)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm capitalize">{niche}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={generateQueries}
            className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            Generate Search Queries
          </button>
        </div>

        {/* Results Section */}
        {generatedQueries.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Filter className="w-5 h-5 text-blue-600" />
                Generated Search Queries ({generatedQueries.length})
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Click any query to search Google directly, or copy for later use
              </p>
            </div>
            
            <div className="p-6">
              <div className="space-y-3">
                {generatedQueries.map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 group">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-medium">
                          {query.type}
                        </span>
                      </div>
                      <div className="font-mono text-sm text-gray-900 mb-1">
                        {query.query}
                      </div>
                      <div className="text-xs text-gray-500">
                        {query.description}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copyToClipboard(query.query)}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy query"
                      >
                        {copiedQuery === query.query ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => openInGoogle(query.query)}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                      >
                        Search Google
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tips Section */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 border border-blue-100">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pro Tips for Guest Post Prospecting
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Advanced Search Techniques:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Use quotation marks for exact phrases</li>
                <li>• Combine operators with + for AND logic</li>
                <li>• Use site: to search specific domains</li>
                <li>• Try inurl: and intitle: for targeted results</li>
                <li>• Add "-" to exclude unwanted terms</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What to Look For:</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Clear submission guidelines</li>
                <li>• Recent guest posts published</li>
                <li>• Contact information or forms</li>
                <li>• Domain authority and traffic metrics</li>
                <li>• Relevance to your niche</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <p className="text-gray-600 mb-4">
              Ready to automate your guest posting outreach?
            </p>
            <Link
              href="/signup/marketing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start with Linkio
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}