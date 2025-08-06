'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import { 
  Search, 
  Filter,
  Download,
  ArrowUpDown,
  ExternalLink,
  Globe,
  ChevronDown,
  TrendingUp,
  Shield,
  Zap,
  ArrowRight,
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight,
  Copy,
  Sparkles
} from 'lucide-react';
import { directoryCSVData as csvData } from '@/lib/data/directoryData';

interface Directory {
  name: string;
  url: string;
  submitUrl: string;
  da: number;
  dr: number;
  traffic: number;
  trafficLevel: string;
  categories: string[];
}

// Parse CSV into structured data
function parseCSV(csv: string): Directory[] {
  const lines = csv.trim().split('\n');
  const headers = lines[0].split(',');
  
  // Find category column indices
  const categoryStartIndex = headers.indexOf('Automotive');
  const categories = headers.slice(categoryStartIndex);
  
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const dirCategories: string[] = [];
    
    // Check which categories have 'x'
    categories.forEach((cat, index) => {
      if (values[categoryStartIndex + index] === 'x') {
        dirCategories.push(cat);
      }
    });
    
    return {
      name: values[0],
      url: values[1],
      submitUrl: values[2] || values[1],
      da: parseInt(values[3]) || 0,
      dr: parseInt(values[4]) || 0,
      traffic: parseFloat(values[5]) || 0,
      trafficLevel: values[6],
      categories: dirCategories
    };
  });
}

export default function DirectorySubmissionSites() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [minDA, setMinDA] = useState(0);
  const [minDR, setMinDR] = useState(0);
  const [sortBy, setSortBy] = useState<'da' | 'dr' | 'traffic'>('traffic');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [keyword, setKeyword] = useState('');
  const [showSearchOperators, setShowSearchOperators] = useState(false);
  
  // Parse directory data
  const directories = useMemo(() => parseCSV(csvData), []);
  
  // Get unique categories
  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    directories.forEach(dir => dir.categories.forEach(cat => cats.add(cat)));
    return Array.from(cats).sort();
  }, [directories]);
  
  // Filter and sort directories
  const filteredDirectories = useMemo(() => {
    let filtered = directories;
    
    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(dir => 
        dir.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dir.url.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(dir => 
        dir.categories.includes(selectedCategory)
      );
    }
    
    // DA/DR filters
    filtered = filtered.filter(dir => dir.da >= minDA && dir.dr >= minDR);
    
    // Sort
    filtered.sort((a, b) => {
      let aVal = sortBy === 'da' ? a.da : sortBy === 'dr' ? a.dr : a.traffic;
      let bVal = sortBy === 'da' ? b.da : sortBy === 'dr' ? b.dr : b.traffic;
      
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return filtered;
  }, [directories, searchQuery, selectedCategory, minDA, minDR, sortBy, sortOrder]);
  
  // Calculate pagination
  const totalPages = Math.ceil(filteredDirectories.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentDirectories = filteredDirectories.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, minDA, minDR, sortBy, sortOrder, itemsPerPage]);
  
  // Pagination handlers
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Scroll to top of results
      document.getElementById('directory-results')?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 7;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };
  
  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Website Name', 'URL', 'Submit URL', 'DA', 'DR', 'Monthly Traffic', 'Categories'];
    const rows = filteredDirectories.map(dir => [
      dir.name,
      dir.url,
      dir.submitUrl,
      dir.da,
      dir.dr,
      Math.round(dir.traffic),
      dir.categories.join('; ')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `directory-submission-sites-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };
  
  // Generate search operators
  const generateSearchOperators = (keyword: string) => {
    if (!keyword) return [];
    
    const operators = [
      { query: `intitle:"${keyword}"+"add your business"`, description: 'Find directories with "add your business" option' },
      { query: `intitle:"${keyword}"+"add site"`, description: 'Directories accepting site submissions' },
      { query: `intitle:"${keyword}"+"favorite links"`, description: 'Curated link directories' },
      { query: `intitle:"${keyword}"+"listing"`, description: 'Business listing directories' },
      { query: `intitle:"${keyword}"+"submit website"`, description: 'Website submission directories' },
      { query: `intitle:"${keyword}"+"suggest website"`, description: 'Directories accepting suggestions' },
      { query: `intitle:"${keyword}"+intitle:directory`, description: 'General niche directories' },
      { query: `intitle:"${keyword}"+inurl:submit.php`, description: 'Directories with submission forms' },
      { query: `intitle:"${keyword}"+Listings`, description: 'Listing-focused directories' },
      { query: `intitle:"${keyword}"+"coupons for" + " * " + intitle:submit`, description: 'Coupon directories accepting submissions' },
      { query: `intitle:"${keyword}"+"add your business" site:.edu`, description: 'Educational institution directories' },
      { query: `intitle:"${keyword}"+"add url"`, description: 'URL submission directories' },
      { query: `intitle:"${keyword}"+"favorite sites"`, description: 'Favorite sites directories' },
      { query: `intitle:"${keyword}"+"recommended links"`, description: 'Recommendation directories' },
      { query: `intitle:"${keyword}"+"submit"`, description: 'General submission directories' },
      { query: `intitle:"${keyword}"+* directory`, description: 'All types of niche directories' },
      { query: `intitle:"${keyword}"+inurl:".gov" "add your business"`, description: 'Government directories' },
      { query: `intitle:"${keyword}"+directory + add/`, description: 'Directories with add functionality' },
      { query: `intitle:"${keyword}"+coupons + intitle:list`, description: 'Coupon listing directories' },
      { query: `intitle:"${keyword}"+sweeps* + intitle:submit`, description: 'Sweepstakes submission directories' },
      { query: `intitle:"${keyword}"+"add your business" site:.gov`, description: 'Government business directories' },
      { query: `intitle:"${keyword}"+"add website"`, description: 'Website addition directories' },
      { query: `intitle:"${keyword}"+"favorite websites"`, description: 'Favorite websites directories' },
      { query: `intitle:"${keyword}"+"recommended sites"`, description: 'Site recommendation directories' },
      { query: `intitle:"${keyword}"+"suggest site"`, description: 'Site suggestion directories' },
      { query: `intitle:"${keyword}"+directory`, description: 'Simple directory search' },
      { query: `intitle:"${keyword}"+inurl:directory`, description: 'URL-based directory search' },
      { query: `intitle:"${keyword}"+intitle:"directory"`, description: 'Title-focused directory search' },
      { query: `intitle:"${keyword}"+"deals for" + " * " + intitle:submit`, description: 'Deal directories accepting submissions' },
      { query: `intitle:"${keyword}"+giveaways + intitle:submit`, description: 'Giveaway directories' }
    ];
    
    return operators;
  };
  
  const searchOperators = useMemo(() => generateSearchOperators(keyword), [keyword]);
  
  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="default" />
      
      {/* Old header - to be removed */}
      {/* <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-semibold">PostFlow</span>
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-600">Directory Submission Sites</span>
            </div>
            
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
            >
              Get Started
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header> */}

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              580+ Directory Sites and How To Do Directory Link Building
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
              The most comprehensive list of high-quality directory submission sites, 
              filtered by DA, DR, and niche. Download as CSV or filter online.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                <Download className="w-5 h-5" />
                Export {filteredDirectories.length} Directories
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                <Filter className="w-5 h-5" />
                {showFilters ? 'Hide' : 'Show'} Filters
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Google Search Operators */}
      <section className="bg-gradient-to-br from-purple-50 to-blue-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Directory Search Operators
            </h2>
            <p className="text-gray-600">
              Enter your keyword to generate 30 Google search operators for finding niche-specific directories
            </p>
          </div>
          
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Keyword
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="e.g., real estate, fitness, technology"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={() => setShowSearchOperators(!showSearchOperators)}
                  disabled={!keyword}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                >
                  {showSearchOperators ? 'Hide' : 'Generate'} Operators
                </button>
              </div>
            </div>
            
            {showSearchOperators && keyword && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">
                    30 Search Operators for "{keyword}"
                  </h3>
                  <button
                    onClick={() => {
                      const allQueries = searchOperators.map(op => op.query).join('\n');
                      copyToClipboard(allQueries);
                    }}
                    className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy All
                  </button>
                </div>
                
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchOperators.map((operator, index) => (
                    <div 
                      key={index}
                      className="group flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <code className="text-sm text-purple-700 break-all">
                          {operator.query}
                        </code>
                        <p className="text-xs text-gray-500 mt-1">
                          {operator.description}
                        </p>
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => copyToClipboard(operator.query)}
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://www.google.com/search?q=${encodeURIComponent(operator.query)}&num=100`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
                          title="Search in Google (100 results)"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Pro tip:</strong> Click the search icon to run the query in Google with 100 results displayed, 
                    or copy individual operators to customize them further. You can also copy all operators at once to 
                    use in your SEO tools or spreadsheets.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Filters */}
      {showFilters && (
        <section className="bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid md:grid-cols-5 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search directories..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Categories</option>
                  {allCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              {/* Min DA */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min DA
                </label>
                <input
                  type="number"
                  value={minDA}
                  onChange={(e) => setMinDA(parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Min DR */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min DR
                </label>
                <input
                  type="number"
                  value={minDR}
                  onChange={(e) => setMinDR(parseInt(e.target.value) || 0)}
                  min="0"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'da' | 'dr' | 'traffic')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="traffic">Traffic</option>
                  <option value="da">Domain Authority</option>
                  <option value="dr">Domain Rating</option>
                </select>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Results Summary */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <p className="text-gray-600">
                Showing <span className="font-semibold text-gray-900">
                  {filteredDirectories.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredDirectories.length)}
                </span> of <span className="font-semibold text-gray-900">{filteredDirectories.length}</span> directories
                {filteredDirectories.length < directories.length && (
                  <span className="text-sm text-gray-500"> (filtered from {directories.length} total)</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Show:</label>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
                <span className="text-sm text-gray-600">per page</span>
              </div>
            </div>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}
            </button>
          </div>
        </div>
      </section>

      {/* Directory Table */}
      <section id="directory-results" className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Website
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DA
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      DR
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Traffic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categories
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {currentDirectories.map((dir, index) => (
                    <tr key={dir.url} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">{dir.name}</div>
                            <div className="text-xs text-gray-500">{new URL(dir.url).hostname}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`text-sm font-medium ${
                            dir.da >= 70 ? 'text-green-600' : 
                            dir.da >= 40 ? 'text-yellow-600' : 
                            'text-gray-600'
                          }`}>
                            {dir.da}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${
                          dir.dr >= 70 ? 'text-green-600' : 
                          dir.dr >= 40 ? 'text-yellow-600' : 
                          'text-gray-600'
                        }`}>
                          {dir.dr}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {dir.traffic > 1000000 
                            ? `${(dir.traffic / 1000000).toFixed(1)}M` 
                            : dir.traffic > 1000 
                            ? `${(dir.traffic / 1000).toFixed(0)}K`
                            : Math.round(dir.traffic)
                          }
                        </div>
                        <div className="text-xs text-gray-500">{dir.trafficLevel}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {dir.categories.slice(0, 2).map(cat => (
                            <span key={cat} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                              {cat}
                            </span>
                          ))}
                          {dir.categories.length > 2 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded">
                              +{dir.categories.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <a
                          href={dir.submitUrl}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Visit
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {filteredDirectories.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No directories found matching your criteria.</p>
              </div>
            )}
          </div>
          
          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                
                <div className="flex items-center gap-1">
                  {getPageNumbers().map((page, index) => (
                    <button
                      key={index}
                      onClick={() => typeof page === 'number' && goToPage(page)}
                      disabled={page === '...'}
                      className={`px-3 py-2 text-sm font-medium rounded-lg ${
                        page === currentPage
                          ? 'bg-blue-600 text-white'
                          : page === '...'
                          ? 'text-gray-400 cursor-default'
                          : 'text-gray-700 bg-white hover:bg-gray-50 border'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed border"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              
              <div className="text-center mt-3">
                <p className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Comprehensive Directory Link Building Guide */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            The Complete Guide to Directory Link Building in 2024
          </h2>
          
          <div className="prose prose-lg max-w-none">
            {/* The Evolution of Directory Link Building */}
            <div className="mb-12">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                The Evolution of Directory Link Building
              </h3>
              <p className="text-gray-600 mb-4">
                In the "good 'ol days" of SEO, back when dinosaurs roamed the earth and Google didn't care about 
                things like high-quality content, time on page, or any of those other 'pesky' metrics, directory 
                link building was a gold mine.
              </p>
              <p className="text-gray-600 mb-4">
                For about $100, you could build 20,000 directory links while sitting in your pajamas and watching 
                Family Guy reruns. Then, when you got up the next morning... Voila! Your website was #1.
              </p>
              <p className="text-gray-600 mb-4">
                Today, that same tactic will get your website sent to the naughty corner and leave it ranking 
                worse than when you started.
              </p>
              <p className="text-gray-600 mb-4">
                Because of the dramatic decrease in the efficacy of directory link building, most SEOs have written 
                it off entirely. However, if you peel back the curtain and look behind the scenes of the top ranked 
                sites in Google... Almost ALL of them have a metric crapton of directory links.
              </p>
              <p className="text-gray-600 mb-6">
                <strong>So it's clear that directory link building as a strategy still works.</strong> But here's 
                the thing... Even though the strategy still works, the tactics with which you execute it have 
                changed dramatically.
              </p>
            </div>

            {/* Important Caveat */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-12">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    A Quick Caveat: Directory Links Are Not a Silver Bullet
                  </h3>
                  <p className="text-yellow-800 mb-3">
                    Directory link building works. But... This strategy alone isn't going to get your website to 
                    the top of the SERPs overnight (or ever for that matter).
                  </p>
                  <ul className="space-y-2 text-yellow-800">
                    <li>• Without high quality content, this strategy will not make a difference.</li>
                    <li>• Without regular guest post link building, this strategy won't accomplish squat.</li>
                    <li>• Without effective on-page SEO and a good UX, well... You might as well just put on some 
                    tribal drums and try to boost your ranking by doing the "Search Engine Dance".</li>
                  </ul>
                  <p className="text-yellow-800 mt-3">
                    Think of directory links as the foundation of your house. Essential, but not the whole structure.
                  </p>
                </div>
              </div>
            </div>
            
            {/* 4 Ways to Find Quality Directories */}
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              4 Dead Simple Ways to Find Quality Directories
            </h3>
            
            <div className="space-y-8 mb-12">
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  1. Finding Niche Directories with Advanced Search Strings
                </h4>
                <p className="text-gray-600 mb-4">
                  Use Google's advanced search operators to identify niche-relevant directories:
                </p>
                <div className="bg-white rounded-lg p-4 font-mono text-sm space-y-2 border border-gray-200">
                  <div>"industry" inurl:directory</div>
                  <div>"industry" inurl:links</div>
                  <div>"industry" intitle:directory</div>
                  <div>intitle:industry inurl:directory</div>
                  <div>related:industry inurl:directory</div>
                </div>
                <p className="text-gray-600 mt-3 text-sm">
                  Example: "seo agency" inurl:directory
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  2. Finding Local Directories for Brick & Mortar
                </h4>
                <p className="text-gray-600 mb-4">
                  For local businesses, use location-specific search parameters:
                </p>
                <div className="bg-white rounded-lg p-4 font-mono text-sm space-y-2 border border-gray-200">
                  <div>"city" inurl:directory</div>
                  <div>"city" inurl:businesses</div>
                  <div>"city" intitle:directory</div>
                  <div>"city industry" intitle:directory</div>
                  <div>"city directory" intitle:industry</div>
                </div>
                <p className="text-gray-600 mt-3 text-sm">
                  Example: "denver directory" intitle:seo
                </p>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  3. Reverse Engineering Competitor Backlinks
                </h4>
                <p className="text-gray-600 mb-4">
                  A much simpler way is to reverse engineer your competitors' backlinks to figure out which 
                  directories they are using. Use tools like:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Linkio for detailed anchor text analysis</li>
                  <li>• Ahrefs or Moz for comprehensive backlink profiles</li>
                  <li>• Focus on competitors with good domain authority</li>
                  <li>• Export and filter for directory links</li>
                </ul>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">
                  4. Finding "Mini Directories" on Niche Sites
                </h4>
                <p className="text-gray-600 mb-4">
                  Search for "Best of" articles or resource pages that function as mini-directories:
                </p>
                <ul className="space-y-2 text-gray-600">
                  <li>• Search: "Best [Your Industry] Companies"</li>
                  <li>• Target pages ranking on 2nd-10th position</li>
                  <li>• Look for outdated listings you can replace</li>
                  <li>• Provide case studies to prove your worth</li>
                </ul>
              </div>
            </div>
            
            {/* How to Determine Quality */}
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              The No-Nonsense Way to Determine Directory Quality
            </h3>
            
            <div className="space-y-6 mb-12">
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Follow vs. Nofollow & Google Indexed
                </h4>
                <p className="text-gray-600">
                  Before anything else, ask: Does the directory offer dofollow links? Is it indexed by Google? 
                  If the answer to either is "No", move on immediately.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Editorial Selection Policy
                </h4>
                <p className="text-gray-600">
                  Quality directories are selective. They should have a vetting process, possibly charge a 
                  reasonable editorial fee, or require detailed submissions. If they accept everyone, they're 
                  not worth your time.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Niche Relevance (Specificity)
                </h4>
                <p className="text-gray-600">
                  Ensure the majority of links you build are from directories relevant to your niche. 
                  With Google's algorithm updates, relevancy is more important than ever.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Part of a Trusted Domain
                </h4>
                <p className="text-gray-600">
                  Target directories that are part of a trusted domain (like Forbes "Best of the Web" or 
                  business.com), not standalone directory sites.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Useful, Unique, and Well-Organized
                </h4>
                <p className="text-gray-600">
                  Test: Try to find a specific business on the directory. If it's difficult or returns 
                  spammy results, skip it. Good directories are easy to navigate and provide value.
                </p>
              </div>
              
              <div className="border-l-4 border-blue-600 pl-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  ✅ Links to Reputable Sites Only
                </h4>
                <p className="text-gray-600">
                  Check the other sites the directory links to. If it's full of spam or low-quality sites, 
                  avoid it. Google looks at the neighborhood you're in.
                </p>
              </div>
            </div>
            
            {/* Execution Best Practices */}
            <h3 className="text-2xl font-semibold text-gray-900 mb-6">
              How to Execute Your Directory Link Building Campaign
            </h3>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-blue-900 mb-3">
                  🎯 Goal #1: Branded or URL Anchors to Homepage
                </h4>
                <p className="text-blue-800">
                  Anchor text matters. When building directory links, use ONLY:
                </p>
                <ul className="mt-3 space-y-2 text-blue-800">
                  <li>• Branded anchors (e.g., "Linkio", "Linkio.com")</li>
                  <li>• URL anchors (e.g., "www.linkio.com", "https://www.linkio.com")</li>
                </ul>
                <p className="text-blue-800 mt-3">
                  If a directory doesn't allow these anchor types, skip it.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-green-900 mb-3">
                  🎯 Keep It Niche Relevant
                </h4>
                <p className="text-green-800">
                  At least 80% of your directory links should be from niche-specific directories. 
                  General directories like Yahoo! or DMOZ are just icing on the cake. Google values 
                  relevant directory backlinks far more than authoritative but irrelevant ones.
                </p>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-purple-900 mb-3">
                  🎯 Remember: It's Not a Magic Bullet
                </h4>
                <p className="text-purple-800">
                  Directory link building complements your existing SEO efforts—it doesn't replace them. 
                  Think of it as solidifying your brand and giving your website thematic relevance signals 
                  that prepare your link profile for future keyword-anchored links.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Build Better Links?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Directory links are just the beginning. Get a complete link building strategy 
            with anchor text optimization, competitor analysis, and more.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              href="/anchor-text-optimizer"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 font-semibold transition-colors"
            >
              Try Anchor Text Tool
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}