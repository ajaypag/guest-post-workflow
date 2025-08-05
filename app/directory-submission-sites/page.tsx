'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Info
} from 'lucide-react';

// Parse CSV data
const csvData = `Website Name,Website URL,Submit URL,DA,DR,Monthly Organic Traffic,Traffic,Automotive,Business,Careers,Dating,Dental,Design,Diet,Education,Entertainment,Faith,Family,Fashion,Finance,Fitness,Food,General,Health,Home,Insurance,Legal,Lifestyle,Marketing,Mommy Blogs,Music,News,Outdoors,Pets,Photography,Politics,Real Estate,Sales,Self Improvement,Shopping,Sports,Technology,Travel,Web Design,Wedding,Women
zillow.com,https://www.zillow.com/,,86,91,37379650.19,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
realtor.com,https://www.realtor.com/,,90,90,22412827.69,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
trulia.com,https://www.trulia.com/,,85,87,10574583.41,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
mailchimp.com,https://mailchimp.com/experts/,,90,93,6319946.87,Very Very High,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,,,,
drudgereport.com,http://www.drudgereport.com/,,73,77,4934795.04,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,
theknot.com,https://www.theknot.com/,,85,90,4910265.06,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,
lonelyplanet.com,https://www.lonelyplanet.com/,,92,90,3855354.73,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,
loopnet.com,https://www.loopnet.com/,,66,84,2624353.77,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
local.com,http://www.local.com/,,60,81,2313176.64,Very Very High,,x,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
healthdirect.gov.au,https://www.healthdirect.gov.au/,,64,82,2290972.28,Very Very High,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,,,,,,,,,
viator.com,https://www.viator.com/,,80,85,2168284.12,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,
movoto.com,https://www.movoto.com/,,70,76,2102366.79,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
homes.com,https://www.homes.com/,,67,77,2004075.05,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
nolo.com,https://www.nolo.com/,,72,85,1775116.48,Very Very High,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,,,,,,
hotpads.com,https://hotpads.com/,,71,73,1725060.52,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
har.com,https://www.har.com/,,65,81,1482966.4,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,
hubspot.com,https://www.hubspot.com/agencies,https://legacydocs.hubspot.com/docs/methods/forms/submit_form,92,92,1332574.97,Very Very High,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,,,,
active.com,https://www.active.com/,,77,89,1288380.87,Very Very High,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,x,,,,,
g2.com,https://www.g2.com/categories/marketing-services,https://www.g2.com/products/submit-com/competitors/alternatives,65,88,1245526.67,Very Very High,,,,,,,,,,,,,,,,,,,,,,x,,,,,,,,,,,,,,,,,`;

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
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
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              600+ Directory Sites and How To Do Directory Link Building
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
          <div className="flex items-center justify-between">
            <p className="text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredDirectories.length}</span> of {directories.length} directories
            </p>
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
      <section className="py-8">
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
                  {filteredDirectories.map((dir, index) => (
                    <tr key={dir.url} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {index + 1}
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
        </div>
      </section>

      {/* Directory Link Building Guide */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            How to Do Directory Link Building in 2024
          </h2>
          
          <div className="prose prose-lg max-w-none">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    Important: Directory Links Have Changed
                  </h3>
                  <p className="text-yellow-800">
                    Directory link building isn't what it used to be. Google has significantly devalued 
                    low-quality directory links. Focus only on high-quality, niche-relevant directories 
                    with real traffic and editorial standards.
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-2xl font-semibold text-gray-900 mb-4">
              The Right Way to Build Directory Links
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  1. Quality Over Quantity
                </h4>
                <p className="text-gray-600">
                  Focus on directories with DA/DR above 40 and real organic traffic. 
                  A single link from a high-quality, niche-relevant directory is worth more 
                  than 100 links from low-quality directories.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  2. Niche Relevance is Key
                </h4>
                <p className="text-gray-600">
                  Always prioritize directories in your industry. A real estate site should 
                  focus on real estate directories, not general web directories. Use our 
                  category filter to find directories in your niche.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  3. Complete Profiles Matter
                </h4>
                <p className="text-gray-600">
                  Don't just submit your URL and leave. Complete your profile with detailed 
                  descriptions, images, and all available fields. This increases approval 
                  rates and the value of the link.
                </p>
              </div>
              
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  4. Avoid Automation
                </h4>
                <p className="text-gray-600">
                  Never use automated directory submission tools. Manual submission with 
                  unique descriptions for each directory is the only safe approach in 2024.
                </p>
              </div>
            </div>
            
            <h3 className="text-2xl font-semibold text-gray-900 mt-12 mb-4">
              Directory Search Operators
            </h3>
            
            <p className="text-gray-600 mb-4">
              Find more niche-specific directories using these Google search operators:
            </p>
            
            <div className="bg-gray-50 rounded-lg p-6 font-mono text-sm space-y-2">
              <div>intitle:"submit site" + "your niche"</div>
              <div>intitle:"add url" + "your industry"</div>
              <div>intitle:"add your business" + "your city"</div>
              <div>"submit your website" + "free directory"</div>
              <div>allintitle: "your niche" + directory</div>
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