import { Metadata } from 'next';
import { db } from '@/lib/db/connection';
import { websites } from '@/lib/db/websiteSchema';
import { sql } from 'drizzle-orm';
import { 
  Globe, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter,
  CheckCircle,
  Users,
  Building2,
  Zap,
  ArrowRight,
  Shield,
  Target,
  PenTool,
  Send
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'AI-Powered Guest Post Service - Find Sites That Actually Rank | PostFlow',
  description: 'Our AI analyzes 13,000+ sites to find the 5-10 with genuine topical authority for YOUR keywords. Transparent pricing: wholesale cost + $79. No markups, just results.',
};

async function getWebsites() {
  try {
    // Get initial websites for server-side rendering
    const websiteResults = await db
      .select({
        id: websites.id,
        domain: websites.domain,
        domainRating: websites.domainRating,
        totalTraffic: websites.totalTraffic,
        guestPostCost: websites.guestPostCost,
        categories: websites.categories,
        overallQuality: websites.overallQuality,
        hasGuestPost: websites.hasGuestPost,
      })
      .from(websites)
      .orderBy(sql`${websites.domainRating} DESC NULLS LAST`)
      .limit(50);

    // Get total count - no filtering
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(websites);

    // Get categories
    const categoriesResult = await db.execute(sql`
      SELECT 
        UNNEST(categories) as category,
        COUNT(*) as count
      FROM websites
      WHERE categories IS NOT NULL 
      GROUP BY category
      HAVING COUNT(*) >= 5
      ORDER BY count DESC
      LIMIT 12
    `);

    return {
      websites: websiteResults.map(site => ({
        id: site.id,
        domain: site.domain,
        domainRating: site.domainRating,
        totalTraffic: site.totalTraffic,
        guestPostCost: site.guestPostCost ? parseFloat(site.guestPostCost.toString()) : null,
        categories: site.categories || [],
        overallQuality: site.overallQuality,
        hasGuestPost: site.hasGuestPost,
      })),
      totalCount: countResult[0]?.count || 0,
      categories: categoriesResult.rows.map((row: any) => ({
        name: row.category,
        count: parseInt(row.count),
      })),
    };
  } catch (error) {
    console.warn('Could not fetch websites data, database not available during build:', error);
    return {
      websites: [],
      totalCount: 13000, // Fallback number for build time
      categories: [],
    };
  }
}

function getCostIndicator(cost: number | null) {
  if (!cost) return '-';
  if (cost <= 50) return '$';
  if (cost <= 150) return '$$';
  if (cost <= 300) return '$$$';
  return '$$$$';
}

function getTrafficDisplay(traffic: number | null) {
  if (!traffic) return '-';
  if (traffic >= 1000000) return `${(traffic / 1000000).toFixed(1)}M`;
  if (traffic >= 1000) return `${(traffic / 1000).toFixed(1)}K`;
  return traffic.toString();
}

export default async function GuestPostingSitesPage() {
  const { websites, totalCount, categories } = await getWebsites();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Public Header - Similar to app header but simplified */}
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo matching main app */}
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PostFlow</div>
                <div className="text-xs text-gray-500 -mt-1">Transparent Link Building</div>
              </div>
            </Link>
            
            {/* Actions */}
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

      {/* Hero Section with Value Proposition */}
      <section className="bg-gradient-to-br from-blue-50 to-white py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Stop Wasting Money on Links That Don't Rank
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Our AI finds the 5-10 sites (out of 13,000+) with genuine topical authority for YOUR keywords.
            <br />Transparent pricing: Wholesale cost + $79. No markups, no games.
          </p>
          
          {/* Value Props */}
          <div className="grid md:grid-cols-4 gap-6 mt-12">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Wholesale Pricing</h3>
              <p className="text-sm text-gray-600">See exact publisher costs, no hidden markups</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Shield className="w-8 h-8 text-blue-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI Topical Analysis</h3>
              <p className="text-sm text-gray-600">Find sites that rank for YOUR keywords</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <PenTool className="w-8 h-8 text-purple-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Expert Content</h3>
              <p className="text-sm text-gray-600">AI-resistant articles that actually rank</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <Send className="w-8 h-8 text-orange-600 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Full Service</h3>
              <p className="text-sm text-gray-600">We handle outreach and placement</p>
            </div>
          </div>
        </div>
      </section>

      {/* Educational Content Section */}
      <section className="py-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="prose prose-lg max-w-none">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            The Hidden Problem: 99% of Guest Posts Fail
          </h2>
          <p className="text-gray-600 mb-4">
            Here's what nobody talks about: You can get a link on a DR70 health site, but if 
            you're selling gardening tools, Google knows it's irrelevant. Even worse – that 
            "health" site might only rank for ultra-specific long-tail terms like "best organic 
            prenatal vitamins for vegans in 2024."
          </p>
          <p className="text-gray-600 mb-8">
            <strong>The real challenge isn't finding high DR sites</strong> – it's understanding 
            which sites have topical authority for YOUR keywords and what content angles will 
            actually rank. Our AI analyzes 13,000+ sites to find the 5-10 that can genuinely 
            move the needle for your specific business.
          </p>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            How We Find Your Perfect 5-10 Sites (Out of 13,000+)
          </h3>
          <p className="text-gray-600 mb-6">
            Our AI-powered analysis goes beyond basic metrics. For each of your target keywords, 
            we analyze:
          </p>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Target className="w-5 h-5 text-blue-600 mr-2" />
                Topical Match Score
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Direct:</strong> Already ranks for your keywords</li>
                <li>• <strong>Related:</strong> Ranks for sibling topics</li>
                <li>• <strong>Both:</strong> Maximum authority signals</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                Authority Assessment
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Strong:</strong> Top 30 rankings (pages 1-3)</li>
                <li>• <strong>Moderate:</strong> Positions 31-60</li>
                <li>• <strong>Weak:</strong> Positions 61-100</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <PenTool className="w-5 h-5 text-purple-600 mr-2" />
                Content Strategy
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Short-tail:</strong> Can rank broadly</li>
                <li>• <strong>Long-tail:</strong> Needs modifiers</li>
                <li>• <strong>Ultra-specific:</strong> Niche angles</li>
              </ul>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 my-8">
            <h4 className="font-semibold text-gray-900 mb-2">Example: Why Most Link Building Fails</h4>
            <p className="text-gray-700 mb-3">
              Let's say you're selling project management software. A typical link building agency might get you:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>• DR70 health blog → <span className="text-red-600">Zero ranking value</span> (wrong topic)</li>
              <li>• DR65 general business site → <span className="text-orange-600">Minimal value</span> (too broad)</li>
              <li>• DR45 project management blog → <span className="text-green-600">Maximum value</span> (perfect topical match)</li>
            </ul>
            <p className="text-gray-700 mt-3">
              <strong>Our AI identifies that DR45 site as a "Strong/Direct" match</strong> because it already ranks 
              for your exact keywords. That single link will outperform 10 links from high DR but topically 
              irrelevant sites.
            </p>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            See Your Actual AI Analysis Results
          </h3>
          <p className="text-gray-600 mb-6">
            When you submit your keywords, our AI analyzes all 13,000+ sites and provides a detailed report 
            showing exactly why each site was selected or rejected. No black box – you see everything.
          </p>

          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h4 className="font-semibold text-gray-900 mb-4">Sample AI Analysis Output</h4>
            <div className="space-y-4">
              <div className="bg-white rounded p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium">techtools.com</h5>
                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">Qualified</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Overlap:</span>
                    <span className="font-medium ml-1">Direct</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Authority:</span>
                    <span className="font-medium ml-1">Strong</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Strategy:</span>
                    <span className="font-medium ml-1">Short-tail</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Evidence: Ranks #12 for "project management software", #8 for "task tracking tools"
                </p>
              </div>
              
              <div className="bg-white rounded p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium">businessnews.com</h5>
                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">Disqualified</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Overlap:</span>
                    <span className="font-medium ml-1">None</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Authority:</span>
                    <span className="font-medium ml-1">N/A</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Strategy:</span>
                    <span className="font-medium ml-1">-</span>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Evidence: No rankings found for any project management related keywords
                </p>
              </div>
            </div>
          </div>

          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Our Transparent Pricing Model
          </h3>
          <p className="text-gray-600 mb-6">
            Inspired by Mark Cuban's Cost Plus Drugs model, we show you the exact wholesale 
            cost of each guest post opportunity. You pay that cost plus our flat $79 service 
            fee. No hidden markups, no percentage games.
          </p>

          <div className="bg-blue-50 border-l-4 border-blue-600 p-6 my-8">
            <h4 className="font-semibold text-gray-900 mb-2">What Our $79 Service Includes:</h4>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>AI-Powered Site Selection</strong> - From 13,000+ sites, we identify the 5-10 with genuine topical authority for your keywords</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Content Strategy Optimization</strong> - We determine if each site needs short-tail, long-tail, or ultra-specific content angles</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Expert Article Creation</strong> - 1000-1500 words written specifically for the site's ranking ability</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <span><strong>Full Placement Service</strong> - Professional outreach, negotiation, and quality assurance</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Website Directory Section */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Browse {totalCount.toLocaleString()} Guest Posting Opportunities
            </h2>
            <p className="text-lg text-gray-600">
              Real wholesale costs from our publisher network. Add $79 for our complete service.
            </p>
          </div>

          {/* Category Pills */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Popular Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <Link
                  key={cat.name}
                  href={`/guest-posting-sites/${cat.name.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '')}`}
                  className="inline-flex items-center px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors"
                >
                  {cat.name}
                  <span className="ml-2 text-xs bg-white px-1.5 py-0.5 rounded">{cat.count}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Websites Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Sample websites from our network.</span> 
                {" "}Wholesale costs shown • Add $79 per link for our service
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Your Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categories</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {websites.map((site) => (
                  <tr key={site.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{site.domain}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{site.domainRating || '-'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{getTrafficDisplay(site.totalTraffic)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {site.guestPostCost ? `$${site.guestPostCost}` : 'Free'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-green-600">
                        ${(site.guestPostCost || 0) + 79}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {site.categories.length > 0 && (
                        <div className="flex gap-1">
                          {site.categories.slice(0, 2).map((cat: string, i: number) => (
                            <span 
                              key={i}
                              className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                          {site.categories.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{site.categories.length - 2}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href="/signup/marketing"
                        className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 inline-block"
                      >
                        Get Started
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Table Footer */}
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing 1 to {websites.length} of {totalCount.toLocaleString()} websites
                </p>
                <Link
                  href="/signup/marketing"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Create account to browse all sites →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            How Our Service Works
          </h2>
          
          <div className="space-y-8">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Submit Your Target Keywords</h3>
                <p className="text-gray-600">
                  Tell us what keywords you want to rank for. Our AI analyzes all {totalCount.toLocaleString()} sites 
                  in our database to find which ones have genuine topical authority for YOUR specific keywords.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">AI Identifies Your Perfect 5-10 Sites</h3>
                <p className="text-gray-600">
                  Out of 13,000+ options, our AI finds the handful that can actually move the needle. 
                  You see exactly why each site was chosen: their current rankings, topical overlap, 
                  and recommended content strategy.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Content Creation</h3>
                <p className="text-gray-600">
                  Expert writers create 1000-1500 word articles designed to rank 
                  and survive AI detection. Every piece is unique and valuable.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Outreach & Placement</h3>
                <p className="text-gray-600">
                  We handle all communication, negotiate terms, and ensure your 
                  content is published with proper attribution and links.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Building Quality Links
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-8">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                Why don't you show contact information?
              </h3>
              <p className="text-gray-600">
                Publisher relationships and verified contacts are part of our service value. 
                We maintain these relationships to ensure quality placements and fair pricing.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                How is this different from other link building services?
              </h3>
              <p className="text-gray-600">
                Complete transparency. You see the exact wholesale cost and pay a flat 
                $79 service fee. No percentage markups, no hidden costs, no surprises.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                What if I want to do outreach myself?
              </h3>
              <p className="text-gray-600">
                Our model is built around providing full service. The $79 fee covers 
                our expertise in topic selection, content creation, and relationship 
                management – the hardest parts of modern link building.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                How does the AI topical analysis work?
              </h3>
              <p className="text-gray-600">
                We analyze each site's current rankings for thousands of keywords. Our AI identifies 
                which sites already rank for your target keywords (direct match) or related topics 
                (sibling match). Sites with no topical overlap are automatically excluded, regardless 
                of their DR.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Why is a DR45 site sometimes better than a DR70 site?
              </h3>
              <p className="text-gray-600">
                Google values topical relevance over raw domain authority. A DR45 site that already 
                ranks for your keywords has proven topical authority. A DR70 site in an unrelated 
                niche provides little to no ranking value, regardless of its metrics.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">
                Do you offer bulk discounts?
              </h3>
              <p className="text-gray-600">
                Yes! We offer volume discounts for campaigns of 10+ links. The wholesale 
                costs remain the same, but our service fee decreases with volume.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready for Transparent Link Building?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            No markups. No games. Just quality links at wholesale + $79.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              Get Started Today
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account/login"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-blue-600 transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}