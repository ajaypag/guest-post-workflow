import Link from 'next/link';
import { ArrowRight, Users, Globe, BarChart3, Zap, Building2, ShoppingCart } from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry-Specific Link Building Services | SaaS, Ecommerce, B2B',
  description: 'Specialized link building for SaaS, ecommerce, B2B services, and local businesses. AI-powered citation strategies tailored to your industry with proven results.',
  keywords: ['industry link building', 'SaaS link building', 'ecommerce SEO', 'B2B link building', 'industry-specific SEO'],
  openGraph: {
    title: 'Industry-Specific Link Building Services | Linkio',
    description: 'Specialized link building for SaaS, ecommerce, B2B services, and local businesses. AI-powered citation strategies tailored to your industry.',
    type: 'website',
  },
};

export default function IndustriesPage() {
  const industries = [
    {
      id: 'saas',
      name: 'SaaS & Software',
      icon: Zap,
      color: 'blue',
      description: 'Strategic citation building for software companies across 50+ industry niches',
      features: ['AI Citation Engineering', 'Comprehensive Niche Coverage', 'Technical Authority Building'],
      href: '/saas-link-building',
      available: true
    },
    {
      id: 'b2b-services',
      name: 'B2B Services',
      icon: Users,
      color: 'purple',
      description: 'Strategic modifier coverage for complete market domination',
      features: ['Modifier Strategy', '50-100 Term Coverage', 'AI Citation Engineering'],
      href: '/b2b-services-link-building',
      available: true
    },
    {
      id: 'local',
      name: 'Local Businesses',
      icon: Globe,
      color: 'green',
      description: 'Geo-targeted authority building through local and industry publications',
      features: ['Local Publication Network', 'Geographic Authority Mapping', 'Community-Based Citations'],
      href: '/local-business-link-building',
      available: true
    },
    {
      id: 'ecommerce',
      name: 'E-commerce',
      icon: ShoppingCart,
      color: 'orange',
      description: 'Product category domination through lifestyle and industry publications',
      features: ['Product Category Authority', 'Lifestyle Publication Placement', 'Seasonal Campaign Strategy'],
      href: '/ecommerce-link-building',
      available: true
    },
    {
      id: 'consulting',
      name: 'Professional Services',
      icon: Building2,
      color: 'indigo',
      description: 'Thought leadership positioning across trade and industry publications',
      features: ['Thought Leadership Content', 'Professional Authority Building', 'Industry Expertise Positioning'],
      href: '/consulting-link-building',
      available: false
    },
    {
      id: 'finance',
      name: 'Financial Services',
      icon: BarChart3,
      color: 'emerald',
      description: 'Compliance-friendly authority building in financial and business publications',
      features: ['Compliance-Approved Content', 'Financial Authority Networks', 'Regulatory-Safe Strategies'],
      href: '/financial-services-link-building',
      available: false
    }
  ];

  const getColorClasses = (color: string, available: boolean) => {
    if (!available) {
      return {
        bg: 'bg-gray-100',
        border: 'border-gray-200',
        icon: 'bg-gray-400',
        text: 'text-gray-700',
        features: 'text-gray-500'
      };
    }

    const colors = {
      blue: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        icon: 'bg-blue-600',
        text: 'text-blue-900',
        features: 'text-blue-700'
      },
      purple: {
        bg: 'bg-purple-50',
        border: 'border-purple-200',
        icon: 'bg-purple-600',
        text: 'text-purple-900',
        features: 'text-purple-700'
      },
      green: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        icon: 'bg-green-600',
        text: 'text-green-900',
        features: 'text-green-700'
      },
      orange: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        icon: 'bg-orange-600',
        text: 'text-orange-900',
        features: 'text-orange-700'
      },
      indigo: {
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        icon: 'bg-indigo-600',
        text: 'text-indigo-900',
        features: 'text-indigo-700'
      },
      emerald: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-200',
        icon: 'bg-emerald-600',
        text: 'text-emerald-900',
        features: 'text-emerald-700'
      }
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-gray-50 to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Industry-Specific
            <span className="text-blue-600"> Link Building</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto">
            Every industry has unique challenges, audiences, and opportunities. Our AI-powered approach 
            adapts to your specific market dynamics for maximum citation potential.
          </p>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8">
            {industries.map((industry) => {
              const colors = getColorClasses(industry.color, industry.available);
              const Icon = industry.icon;
              
              return (
                <div
                  key={industry.id}
                  className={`${colors.bg} ${colors.border} border rounded-2xl p-8 ${industry.available ? 'hover:shadow-lg transition-shadow' : ''}`}
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className={`w-14 h-14 ${colors.icon} rounded-xl flex items-center justify-center`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    {industry.available ? (
                      <div className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                        Available Now
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-gray-100 text-gray-500 text-sm font-medium rounded-full">
                        Coming Soon
                      </div>
                    )}
                  </div>
                  
                  <h3 className={`text-2xl font-bold ${colors.text} mb-4`}>
                    {industry.name}
                  </h3>
                  
                  <p className="text-gray-600 mb-6">
                    {industry.description}
                  </p>
                  
                  <div className="space-y-2 mb-8">
                    {industry.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className={`w-2 h-2 ${industry.available ? colors.icon : 'bg-gray-400'} rounded-full`}></div>
                        <span className={`text-sm ${colors.features}`}>{feature}</span>
                      </div>
                    ))}
                  </div>
                  
                  {industry.available ? (
                    <Link
                      href={industry.href}
                      className={`inline-flex items-center gap-2 px-6 py-3 ${colors.icon} text-white font-medium rounded-lg hover:opacity-90 transition-opacity`}
                    >
                      Learn More
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 font-medium rounded-lg cursor-not-allowed"
                    >
                      Coming Soon
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Industry-Specific Matters */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why Industry-Specific Link Building Works
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Generic guest posting misses the mark. AI systems favor sources with proven expertise 
              in relevant industry contexts.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Contextual Authority</h3>
              <p className="text-gray-600">
                AI systems prioritize sources that demonstrate expertise within specific industry contexts, 
                not just general high-authority domains.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Audience Alignment</h3>
              <p className="text-gray-600">
                Industry-specific publications reach your actual prospects, creating genuine referral traffic 
                beyond just SEO value.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Competitive Intelligence</h3>
              <p className="text-gray-600">
                Our industry analysis reveals niche opportunities your competitors haven't discovered, 
                giving you first-mover advantages.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <MarketingCTA 
        title="Ready to Dominate Your Industry?"
        description="Start with our proven SaaS strategy or contact us to develop a custom approach for your industry."
        primaryButtonText="Start with SaaS Strategy"
        primaryButtonHref="/saas-link-building"
        secondaryButtonText="Custom Industry Analysis"
        secondaryButtonHref="/contact"
      />

      <MarketingFooter />
    </div>
  );
}