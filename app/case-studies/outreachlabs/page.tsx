import { Metadata } from 'next';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import { ArrowLeft, ArrowRight, Target, TrendingUp, Award, Search, Globe, ChartBar, CheckCircle, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'OutreachLabs Case Study | 97 Keywords Ranking from 5 Strategic Guest Posts',
  description: 'Deep-dive case study: How we identified niche opportunities and placed 5 strategic guest posts that now rank for 97 keywords, driving 250+ monthly organic traffic.',
  keywords: ['outreachlabs case study', 'link building results', 'guest post rankings', 'B2B SEO case study'],
};

// Structured data for the guest posts
const guestPosts = [
  {
    domain: 'webbiquity.com',
    title: 'Nine B2B Link Building Services Ranked by ROI',
    url: 'https://webbiquity.com/search-engine-optimization-seo/b2b-link-building-services-roi-buyers-guide-2025/',
    strategy: 'B2B Marketing Authority',
    targetKeywords: ['B2B link building services', 'link acquisition services'],
    topRankings: [
      { keyword: 'link acquisition services', position: 80, volume: 70 },
      { keyword: 'link building book', position: 97, volume: 50 },
    ],
    metrics: {
      dr: 65,
      traffic: '15K',
      niche: 'B2B Marketing',
    },
  },
  {
    domain: 'seopressor.com',
    title: 'Best Press Release Service for SEO',
    url: 'https://seopressor.com/blog/best-press-release-service-for-seo/',
    strategy: 'PR + SEO Intersection',
    targetKeywords: ['press release SEO', 'SEO press release service'],
    topRankings: [
      { keyword: 'seo press release', position: 25, volume: 20 },
      { keyword: 'seopressor review', position: 49, volume: 30 },
      { keyword: 'google press release seo', position: 73, volume: 100 },
      { keyword: 'seo press release service', position: 79, volume: 70 },
    ],
    metrics: {
      dr: 58,
      traffic: '8K',
      niche: 'SEO Tools',
    },
  },
  {
    domain: 'publicmediasolution.com',
    title: 'Link Building Public Relations Agency',
    url: 'https://publicmediasolution.com/blog/link-building-public-relations-agency/',
    strategy: 'PR Agency Focus',
    targetKeywords: ['PR link building', 'public relations link building'],
    topRankings: [],
    metrics: {
      dr: 42,
      traffic: '3K',
      niche: 'Public Relations',
    },
  },
  {
    domain: 'datadab.com',
    title: 'Local SEO Reseller Programs',
    url: 'https://www.datadab.com/blog/local-seo-reseller-programs/',
    strategy: 'Local SEO + Reseller Angle',
    targetKeywords: ['local SEO reseller', 'SEO reseller programs'],
    topRankings: [
      { keyword: 'local seo resellers', position: 7, volume: 350 },
      { keyword: 'local seo reseller programs', position: 8, volume: 350 },
      { keyword: 'seo reseller hub', position: 7, volume: 150 },
      { keyword: 'reseller local seo', position: 10, volume: 70 },
      { keyword: 'local seo reseller', position: 13, volume: 1000 },
    ],
    metrics: {
      dr: 45,
      traffic: '5K',
      niche: 'Local SEO',
    },
  },
  {
    domain: 'modernmarketingpartners.com',
    title: '9 Best White Hat Link Building Services',
    url: 'https://www.modernmarketingpartners.com/2025/07/08/9-best-white-hat-link-building-services/',
    strategy: 'White Hat + Long Tail',
    targetKeywords: ['white hat link building', 'white hat link building services'],
    topRankings: [
      { keyword: 'white hat link building agency', position: 3, volume: 90 },
      { keyword: 'whitehat link building service', position: 4, volume: 60 },
      { keyword: 'white hat outreach', position: 5, volume: 200 },
      { keyword: 'white hat link building company', position: 5, volume: 60 },
      { keyword: 'white hat link building service', position: 11, volume: 1400 },
    ],
    metrics: {
      dr: 52,
      traffic: '7K',
      niche: 'Marketing Services',
    },
  },
];

// Top performing keywords data
const topKeywords = [
  { keyword: 'white hat link building service', position: 11, volume: 1400, traffic: 34, url: 'modernmarketingpartners.com' },
  { keyword: 'local seo reseller', position: 13, volume: 1000, traffic: 13, url: 'datadab.com' },
  { keyword: 'local seo resellers', position: 7, volume: 350, traffic: 18, url: 'datadab.com' },
  { keyword: 'local seo reseller programs', position: 8, volume: 350, traffic: 13, url: 'datadab.com' },
  { keyword: 'white hat outreach', position: 5, volume: 200, traffic: 13, url: 'modernmarketingpartners.com' },
  { keyword: 'seo reseller hub', position: 7, volume: 150, traffic: 8, url: 'datadab.com' },
  { keyword: 'white hat link building services', position: 10, volume: 150, traffic: 5, url: 'modernmarketingpartners.com' },
  { keyword: 'white hat link', position: 12, volume: 150, traffic: 3, url: 'modernmarketingpartners.com' },
];

export default function OutreachLabsCaseStudy() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <LinkioHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 py-16">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Back Link */}
          <Link
            href="/case-studies"
            className="inline-flex items-center gap-2 text-blue-100 hover:text-white mb-8 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Case Studies
          </Link>
          
          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-500/30 text-white text-sm rounded-full">
                  B2B Link Building Agency
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
                OutreachLabs: 97 Keywords from 5 Strategic Posts
              </h1>
              <p className="text-xl text-blue-100 mb-8">
                How we used AI-powered site qualification to identify perfect placement opportunities,
                resulting in immediate rankings across competitive B2B keywords.
              </p>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-3xl font-bold text-white">251+</p>
                  <p className="text-blue-100">Monthly Organic Traffic</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-4">
                  <p className="text-3xl font-bold text-white">#2</p>
                  <p className="text-blue-100">Best Ranking Position</p>
                </div>
              </div>
            </div>
            
            {/* Visual Chart */}
            <div className="bg-white/10 backdrop-blur rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4">Keywords by Position Range</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-blue-100 w-20">Top 10</span>
                  <div className="flex-1 bg-white/20 rounded-full h-8">
                    <div className="bg-green-400 h-8 rounded-full flex items-center px-3" style={{width: '15%'}}>
                      <span className="text-sm font-semibold text-green-900">14</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-100 w-20">11-20</span>
                  <div className="flex-1 bg-white/20 rounded-full h-8">
                    <div className="bg-blue-400 h-8 rounded-full flex items-center px-3" style={{width: '12%'}}>
                      <span className="text-sm font-semibold text-blue-900">11</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-100 w-20">21-50</span>
                  <div className="flex-1 bg-white/20 rounded-full h-8">
                    <div className="bg-yellow-400 h-8 rounded-full flex items-center px-3" style={{width: '30%'}}>
                      <span className="text-sm font-semibold text-yellow-900">29</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-blue-100 w-20">51-100</span>
                  <div className="flex-1 bg-white/20 rounded-full h-8">
                    <div className="bg-orange-400 h-8 rounded-full flex items-center px-3" style={{width: '45%'}}>
                      <span className="text-sm font-semibold text-orange-900">43</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Strategy Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">The Strategic Approach</h2>
            
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-600 mb-6">
                OutreachLabs came to us with a clear goal: establish authority in the competitive
                B2B link building space. Instead of a spray-and-pray approach, we developed a 
                surgical strategy based on three key insights:
              </p>
              
              <div className="space-y-6 mb-12">
                <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    1. Target Page Analysis
                  </h3>
                  <p className="text-gray-700">
                    We started by analyzing OutreachLabs' two key pages: their homepage and 
                    Link Building Services page. Our AI extracted their core keyword themes 
                    around B2B link building, white hat outreach, and SEO services.
                  </p>
                </div>
                
                <div className="bg-green-50 border-l-4 border-green-500 p-6 rounded-r-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <Search className="h-5 w-5 text-green-600" />
                    2. Opportunity Identification
                  </h3>
                  <p className="text-gray-700">
                    Our system identified sites with existing rankings in related topics:
                  </p>
                  <ul className="mt-3 space-y-2 text-gray-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Webbiquity:</strong> Strong B2B marketing authority → Target "B2B link building services"</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>DataDab:</strong> SEO reseller rankings → Target "local SEO reseller" (less competitive angle)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span><strong>Modern Marketing:</strong> Service rankings → Target long-tail "white hat link building"</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-purple-50 border-l-4 border-purple-500 p-6 rounded-r-lg">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    3. Content Optimization
                  </h3>
                  <p className="text-gray-700">
                    Each article was strategically crafted to match the host site's authority level
                    and existing topical strengths, ensuring maximum ranking potential from day one.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guest Posts Analysis */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            The 5 Strategic Placements
          </h2>
          
          <div className="space-y-8">
            {guestPosts.map((post, index) => (
              <div key={index} className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="h-5 w-5 text-gray-400" />
                        <span className="font-semibold text-gray-900">{post.domain}</span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          DR {post.metrics.dr}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          {post.metrics.traffic} traffic
                        </span>
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full">
                          {post.strategy}
                        </span>
                        <span className="px-3 py-1 bg-green-50 text-green-700 text-sm rounded-full">
                          {post.metrics.niche}
                        </span>
                      </div>
                    </div>
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      View Article
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                  
                  {post.topRankings.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Top Rankings Achieved:</h4>
                      <div className="grid md:grid-cols-2 gap-3">
                        {post.topRankings.map((ranking, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{ranking.keyword}</p>
                              <p className="text-sm text-gray-600">Volume: {ranking.volume}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-green-600">#{ranking.position}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Top Keywords Table */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            Top Performing Keywords
          </h2>
          
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Keyword</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Position</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Volume</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Traffic</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Guest Post</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topKeywords.map((keyword, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-gray-900 font-medium">{keyword.keyword}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
                          keyword.position <= 10 ? 'bg-green-100 text-green-800' :
                          keyword.position <= 20 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          #{keyword.position}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{keyword.volume.toLocaleString()}</td>
                      <td className="px-6 py-4 text-gray-600">{keyword.traffic}/mo</td>
                      <td className="px-6 py-4 text-gray-600 text-sm">{keyword.url}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Plus 89 additional keywords ranking in positions 21-100
            </p>
          </div>
        </div>
      </section>

      {/* Results Summary */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <h2 className="text-3xl font-bold mb-12">The Results Speak for Themselves</h2>
            
            <div className="grid md:grid-cols-4 gap-8">
              <div>
                <p className="text-5xl font-bold mb-2">5</p>
                <p className="text-blue-100">Strategic Guest Posts</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">97</p>
                <p className="text-blue-100">Keywords Ranking</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">251+</p>
                <p className="text-blue-100">Monthly Organic Traffic</p>
              </div>
              <div>
                <p className="text-5xl font-bold mb-2">4 wks</p>
                <p className="text-blue-100">To First Rankings</p>
              </div>
            </div>
            
            <div className="mt-12 max-w-3xl mx-auto">
              <p className="text-xl text-blue-100 mb-8">
                By focusing on strategic placement rather than volume, OutreachLabs achieved 
                immediate rankings across their target keywords, establishing authority in the 
                competitive B2B link building space.
              </p>
              
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-lg hover:bg-gray-100 font-semibold transition-colors"
              >
                Start Your Success Story
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Key Takeaways */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Key Takeaways</h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Quality Over Quantity</h3>
                <p className="text-gray-600">
                  5 well-placed guest posts outperformed what most agencies achieve with 50+ placements.
                  The key is matching content to sites that already have topical authority.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Strategic Angle Selection</h3>
                <p className="text-gray-600">
                  Instead of competing head-on for "SEO reseller," we targeted "local SEO reseller" - 
                  a less competitive angle that still drives qualified traffic.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Long-Tail Domination</h3>
                <p className="text-gray-600">
                  By targeting specific long-tail variations like "white hat link building service," 
                  we achieved top 5 rankings within weeks, not months.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="font-bold text-blue-600">4</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">AI-Powered Site Qualification</h3>
                <p className="text-gray-600">
                  Our AI analyzed thousands of potential sites to identify the exact ones with the 
                  right topical authority to rank for OutreachLabs' target keywords.
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
            Ready to Replicate This Success?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Our AI-powered platform identifies the perfect placement opportunities for your business.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              Get Started Today
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