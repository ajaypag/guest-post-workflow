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
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export const metadata: Metadata = {
  title: 'Guest Posting Sites List - 13,000+ Sites with Pricing | Linkio',
  description: 'Browse 13,000+ guest posting sites with transparent pricing. See wholesale costs + $79 service fee. Filter by category, DR, traffic, and more.',
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
        niche: websites.niche,
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

    // Get niches with at least 10 websites (minimum threshold for page creation)
    const nichesResult = await db.execute(sql`
      SELECT 
        UNNEST(niche) as niche_name,
        COUNT(*) as website_count
      FROM websites
      WHERE niche IS NOT NULL AND array_length(niche, 1) > 0
      GROUP BY niche_name
      HAVING COUNT(*) >= 10
      ORDER BY website_count DESC
      LIMIT 20
    `);
    
    const topNiches = nichesResult.rows.map((row: any) => ({
      name: row.niche_name,
      count: parseInt(row.website_count)
    }));

    return {
      websites: websiteResults.map(site => ({
        id: site.id,
        domain: site.domain,
        domainRating: site.domainRating,
        totalTraffic: site.totalTraffic,
        guestPostCost: site.guestPostCost ? parseFloat(site.guestPostCost.toString()) : null,
        categories: site.categories || [],
        niche: site.niche,
        overallQuality: site.overallQuality,
        hasGuestPost: site.hasGuestPost,
      })),
      totalCount: countResult[0]?.count || 0,
      niches: topNiches,
    };
  } catch (error) {
    console.warn('Could not fetch websites data, database not available during build:', error);
    return {
      websites: [],
      totalCount: 13000, // Fallback number for build time
      niches: [],
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
  const { websites, totalCount, niches } = await getWebsites();

  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Main Content */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                {totalCount.toLocaleString()} Guest Posting Sites
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Fully managed service • Transparent wholesale pricing • Expert curation
              </p>
              
              {/* Key Benefits */}
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Wholesale site costs + $79 full-service fee (research, writing, outreach & placement)</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Expert-curated sites with proven keyword overlap</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700">Complete content creation and placement - we handle everything</span>
                </div>
              </div>

              {/* Browse by Niche CTA */}
              <div className="flex gap-3">
                <a href="#niches" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Browse by Niche
                </a>
                <a href="#all-sites" className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors">
                  View All Sites
                </a>
              </div>
            </div>

            {/* Right: URL Input Tool */}
            <div className="bg-gray-50 border rounded-xl p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Get Expert Site Recommendations</h3>
              <p className="text-gray-600 mb-4">
                Enter your target URL - our experts will curate the perfect sites for you
              </p>
              
              <div className="space-y-3">
                <input
                  type="url"
                  placeholder="https://your-website.com/target-page"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
                <button className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors">
                  Get Expert Recommendations
                </button>
              </div>
              
              <p className="text-xs text-gray-500 text-center mt-3">
                Our experts find sites with proven keyword relevance
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Niches Section - Primary Hub */}
      <section id="niches" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Browse by Niche
            </h2>
            <p className="text-lg text-gray-600">
              Find highly-specific guest posting opportunities in your exact niche
            </p>
          </div>

          {/* Niche Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {niches.map(niche => (
              <Link
                key={niche.name}
                href={`/guest-posting-sites/${niche.name.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}-blogs`}
                className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div className="text-center">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{niche.count}</div>
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {niche.name}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    Guest posting sites
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Additional Tools */}
          <div className="bg-white rounded-xl border p-8 text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Need to Find More Sites?</h3>
            <p className="text-gray-600 mb-6">
              Use our search query generator to discover guest posting opportunities beyond our database
            </p>
            <Link
              href="/guest-posting-sites/search-query-generator"
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
            >
              <Search className="w-5 h-5" />
              Google Query Generator
            </Link>
          </div>
        </div>
      </section>

      {/* All Sites Section */}
      <section id="all-sites" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              All Guest Posting Sites
            </h2>
            <p className="text-lg text-gray-600">
              Browse our complete directory with transparent wholesale pricing
            </p>
          </div>

          {/* Websites Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
              <p className="text-sm text-blue-900">
                💡 <span className="font-medium">$79 gets you everything:</span> Content research & writing, publisher outreach, negotiation & live placement. 
                Just pay wholesale site cost + our flat service fee.
              </p>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">DR</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Traffic</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wholesale Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Service Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Niches</th>
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
                      {site.niche && Array.isArray(site.niche) && site.niche.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {site.niche
                            .slice(0, 2)
                            .map((nicheName: string, i: number) => (
                              <Link
                                key={i}
                                href={`/guest-posting-sites/${nicheName.toLowerCase().replace(/[&\s]+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '')}-blogs`}
                                className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                              >
                                {nicheName}
                              </Link>
                            ))}
                          {site.niche.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{site.niche.length - 2}
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

      {/* Educational Section - Similar to Category Pages */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 md:p-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Fully Managed Link Building Without the Markup
              </h2>
              <p className="text-lg text-gray-600">
                Expert curation meets transparent pricing - no agency games
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Left: The Problem */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Traditional Agencies (Broken)</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Chase Vanity DR Metrics</div>
                      <div className="text-sm text-gray-600">Focus on high DR numbers instead of relevance</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Crazy Agency Markups</div>
                      <div className="text-sm text-gray-600">Pay $300+ for what costs $60 wholesale</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Thin, Generic Content</div>
                      <div className="text-sm text-gray-600">500-word fluff pieces with no real value</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-sm font-bold">✕</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Zero Quality Control</div>
                      <div className="text-sm text-gray-600">Your tech startup linked from random food blogs</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Our Solution */}
              <div>
                <h3 className="text-xl font-semibold mb-6">Our Approach (Fully Managed)</h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Expert Site Curation</div>
                      <div className="text-sm text-gray-600">We manually verify sites that rank for YOUR keywords</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Transparent Wholesale Pricing</div>
                      <div className="text-sm text-gray-600">Real costs + $79 flat fee (no markup games)</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">Complete Content Creation</div>
                      <div className="text-sm text-gray-600">2000-3000 word expert articles - we handle everything</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-gray-900">16-Step AI-Assisted Process</div>
                      <div className="text-sm text-gray-600">AI handles analysis, humans handle final approval and relationships</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mt-12 pt-12 border-t">
              <h3 className="text-xl font-semibold text-center mb-8">How Our Concierge Service Works</h3>
              <div className="grid md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    1
                  </div>
                  <h4 className="font-semibold mb-2">Tell Us Your Goals</h4>
                  <p className="text-sm text-gray-600">
                    Share your target pages and objectives
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    2
                  </div>
                  <h4 className="font-semibold mb-2">Expert Site Curation</h4>
                  <p className="text-sm text-gray-600">
                    We research and curate perfect sites for you
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    3
                  </div>
                  <h4 className="font-semibold mb-2">Content Creation</h4>
                  <p className="text-sm text-gray-600">
                    Professional writers create valuable content
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold mx-auto mb-3">
                    4
                  </div>
                  <h4 className="font-semibold mb-2">Full Service Delivery</h4>
                  <p className="text-sm text-gray-600">
                    Outreach, negotiation, and live placement
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Expert Curation Example */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            See Our AI-Assisted Curation in Action
          </h2>
          
          <div className="bg-white rounded-xl p-8 shadow-sm border">
            <p className="text-gray-600 mb-6">
              <strong className="text-gray-900">Example:</strong> Your target page is about "project management software". 
              Here's how our AI analyzes potential sites (with expert final approval):
            </p>
            
            <div className="space-y-4">
              {/* High Quality Site */}
              <div className="border rounded-lg p-5 bg-green-50 border-green-200">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">businesstools.com</span>
                    <span className="text-sm text-gray-600 ml-2">DR 45 • 125K monthly traffic</span>
                  </div>
                  <span className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded">HIGH QUALITY</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Proven Relevance:</strong> Actively ranks for "project management software"
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Editorial Standards:</strong> 47 high-quality articles about PM tools
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Perfect Fit:</strong> Accepts comprehensive software reviews
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Medium Quality Site */}
              <div className="border rounded-lg p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="font-semibold text-gray-900">generalbusiness.com</span>
                    <span className="text-sm text-gray-600 ml-2">DR 70 • 500K monthly traffic</span>
                  </div>
                  <span className="px-3 py-1 bg-yellow-600 text-white text-xs font-medium rounded">GOOD QUALITY</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-600 text-xs">~</span>
                    </div>
                    <div>
                      <strong className="text-gray-900">Topic Adjacent:</strong> Covers broader business software category
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-yellow-600 text-xs">~</span>
                    </div>
                    <div>
                      <strong className="text-gray-900">Broader Audience:</strong> Less focused but still business-relevant
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-gray-900">Strategic Approach:</strong> Requires more targeted content angle
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>AI Insight:</strong> While generalbusiness.com has higher DR, businesstools.com will likely 
                drive more relevant traffic due to direct keyword overlap and topical focus.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready for Fully Managed Link Building?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of businesses getting expert service without agency markups
          </p>
          
          {/* Trust Indicators */}
          <div className="grid grid-cols-3 gap-8 mb-10 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">13,000+</div>
              <div className="text-sm text-gray-500">Verified Sites</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">$79</div>
              <div className="text-sm text-gray-500">Flat Service Fee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">16-Step</div>
              <div className="text-sm text-gray-500">AI-Assisted Process</div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup/marketing"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors text-lg"
            >
              Start Your First Campaign
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/account/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
            >
              Sign In to Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <MarketingCTA />
      
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}