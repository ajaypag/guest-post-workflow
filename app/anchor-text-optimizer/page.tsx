'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Target, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle,
  ArrowRight,
  Zap,
  RefreshCw,
  Info,
  ExternalLink
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

interface AnchorDistribution {
  type: string;
  percentage: number;
  description: string;
  color: string;
}

const recommendedDistribution: AnchorDistribution[] = [
  {
    type: 'Branded',
    percentage: 40,
    description: 'Your brand name and variations',
    color: 'bg-blue-500'
  },
  {
    type: 'Exact Match',
    percentage: 15,
    description: 'Your target keyword exactly',
    color: 'bg-purple-500'
  },
  {
    type: 'Partial Match',
    percentage: 20,
    description: 'Contains your keyword with other words',
    color: 'bg-green-500'
  },
  {
    type: 'Generic',
    percentage: 15,
    description: 'Click here, learn more, etc.',
    color: 'bg-yellow-500'
  },
  {
    type: 'Naked URL',
    percentage: 10,
    description: 'yoursite.com',
    color: 'bg-gray-500'
  }
];

export default function AnchorTextOptimizer() {
  const [targetKeyword, setTargetKeyword] = useState('');
  const [brandName, setBrandName] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [currentAnchors, setCurrentAnchors] = useState('');
  const [results, setResults] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const analyzeAnchors = () => {
    if (!targetKeyword || !brandName) return;
    
    setAnalyzing(true);
    
    // Simulate analysis
    setTimeout(() => {
      const anchors = currentAnchors.split('\n').filter(a => a.trim());
      const analysis = calculateDistribution(anchors);
      const recommendations = generateRecommendations(analysis, targetKeyword, brandName, websiteUrl);
      
      setResults({
        currentDistribution: analysis,
        recommendations,
        riskLevel: calculateRiskLevel(analysis),
        suggestions: generateSuggestions(analysis, targetKeyword, brandName)
      });
      
      setAnalyzing(false);
    }, 1500);
  };

  const calculateDistribution = (anchors: string[]) => {
    // Simplified distribution calculation
    const distribution = {
      branded: 0,
      exactMatch: 0,
      partialMatch: 0,
      generic: 0,
      nakedUrl: 0
    };
    
    // Mock calculation - in real app would use NLP
    anchors.forEach(anchor => {
      const lower = anchor.toLowerCase();
      if (lower.includes(brandName.toLowerCase())) {
        distribution.branded++;
      } else if (lower === targetKeyword.toLowerCase()) {
        distribution.exactMatch++;
      } else if (lower.includes(targetKeyword.toLowerCase())) {
        distribution.partialMatch++;
      } else if (['click here', 'learn more', 'read more', 'visit', 'here'].includes(lower)) {
        distribution.generic++;
      } else if (lower.includes('.com') || lower.includes('http')) {
        distribution.nakedUrl++;
      } else {
        distribution.partialMatch++;
      }
    });
    
    const total = anchors.length || 1;
    return {
      branded: Math.round((distribution.branded / total) * 100),
      exactMatch: Math.round((distribution.exactMatch / total) * 100),
      partialMatch: Math.round((distribution.partialMatch / total) * 100),
      generic: Math.round((distribution.generic / total) * 100),
      nakedUrl: Math.round((distribution.nakedUrl / total) * 100)
    };
  };

  const calculateRiskLevel = (distribution: any) => {
    if (distribution.exactMatch > 30) return 'high';
    if (distribution.exactMatch > 20) return 'medium';
    return 'low';
  };

  const generateRecommendations = (current: any, keyword: string, brand: string, url: string) => {
    const recommendations = [];
    
    // Generate varied anchor text suggestions
    if (current.branded < 30) {
      recommendations.push({
        type: 'Branded',
        examples: [
          brand,
          `${brand} team`,
          `${brand}'s solution`,
          `Visit ${brand}`,
          brand.toLowerCase()
        ]
      });
    }
    
    if (current.exactMatch > 20) {
      recommendations.push({
        type: 'Partial Match',
        examples: [
          `best ${keyword}`,
          `${keyword} guide`,
          `learn about ${keyword}`,
          `${keyword} tips`,
          `how to use ${keyword}`
        ]
      });
    }
    
    recommendations.push({
      type: 'Generic',
      examples: [
        'learn more',
        'click here',
        'read the guide',
        'see details',
        'find out more'
      ]
    });
    
    if (url) {
      recommendations.push({
        type: 'Naked URL',
        examples: [
          url.replace('https://', '').replace('http://', ''),
          url
        ]
      });
    }
    
    return recommendations;
  };

  const generateSuggestions = (distribution: any, keyword: string, brand: string) => {
    const suggestions = [];
    
    if (distribution.exactMatch > 25) {
      suggestions.push({
        type: 'warning',
        message: 'Your exact match percentage is too high. This could trigger over-optimization penalties.'
      });
    }
    
    if (distribution.branded < 30) {
      suggestions.push({
        type: 'info',
        message: 'Increase branded anchors to build natural link profile and brand authority.'
      });
    }
    
    if (distribution.generic < 10) {
      suggestions.push({
        type: 'info',
        message: 'Add more generic anchors for a natural-looking backlink profile.'
      });
    }
    
    return suggestions;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <LinkioHeader variant="tool" toolName="Anchor Text Optimizer" />

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 to-purple-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Build Anchor Text Profiles That Rank
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Stop guessing at anchor text ratios. Analyze what top-ranking sites use 
              and build natural link profiles that Google rewards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/anchor-text-optimizer/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 font-medium"
              >
                View Pricing
              </Link>
              <button 
                onClick={() => document.getElementById('analyzer')?.scrollIntoView({ behavior: 'smooth' })}
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              >
                Try Free Tool
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Recommended Distribution */}
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Safe Anchor Text Distribution
            </h2>
            <p className="text-lg text-gray-600">
              Based on analysis of thousands of ranking sites, here's the optimal distribution:
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-gray-50 rounded-xl p-6">
              <div className="space-y-4">
                {recommendedDistribution.map((item) => (
                  <div key={item.type} className="flex items-center gap-4">
                    <div className="w-32 font-medium text-gray-700">{item.type}</div>
                    <div className="flex-1">
                      <div className="bg-gray-200 rounded-full h-8 relative overflow-hidden">
                        <div 
                          className={`${item.color} h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3`}
                          style={{ width: `${item.percentage}%` }}
                        >
                          <span className="text-white text-sm font-medium">{item.percentage}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 w-48">{item.description}</div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-800">
                    These percentages are guidelines. Your ideal distribution may vary based on 
                    your niche competitiveness and current backlink profile.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Analyzer Tool */}
      <section id="analyzer" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              Analyze Your Anchor Text Distribution
            </h2>
            
            <div className="space-y-6">
              {/* Input Fields */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="target-keyword" className="block text-sm font-medium text-gray-700 mb-2">
                    Target Keyword
                  </label>
                  <input
                    id="target-keyword"
                    type="text"
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    placeholder="e.g., project management software"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-required="true"
                  />
                </div>
                
                <div>
                  <label htmlFor="brand-name" className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Name
                  </label>
                  <input
                    id="brand-name"
                    type="text"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g., Linkio"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    aria-required="true"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
                  Website URL (optional)
                </label>
                <input
                  id="website-url"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="e.g., https://linkio.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="current-anchors" className="block text-sm font-medium text-gray-700 mb-2">
                  Current Anchor Texts (one per line)
                </label>
                <textarea
                  id="current-anchors"
                  value={currentAnchors}
                  onChange={(e) => setCurrentAnchors(e.target.value)}
                  placeholder="Linkio
link building software
click here
best SEO tools
linkio.com
learn more about link building"
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-describedby="anchor-help"
                />
                <p id="anchor-help" className="text-sm text-gray-500 mt-1">
                  Enter each anchor text on a separate line. Include your current backlink anchor texts for analysis.
                </p>
              </div>
              
              <button
                onClick={analyzeAnchors}
                disabled={!targetKeyword || !brandName || analyzing}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium transition-colors"
                aria-describedby={!targetKeyword || !brandName ? "analyze-requirements" : undefined}
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-5 h-5" />
                    Analyze Distribution
                  </>
                )}
              </button>
              
              {(!targetKeyword || !brandName) && (
                <p id="analyze-requirements" className="text-sm text-gray-500 text-center mt-2">
                  Target keyword and brand name are required to analyze anchor text distribution.
                </p>
              )}
            </div>
            
            {/* Results */}
            {results && (
              <div className="mt-8 space-y-6">
                {/* Risk Level */}
                <div className={`p-4 rounded-lg ${
                  results.riskLevel === 'high' ? 'bg-red-50 border border-red-200' :
                  results.riskLevel === 'medium' ? 'bg-yellow-50 border border-yellow-200' :
                  'bg-green-50 border border-green-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {results.riskLevel === 'high' ? (
                      <AlertCircle className="w-6 h-6 text-red-600" />
                    ) : results.riskLevel === 'medium' ? (
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                    ) : (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                    <div>
                      <h3 className={`font-semibold ${
                        results.riskLevel === 'high' ? 'text-red-900' :
                        results.riskLevel === 'medium' ? 'text-yellow-900' :
                        'text-green-900'
                      }`}>
                        {results.riskLevel === 'high' ? 'High Risk' :
                         results.riskLevel === 'medium' ? 'Medium Risk' :
                         'Low Risk'} Profile
                      </h3>
                      <p className={`text-sm ${
                        results.riskLevel === 'high' ? 'text-red-700' :
                        results.riskLevel === 'medium' ? 'text-yellow-700' :
                        'text-green-700'
                      }`}>
                        {results.riskLevel === 'high' ? 
                          'Your anchor text distribution could trigger over-optimization penalties.' :
                         results.riskLevel === 'medium' ? 
                          'Your distribution needs some adjustments for optimal safety.' :
                          'Your anchor text distribution looks natural and safe.'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Current Distribution */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Your Current Distribution</h3>
                  <div className="space-y-3">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="w-24 text-gray-600">Branded:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className="bg-blue-500 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${results.currentDistribution.branded}%` }}
                        >
                          <span className="text-xs text-white">{results.currentDistribution.branded}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="w-24 text-gray-600">Exact Match:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className={`${results.currentDistribution.exactMatch > 25 ? 'bg-red-500' : 'bg-purple-500'} h-full rounded-full flex items-center justify-end pr-2`}
                          style={{ width: `${results.currentDistribution.exactMatch}%` }}
                        >
                          <span className="text-xs text-white">{results.currentDistribution.exactMatch}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="w-24 text-gray-600">Partial Match:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className="bg-green-500 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${results.currentDistribution.partialMatch}%` }}
                        >
                          <span className="text-xs text-white">{results.currentDistribution.partialMatch}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="w-24 text-gray-600">Generic:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className="bg-yellow-500 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${results.currentDistribution.generic}%` }}
                        >
                          <span className="text-xs text-white">{results.currentDistribution.generic}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="w-24 text-gray-600">Naked URL:</span>
                      <div className="flex-1 bg-gray-200 rounded-full h-6">
                        <div 
                          className="bg-gray-500 h-full rounded-full flex items-center justify-end pr-2"
                          style={{ width: `${results.currentDistribution.nakedUrl}%` }}
                        >
                          <span className="text-xs text-white">{results.currentDistribution.nakedUrl}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Suggestions */}
                {results.suggestions.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Recommendations</h3>
                    <div className="space-y-3">
                      {results.suggestions.map((suggestion: any, index: number) => (
                        <div 
                          key={index}
                          className={`p-4 rounded-lg flex items-start gap-3 ${
                            suggestion.type === 'warning' 
                              ? 'bg-yellow-50 border border-yellow-200' 
                              : 'bg-blue-50 border border-blue-200'
                          }`}
                        >
                          {suggestion.type === 'warning' ? (
                            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          ) : (
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                          )}
                          <p className={`text-sm ${
                            suggestion.type === 'warning' ? 'text-yellow-800' : 'text-blue-800'
                          }`}>
                            {suggestion.message}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Anchor Text Suggestions */}
                {results.recommendations.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-4">Suggested Anchor Texts</h3>
                    <div className="space-y-4">
                      {results.recommendations.map((rec: any, index: number) => (
                        <div key={index} className="border rounded-lg p-4">
                          <h4 className="font-medium text-gray-800 mb-2">{rec.type} Anchors</h4>
                          <div className="flex flex-wrap gap-2">
                            {rec.examples.map((example: string, i: number) => (
                              <span 
                                key={i}
                                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                              >
                                {example}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* CTA */}
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Want Automated Anchor Text Management?
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Track all your backlinks and get real-time anchor text ratio alerts
                  </p>
                  <Link 
                    href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                  >
                    Start Free Trial
                    <ArrowRight className="w-5 h-5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Data-Driven Anchor Text Strategy
            </h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Stop guessing. Use the same anchor text strategies as sites ranking #1-3 for your keywords.
            </p>
          </div>
          
          <div className="grid lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Add Your Page</h3>
              <p className="text-gray-600 text-sm">
                Input your target page and the keywords you want to rank for
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyze Current Profile</h3>
              <p className="text-gray-600 text-sm">
                We categorize your existing backlinks and calculate percentages
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Compare to Winners</h3>
              <p className="text-gray-600 text-sm">
                See what anchor text ratios top-ranking pages use
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">4</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Suggestions</h3>
              <p className="text-gray-600 text-sm">
                Receive specific anchor text recommendations for your next links
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Professional Link Builders Choose Us
            </h2>
            <p className="text-lg text-gray-600">
              The complete anchor text management solution
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Daily Monitoring</h3>
              <p className="text-gray-600 text-sm">
                Automatically track new backlinks from Ahrefs, Moz, and other providers. Get alerts when ratios change.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Custom Targets</h3>
              <p className="text-gray-600 text-sm">
                Different page types need different ratios. Get customized targets for homepage, money pages, and blog posts.
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Complex Histories</h3>
              <p className="text-gray-600 text-sm">
                Handle disavow files, 301 redirects, and domain migrations. We track your complete link history.
              </p>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500 mb-6">Trusted by SEO professionals since 2017</p>
            <Link 
              href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Start Your Free Trial
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 bg-gradient-to-br from-blue-600 to-purple-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Optimize Your Anchor Text Strategy?
          </h2>
          <p className="text-xl opacity-90 mb-8">
            Join thousands of SEOs using data-driven anchor text management
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
              href="/"
              className="inline-flex items-center gap-2 px-8 py-4 border-2 border-white text-white rounded-lg hover:bg-white hover:text-blue-600 font-semibold transition-colors"
            >
              Learn About Linkio
            </Link>
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <MarketingCTA 
        title="Ready to Optimize Your Anchor Text?"
        description="Get professional link building with perfectly balanced anchor text distribution. Join agencies and SEO teams getting results."
      />
      
      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}