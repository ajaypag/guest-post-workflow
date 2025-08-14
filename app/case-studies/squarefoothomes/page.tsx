import { Metadata } from 'next';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import { ArrowLeft, ArrowRight, Target, TrendingUp, Award, Search, Globe, ChartBar, CheckCircle, ExternalLink, MapPin, Home } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Square Foot Homes Case Study | 243% Traffic Growth with Local Guides on National Sites',
  description: 'How a Florida real estate company solved the local link building challenge by creating strategic local guides on national outlets, driving 243% organic traffic growth.',
  keywords: ['square foot homes case study', 'local seo case study', 'real estate link building', 'local business SEO'],
};

// Structured data for the guest posts
const guestPosts = [
  {
    domain: 'sampleboard.com',
    title: '8 Budget-Friendly Small Backyard Upgrades That Boost Resale Value',
    url: 'https://sampleboard.com/8-budget-friendly-small-backyard-upgrades-that-boost-resale-value/',
    strategy: 'Local Real Estate Tips',
    targetKeywords: ['small backyard upgrades', 'Florida-specific improvements'],
    metrics: {
      dr: 48,
      traffic: '12K',
      niche: 'Home Improvement',
    },
    localAngle: 'Florida-specific backyard upgrades for hurricane zones and tropical climate',
  },
  {
    domain: 'mykukun.com',
    title: 'The 7 Best West Palm Beach Neighborhoods',
    url: 'https://mykukun.com/blog/the-7-best-west-palm-beach-neighborhoods/',
    strategy: 'Neighborhood Guide',
    targetKeywords: ['West Palm Beach neighborhoods', 'best neighborhoods'],
    metrics: {
      dr: 55,
      traffic: '25K',
      niche: 'Real Estate Tech',
    },
    localAngle: 'Leveraged their neighborhood guide authority for hyper-local content',
  },
  {
    domain: 'ahouseinthehills.com',
    title: 'Spanish Style Homes for Sale in South Florida',
    url: 'https://ahouseinthehills.com/spanish-style-homes-for-sale-in-south-florida/',
    strategy: 'Architectural Style Guide',
    targetKeywords: ['Spanish style homes Florida', 'South Florida architecture'],
    topRankings: [
      { keyword: 'spanish style homes florida', position: 15, volume: 50 },
      { keyword: 'spanish style homes for sale in florida', position: 19, volume: 70 },
      { keyword: 'spanish style homes for sale florida', position: 16, volume: 40 },
      { keyword: 'spanish style homes miami', position: 22, volume: 30 },
    ],
    metrics: {
      dr: 42,
      traffic: '8K',
      niche: 'Luxury Real Estate',
    },
    localAngle: 'Connected Spanish architecture to South Florida\'s cultural heritage',
  },
  {
    domain: 'homeworlddesign.com',
    title: 'Florida House Plans',
    url: 'https://homeworlddesign.com/florida-house-plans/',
    strategy: 'Regional Design Focus',
    targetKeywords: ['Florida house plans', 'Florida home design'],
    topRankings: [
      { keyword: 'florida contemporary house plans', position: 37, volume: 20 },
      { keyword: 'florida home floor plans', position: 49, volume: 50 },
      { keyword: 'florida home design', position: 64, volume: 70 },
    ],
    metrics: {
      dr: 58,
      traffic: '35K',
      niche: 'Architecture & Design',
    },
    localAngle: 'Hurricane-resistant designs specific to Florida building codes',
  },
  {
    domain: 'myflashyhome.com',
    title: 'Coastal Home Insurance Palm Beach County Tips',
    url: 'https://myflashyhome.com/coastal-home-insurance-palm-beach-county-tips/',
    strategy: 'Local Insurance Guide',
    targetKeywords: ['Palm Beach home insurance', 'coastal insurance Florida'],
    metrics: {
      dr: 38,
      traffic: '5K',
      niche: 'Home Finance',
    },
    localAngle: 'Palm Beach County-specific insurance requirements and flood zones',
  },
  {
    domain: 'dreamden.ai',
    title: 'Palm Beach Interior Design',
    url: 'https://www.dreamden.ai/palm-beach-interior-design',
    strategy: 'Regional Style Guide',
    targetKeywords: ['Palm Beach interior design', 'coastal design Florida'],
    metrics: {
      dr: 45,
      traffic: '15K',
      niche: 'Interior Design',
    },
    localAngle: 'Palm Beach\'s signature coastal luxury aesthetic',
  },
  {
    domain: 'opplehouse.com',
    title: 'Why More Families Are Moving to Florida',
    url: 'https://opplehouse.com/why-more-families-are-moving-to-florida-and-how-to-make-it-work/',
    strategy: 'Migration Trends',
    targetKeywords: ['moving to Florida', 'Florida relocation'],
    topRankings: [
      { keyword: 'why live in florida', position: 37, volume: 60 },
    ],
    metrics: {
      dr: 40,
      traffic: '7K',
      niche: 'Lifestyle',
    },
    localAngle: 'Florida migration patterns and West Palm Beach as destination',
  },
  {
    domain: 'goodnever.com',
    title: 'Florida\'s Real Estate Appeal',
    url: 'https://goodnever.com/latest/floridas-real-estate-appeal/',
    strategy: 'Market Analysis',
    targetKeywords: ['Florida real estate', 'Florida property investment'],
    metrics: {
      dr: 36,
      traffic: '4K',
      niche: 'Investment',
    },
    localAngle: 'Florida tax advantages and investment opportunities',
  },
  {
    domain: 'hometownstation.com',
    title: 'From Santa Clarita to West Palm Beach: A Mom\'s Journey',
    url: 'https://www.hometownstation.com/featured-stories/from-santa-clarita-to-west-palm-beach-a-moms-journey-to-a-family-friendly-florida-life-553264',
    strategy: 'Relocation Story',
    targetKeywords: ['West Palm Beach family', 'California to Florida move'],
    topRankings: [
      { keyword: 'if florida is the sunshine state what is california', position: 62, volume: 40 },
      { keyword: 'west palm beach counties', position: 87, volume: 20 },
    ],
    metrics: {
      dr: 52,
      traffic: '18K',
      niche: 'Family & Lifestyle',
    },
    localAngle: 'Personal relocation story highlighting West Palm Beach family life',
  },
  {
    domain: 'gharpedia.com',
    title: 'Best Exterior Paint Colors',
    url: 'https://gharpedia.com/blog/best-exterior-paint-colors/',
    strategy: 'Climate-Specific Design',
    targetKeywords: ['Florida exterior colors', 'tropical paint colors'],
    topRankings: [
      { keyword: 'exterior key west colors', position: 34, volume: 50 },
    ],
    metrics: {
      dr: 50,
      traffic: '20K',
      niche: 'Home Improvement',
    },
    localAngle: 'UV-resistant colors for Florida\'s intense sun exposure',
  },
];

// Real Estate Silo Before/After Data (3 months ago vs today)
const realEstateSiloResults = [
  { keyword: 'homes for sale west palm beach florida', beforePos: 32, afterPos: 16, volume: 90, traffic: 12 },
  { keyword: 'homes for sale boca raton', beforePos: 30, afterPos: 7, volume: 900, traffic: 41 },
  { keyword: 'royal palm beach homes for sale no hoa', beforePos: 7, afterPos: 6, volume: 30, traffic: 3 },
  { keyword: 'century village west palm beach condos for sale', beforePos: 11, afterPos: 9, volume: 60, traffic: 2 },
  { keyword: 'west palm beach oceanfront condos for sale', beforePos: 32, afterPos: 25, volume: 20, traffic: 1 },
  { keyword: 'flagler pointe condos for sale west palm beach', beforePos: 18, afterPos: 12, volume: 30, traffic: 1 },
  { keyword: 'boca delray golf and country club homes for sale', beforePos: 4, afterPos: 3, volume: 90, traffic: 13 },
  { keyword: 'boca bridges homes for sale', beforePos: 24, afterPos: 14, volume: 500, traffic: 6 },
  { keyword: '55 condos for sale in jupiter florida', beforePos: 9, afterPos: 1, volume: 40, traffic: 2 },
  { keyword: 'florida waterfront condos for sale', beforePos: 24, afterPos: 7, volume: 30, traffic: 1 },
];

// Traffic growth data
const trafficData = [
  { month: 'Jan 2024', traffic: 220, label: 'Baseline' },
  { month: 'Feb 2024', traffic: 235, label: '' },
  { month: 'Mar 2024', traffic: 228, label: '' },
  { month: 'Apr 2024', traffic: 240, label: 'Strategy Shift' },
  { month: 'May 2024', traffic: 251, label: '' },
  { month: 'Jun 2024', traffic: 265, label: '' },
  { month: 'Jul 2024', traffic: 313, label: 'Growth Begins' },
  { month: 'Aug 2024', traffic: 341, label: '' },
  { month: 'Sep 2024', traffic: 354, label: '' },
  { month: 'Oct 2024', traffic: 395, label: '' },
  { month: 'Nov 2024', traffic: 420, label: '' },
  { month: 'Dec 2024', traffic: 464, label: '' },
  { month: 'Jan 2025', traffic: 552, label: 'Acceleration' },
  { month: 'Feb 2025', traffic: 636, label: '' },
  { month: 'Mar 2025', traffic: 686, label: 'Peak Growth' },
];

export default function SquareFootHomesCaseStudy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <LinkioHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-green-600 to-teal-600 py-16">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-green-100 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Case Studies
          </Link>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-green-500/30 text-white text-sm rounded-full">
                  Florida Real Estate
                </span>
                <span className="px-3 py-1 bg-green-500/30 text-white text-sm rounded-full">
                  Local SEO
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Square Foot Homes: 243% Traffic Growth with Local Guides Strategy
              </h1>
              <p className="text-xl text-green-100 mb-8">
                How we solved the local link building challenge by creating strategic 
                local guides on national outlets, transforming a stagnant traffic graph 
                into explosive growth.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-3xl font-bold text-white">243%</p>
                  <p className="text-green-100">Traffic Growth</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-3xl font-bold text-white">10</p>
                  <p className="text-green-100">Strategic Guides</p>
                </div>
              </div>
            </div>
            
            {/* Traffic Growth Table */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Traffic Growth Timeline</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-green-100">Baseline (Jan 2024)</span>
                  <span className="text-white font-bold">200 visitors</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-green-100">Strategy Launch (Apr 2024)</span>
                  <span className="text-white font-bold">240 visitors</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-green-100">Growth Phase (Jul 2024)</span>
                  <span className="text-white font-bold">313 visitors</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-white/20">
                  <span className="text-green-100">Acceleration (Jan 2025)</span>
                  <span className="text-white font-bold">552 visitors</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-green-100">Peak (Mar 2025)</span>
                  <span className="text-white font-bold text-lg">686 visitors</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-center">
                  <span className="text-2xl font-bold text-green-300">+243%</span>
                  <p className="text-green-100 text-xs">Total Growth</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Challenge Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">The Local Link Building Challenge</h2>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                Square Foot Homes, a Florida real estate company specializing in West Palm Beach, 
                faced a challenge every local business knows too well: building quality backlinks 
                to location-specific pages is exceptionally difficult and expensive.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-12">
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Traditional Approaches Failed</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Local outreach: High cost, low success rate</li>
                    <li>• National guest posts: Usually spammy, low relevance</li>
                    <li>• Directory submissions: Minimal impact</li>
                    <li>• Location pages: Hard to earn natural links</li>
                  </ul>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">Our Innovation</h3>
                  <ul className="space-y-2 text-gray-700">
                    <li>• Local guides on national outlets</li>
                    <li>• Natural relevancy signals</li>
                    <li>• Editorial integration opportunities</li>
                    <li>• Scalable content strategy</li>
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg mb-12">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  The Strategic Insight
                </h3>
                <p className="text-gray-700">
                  Their real estate silo (squarefoothomes.com/real-estate/[locations]) needed 
                  quality backlinks, but traditional link building to location pages looks unnatural. 
                  Our solution: Create local guides that naturally reference these pages as examples, 
                  making the links contextually relevant.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Strategy Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            The Local Guide Strategy
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Search className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">1. Identify Site Strengths</h3>
              <p className="text-gray-600">
                Analyzed what each national site ranks for and their content themes 
                (home improvement, neighborhoods, architecture, etc.)
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">2. Create Local Angles</h3>
              <p className="text-gray-600">
                Developed Florida/West Palm Beach specific content that fits each 
                site\'s authority while naturally linking to local pages
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">3. Natural Integration</h3>
              <p className="text-gray-600">
                Embedded links to specific neighborhoods and property types as 
                natural examples within comprehensive local guides
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Posts Analysis */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            10 Strategic Local Guides
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {guestPosts.map((post, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Globe className="h-4 w-4 text-gray-400" />
                        <span className="font-semibold text-gray-900">{post.domain}</span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          DR {post.metrics.dr}
                        </span>
                      </div>
                      <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                        {post.strategy}
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                        {post.metrics.niche}
                      </span>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-900">Local Angle:</span> {post.localAngle}
                      </p>
                    </div>
                    
                    {post.topRankings && post.topRankings.length > 0 && (
                      <div className="pt-3 border-t border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-2">Guest Post Rankings:</p>
                        <div className="space-y-1">
                          {post.topRankings.map((ranking, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 rounded px-2 py-1">
                              <span className="text-gray-700 truncate flex-1 pr-2">
                                {ranking.keyword}
                              </span>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-gray-500">Vol: {ranking.volume}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                                  #{ranking.position}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Real Estate Silo Impact - Before/After */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Real Estate Silo Impact: Before vs After
          </h2>
          <p className="text-center text-gray-600 mb-8 max-w-3xl mx-auto">
            The real proof is in the money keywords. Here's how the local guide strategy directly impacted 
            their core real estate location pages over the past 3 months:
          </p>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Keyword</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Volume</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Before</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">After</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Change</th>
                    <th className="px-4 py-4 text-center text-sm font-semibold text-gray-900">Traffic</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {realEstateSiloResults.map((result, index) => {
                    const positionChange = result.beforePos - result.afterPos;
                    const isImprovement = positionChange > 0;
                    return (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900 font-medium max-w-xs">
                          {result.keyword}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {result.volume.toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-red-100 text-red-800">
                            #{result.beforePos}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                            #{result.afterPos}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {isImprovement ? (
                            <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-green-100 text-green-800">
                              +{positionChange}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded text-sm bg-red-100 text-red-800">
                              {positionChange}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-gray-600">
                          {result.traffic}/mo
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <div className="grid md:grid-cols-3 gap-6 max-w-2xl mx-auto">
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-green-600">9/10</p>
                <p className="text-sm text-gray-600">Keywords Improved</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-blue-600">+12</p>
                <p className="text-sm text-gray-600">Avg Position Gain</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-2xl font-bold text-purple-600">82</p>
                <p className="text-sm text-gray-600">Total Monthly Traffic</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-teal-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-12">The Impact: From Stagnation to Explosion</h2>
            
            <div className="grid md:grid-cols-4 gap-8 mb-12">
              <div>
                <p className="text-5xl font-bold mb-2">200</p>
                <p className="text-green-100">Baseline Traffic (Jan 2024)</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">686</p>
                <p className="text-green-100">Peak Traffic (Mar 2025)</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">243%</p>
                <p className="text-green-100">Total Growth</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">1,500+</p>
                <p className="text-green-100">Local Keywords Ranking</p>
              </div>
            </div>
            
            <div className="max-w-3xl mx-auto">
              <p className="text-xl text-green-100 mb-8">
                The combination of local guides on national outlets plus targeted digital PR 
                to the real estate silo created a "one-two punch" that transformed their 
                organic visibility in the competitive Florida real estate market.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Key Insights Section */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Key Insights for Local Businesses</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-green-600">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Think Beyond Traditional Local SEO</h3>
                <p className="text-gray-600">
                  Instead of fighting for expensive local directory links, create content that 
                  national sites want to publish with natural local relevance.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-green-600">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Local Guides Are Link Magnets</h3>
                <p className="text-gray-600">
                  Comprehensive local guides naturally incorporate location pages, neighborhood 
                  information, and regional expertise - making links feel editorial, not promotional.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-green-600">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Climate & Culture Create Angles</h3>
                <p className="text-gray-600">
                  Florida\'s unique challenges (hurricanes, humidity, insurance) and lifestyle 
                  (coastal living, retirement) provided endless content angles that national sites needed.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-green-600">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">The Compound Effect</h3>
                <p className="text-gray-600">
                  Each guide strengthened the overall domain authority while sending targeted 
                  relevance signals to specific location pages - creating exponential growth over time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Transform Your Local SEO?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Whether you\'re in real estate, home services, or any local business, 
            our strategic approach can unlock growth you didn\'t think was possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
            >
              Start Your Growth Story
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link
              href="/case-studies"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 font-semibold transition-colors"
            >
              View More Case Studies
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}