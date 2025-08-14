import { Metadata } from 'next';
import Link from 'next/link';
import LinkioHeader from '@/components/LinkioHeader';
import { ArrowRight, TrendingUp, Target, Award, ChartBar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Linkio Case Studies | Real Guest Post Results & Rankings',
  description: 'See how our strategic guest posting approach drives real rankings. Deep-dive case studies showing our process, content strategy, and measurable SEO results.',
  keywords: ['linkio case studies', 'guest post results', 'SEO case studies', 'link building results', 'ranking improvements'],
};

const caseStudies = [
  {
    id: 'squarefoothomes',
    client: 'Square Foot Homes',
    tagline: 'Florida Real Estate Company',
    headline: '243% Traffic Growth with Local Guides on National Sites',
    results: {
      posts: 10,
      keywords: '1,500+',
      topRanking: '#1',
      traffic: '686 monthly',
    },
    industries: ['Real Estate', 'Local Business', 'Florida'],
    preview: 'Discover how we solved the local link building challenge by creating strategic local guides on national outlets, transforming stagnant traffic into explosive growth.',
    color: 'from-green-600 to-teal-600',
  },
  {
    id: 'outreachlabs',
    client: 'OutreachLabs',
    tagline: 'B2B Link Building Agency',
    headline: '4 Strategic Guest Posts Drive 97 New Keyword Rankings',
    results: {
      posts: 4,
      keywords: 97,
      topRanking: '#2',
      traffic: '251+ monthly',
    },
    industries: ['B2B Services', 'SEO', 'Link Building'],
    preview: 'See how we identified niche-specific opportunities across B2B marketing, SEO reseller, and white hat link building topics to achieve immediate rankings.',
    color: 'from-blue-600 to-indigo-600',
  },
  // Placeholder for future case studies
  {
    id: 'coming-soon-1',
    client: 'Coming Soon',
    tagline: 'SaaS Platform',
    headline: 'AI Citation Engineering Case Study',
    results: {
      posts: 0,
      keywords: 0,
      topRanking: '-',
      traffic: '-',
    },
    industries: ['SaaS', 'Technology'],
    preview: 'Our next case study will showcase how we help SaaS companies get cited in AI responses through strategic content placement.',
    color: 'from-gray-400 to-gray-500',
    comingSoon: true,
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <LinkioHeader />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 py-20">
        <div className="absolute inset-0 bg-grid-white/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Real Results, Real Rankings
            </h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Deep-dive case studies showing exactly how our strategic guest posting approach 
              drives measurable SEO results for our clients.
            </p>
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {caseStudies.map((study) => (
              <div
                key={study.id}
                className={`relative group ${
                  study.comingSoon ? 'opacity-60' : ''
                }`}
              >
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300">
                  {/* Gradient Header */}
                  <div className={`h-2 bg-gradient-to-r ${study.color}`}></div>
                  
                  {/* Content */}
                  <div className="p-8">
                    {/* Client Info */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">
                          {study.client}
                        </h3>
                        {study.comingSoon && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
                            Coming Soon
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600">{study.tagline}</p>
                    </div>

                    {/* Headline */}
                    <h4 className="text-xl font-semibold text-gray-900 mb-4">
                      {study.headline}
                    </h4>

                    {/* Results Grid */}
                    {!study.comingSoon && (
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Target className="h-4 w-4" />
                            <span className="text-sm">Guest Posts</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {study.results.posts}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <ChartBar className="h-4 w-4" />
                            <span className="text-sm">Keywords Ranking</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {study.results.keywords}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <Award className="h-4 w-4" />
                            <span className="text-sm">Best Position</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {study.results.topRanking}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-600 mb-1">
                            <TrendingUp className="h-4 w-4" />
                            <span className="text-sm">Monthly Traffic</span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {study.results.traffic}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Industries */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {study.industries.map((industry) => (
                        <span
                          key={industry}
                          className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                        >
                          {industry}
                        </span>
                      ))}
                    </div>

                    {/* Preview Text */}
                    <p className="text-gray-600 mb-6">
                      {study.preview}
                    </p>

                    {/* CTA */}
                    {!study.comingSoon && (
                      <Link
                        href={`/case-studies/${study.id}`}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold group"
                      >
                        View Full Case Study
                        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to Create Your Success Story?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join the growing list of brands achieving real SEO results with strategic guest posting.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
          >
            Get Started Today
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}