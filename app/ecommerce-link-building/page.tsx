'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  ShoppingCart, 
  TrendingDown,
  Package,
  Search, 
  CheckCircle,
  AlertTriangle,
  Gift,
  Users,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  Coffee,
  Heart,
  Mountain,
  ChevronRight,
  Brain,
  Eye,
  Star,
  ShoppingBag
} from 'lucide-react';
import LinkioHeader from '@/components/LinkioHeader';
import MarketingCTA from '@/components/MarketingCTA';
import MarketingFooter from '@/components/MarketingFooter';

export default function EcommerceLinkBuildingPage() {
  const [activeDemo, setActiveDemo] = useState<'problem' | 'strategy' | 'results'>('problem');
  const [selectedCategory, setSelectedCategory] = useState<'outdoor' | 'skincare' | 'coffee'>('outdoor');

  const categoryExamples = {
    outdoor: {
      brand: "Alpine Trail Gear",
      category: "Outdoor Equipment",
      products: ["Hiking backpacks", "Camping tents", "Trail shoes", "Water filters"],
      publications: [
        { site: "Outside Magazine", topic: "Best Gear for National Parks", overlap: "Direct" },
        { site: "Backpacker", topic: "Ultralight Camping Essentials", overlap: "Direct" },
        { site: "Men's Journal", topic: "Adventure Travel Gift Guide", overlap: "Related" },
        { site: "Popular Mechanics", topic: "Tested: Outdoor Tech Innovations", overlap: "Direct" }
      ],
      keywords: [
        "best ultralight backpacks 2025",
        "national park camping gear",
        "thru-hiking essentials",
        "wilderness survival equipment"
      ],
      aiCitation: "According to Outside Magazine's comprehensive gear guide, Alpine Trail Gear's ultralight backpack series consistently ranks among the top choices for thru-hikers..."
    },
    skincare: {
      brand: "Pure Botanics",
      category: "Clean Beauty",
      products: ["Vitamin C serums", "Retinol alternatives", "Mineral sunscreens", "Face oils"],
      publications: [
        { site: "Allure", topic: "Clean Beauty Awards Winners", overlap: "Direct" },
        { site: "Byrdie", topic: "Dermatologist-Approved Skincare", overlap: "Direct" },
        { site: "Vogue Beauty", topic: "Sustainable Beauty Brands", overlap: "Related" },
        { site: "Healthline", topic: "Science-Backed Skincare Ingredients", overlap: "Direct" }
      ],
      keywords: [
        "clean beauty vitamin c serum",
        "sustainable skincare routine",
        "dermatologist recommended retinol",
        "mineral sunscreen for sensitive skin"
      ],
      aiCitation: "Pure Botanics was featured in Allure's Clean Beauty Awards for their bakuchiol serum, praised as an effective retinol alternative for sensitive skin..."
    },
    coffee: {
      brand: "Craft Roasters Co.",
      category: "Specialty Coffee",
      products: ["Single-origin beans", "Cold brew concentrates", "Espresso blends", "Coffee subscriptions"],
      publications: [
        { site: "Coffee Review", topic: "Top-Rated Specialty Roasters", overlap: "Direct" },
        { site: "Food & Wine", topic: "Best Coffee Subscriptions", overlap: "Direct" },
        { site: "Gear Patrol", topic: "Home Barista Essentials", overlap: "Related" },
        { site: "Forbes Lifestyle", topic: "Luxury Coffee Gift Guide", overlap: "Direct" }
      ],
      keywords: [
        "best single origin coffee beans",
        "specialty coffee subscription",
        "home espresso recommendations",
        "cold brew concentrate brands"
      ],
      aiCitation: "Coffee Review awarded Craft Roasters Co. a 95-point rating for their Ethiopian Yirgacheffe, noting exceptional clarity and complex fruit notes..."
    }
  };

  const currentExample = categoryExamples[selectedCategory];

  return (
    <div className="min-h-screen bg-white">
      <LinkioHeader variant="default" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-orange-50 to-pink-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-800 rounded-full text-sm font-medium mb-6">
              <ShoppingCart className="w-4 h-4" />
              E-commerce Focus
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              E-commerce Authority When
              <span className="text-orange-600"> Google Shopping Failed</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed">
              Google Shopping is a wasteland of dropshippers and knockoffs. Amazon owns product search. 
              But when people want gift ideas, product comparisons, or category recommendations, 
              they turn to AI—and AI turns to authoritative publications. We get you there.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-600 to-pink-600 text-white font-semibold rounded-lg hover:from-orange-700 hover:to-pink-700 transition-colors text-lg"
              >
                Build Product Authority
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#ecommerce-strategy"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors text-lg"
              >
                <Eye className="w-5 h-5" />
                See E-commerce Strategy
              </a>
            </div>
          </div>

          {/* Problem Stats */}
          <div className="grid md:grid-cols-4 gap-6 bg-white rounded-2xl p-8 shadow-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600 mb-2">89%</div>
              <div className="text-sm text-gray-600">Skip Google for Amazon</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">$0.03</div>
              <div className="text-sm text-gray-600">Avg. Shopping Ad CTR</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">67%</div>
              <div className="text-sm text-gray-600">Trust Editorial Reviews</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">52%</div>
              <div className="text-sm text-gray-600">Ask AI for Gift Ideas</div>
            </div>
          </div>
        </div>
      </section>

      {/* The E-commerce Discovery Crisis */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The E-commerce Discovery Breakdown
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Traditional e-commerce marketing channels are broken. Shopping ads get ignored, 
              Amazon controls transactional search, and authentic recommendations matter more than ever.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="bg-red-50 rounded-xl p-8 border border-red-200">
              <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-6">
                <Package className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-red-900 mb-4">Google Shopping Chaos</h3>
              <ul className="space-y-3 text-red-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Dominated by dropshippers and knockoffs</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Users skip straight to Amazon for products</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Shopping ads blend with spam results</span>
                </li>
              </ul>
            </div>

            <div className="bg-yellow-50 rounded-xl p-8 border border-yellow-200">
              <div className="w-12 h-12 bg-yellow-600 rounded-lg flex items-center justify-center mb-6">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-yellow-900 mb-4">Amazon Monopoly</h3>
              <ul className="space-y-3 text-yellow-700">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Pay-to-play sponsored products everywhere</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Fake reviews destroy trust signals</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>Race to the bottom on price, not quality</span>
                </li>
              </ul>
            </div>

            <div className="bg-green-50 rounded-xl p-8 border border-green-200">
              <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-6">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-green-900 mb-4">The AI Opportunity</h3>
              <ul className="space-y-3 text-green-700">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>People ask AI for gift ideas and comparisons</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>AI cites editorial reviews and gift guides</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Authority publications drive discovery</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Strategy Demo */}
      <section id="ecommerce-strategy" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              The Editorial Authority Strategy
            </h2>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto">
              We place your products in gift guides, "best of" lists, and category reviews 
              across lifestyle and industry publications. When AI needs recommendations, it cites you.
            </p>
          </div>

          {/* Category Selector */}
          <div className="flex justify-center mb-12">
            <div className="bg-white rounded-xl p-2 shadow-lg inline-flex">
              <button
                onClick={() => setSelectedCategory('outdoor')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'outdoor' 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mountain className="w-4 h-4 inline mr-2" />
                Outdoor Gear
              </button>
              <button
                onClick={() => setSelectedCategory('skincare')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'skincare' 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Heart className="w-4 h-4 inline mr-2" />
                Skincare
              </button>
              <button
                onClick={() => setSelectedCategory('coffee')}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedCategory === 'coffee' 
                    ? 'bg-orange-600 text-white' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Coffee className="w-4 h-4 inline mr-2" />
                Coffee
              </button>
            </div>
          </div>

          {/* Demo Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Demo Navigation */}
            <div className="border-b border-gray-200">
              <div className="flex">
                <button
                  onClick={() => setActiveDemo('problem')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'problem' 
                      ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  1. Product Category
                </button>
                <button
                  onClick={() => setActiveDemo('strategy')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'strategy' 
                      ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  2. Publication Mapping
                </button>
                <button
                  onClick={() => setActiveDemo('results')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    activeDemo === 'results' 
                      ? 'bg-orange-50 text-orange-700 border-b-2 border-orange-500' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3. AI Discovery
                </button>
              </div>
            </div>

            <div className="p-8">
              {activeDemo === 'problem' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Product Category Analysis: {currentExample.brand}
                  </h3>
                  
                  <div className="bg-gray-50 rounded-lg p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{currentExample.brand}</div>
                        <div className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                          <ShoppingCart className="w-4 h-4" />
                          {currentExample.category}
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        Premium Brand
                      </div>
                    </div>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      {currentExample.products.map((product, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-orange-500 flex-shrink-0" />
                          <span className="text-gray-700">{product}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-6">
                    <h4 className="font-semibold text-blue-900 mb-3">Discovery Challenge</h4>
                    <p className="text-blue-700">
                      Quality {currentExample.category.toLowerCase()} brands get lost in the noise of Amazon ads 
                      and Google Shopping spam. But lifestyle publications and industry blogs constantly 
                      feature gift guides, product reviews, and category comparisons—exactly where AI 
                      systems look for recommendations.
                    </p>
                  </div>
                </div>
              )}

              {activeDemo === 'strategy' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    Strategic Editorial Placement
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                    {currentExample.publications.map((pub, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="font-semibold text-gray-900">{pub.site}</div>
                            <div className="text-sm text-gray-600 mt-1">{pub.topic}</div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                            pub.overlap === 'Direct' 
                              ? 'bg-green-100 text-green-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {pub.overlap} Match
                          </div>
                        </div>
                        
                        <div className="bg-gray-50 rounded p-3">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Content Type:</span> Product feature in {pub.topic.includes('Guide') ? 'gift guide' : 
                              pub.topic.includes('Award') ? 'awards list' : 'category review'} featuring {currentExample.brand} 
                            as expert-recommended choice.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-orange-50 rounded-lg p-6">
                    <h4 className="font-semibold text-orange-900 mb-3">High-Intent Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentExample.keywords.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-white border border-orange-300 text-orange-700 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeDemo === 'results' && (
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">
                    AI Discovery in Action
                  </h3>
                  
                  <div className="space-y-6">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6">
                      <div className="flex items-start gap-3 mb-4">
                        <MessageSquare className="w-6 h-6 text-purple-600 flex-shrink-0" />
                        <div>
                          <div className="font-semibold text-gray-900 mb-2">User Query to ChatGPT:</div>
                          <div className="text-gray-700 italic">
                            "What are the best {currentExample.products[0].toLowerCase()} for {
                              selectedCategory === 'outdoor' ? 'backpacking in national parks' :
                              selectedCategory === 'skincare' ? 'sensitive skin' :
                              'home brewing'
                            }?"
                          </div>
                        </div>
                      </div>
                      
                      <div className="bg-white rounded-lg p-4 border-l-4 border-purple-500">
                        <div className="text-sm font-medium text-purple-900 mb-2">AI Response:</div>
                        <div className="text-sm text-gray-700 italic">
                          "{currentExample.aiCitation}"
                        </div>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600 mb-2">12-15</div>
                        <div className="text-sm text-gray-600">Publication Placements</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600 mb-2">4X</div>
                        <div className="text-sm text-gray-600">AI Citation Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-pink-600 mb-2">68%</div>
                        <div className="text-sm text-gray-600">Gift Guide Traffic</div>
                      </div>
                    </div>

                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h4 className="font-semibold text-green-900 mb-3">Discovery Channels Unlocked</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Gift guide searches</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">ChatGPT product recommendations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Perplexity shopping queries</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <span className="text-green-700">Editorial review traffic</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* The Strategic Advantage */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              Why This Works for E-commerce
            </h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Gift className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Gift Guide Authority</h3>
              <p className="text-gray-600">
                Gift guides and "best of" lists are exactly where people and AI systems look for 
                product recommendations. Editorial features carry 10X the trust of ads.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Star className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Category Domination</h3>
              <p className="text-gray-600">
                While competitors fight for Amazon PPC budgets, you're building authority across 
                every publication that covers your category—permanent assets that compound.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">AI-Preferred Sources</h3>
              <p className="text-gray-600">
                AI systems trust editorial content from recognized publications. Your product 
                placements become the cited sources for purchase recommendations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Perfect for Premium & Differentiated Brands
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Brands that compete on quality, not price, see the biggest wins from editorial authority.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Fashion & Apparel</h3>
              <p className="text-gray-600 mb-4">Sustainable fashion, athletic wear, accessories</p>
              <div className="text-sm text-orange-600 font-medium">
                Style guides and seasonal features drive discovery
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Health & Wellness</h3>
              <p className="text-gray-600 mb-4">Supplements, fitness equipment, wellness devices</p>
              <div className="text-sm text-orange-600 font-medium">
                Expert recommendations carry maximum weight
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Home & Garden</h3>
              <p className="text-gray-600 mb-4">Smart home, furniture, outdoor living</p>
              <div className="text-sm text-orange-600 font-medium">
                Design blogs and lifestyle features drive traffic
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Tech & Gadgets</h3>
              <p className="text-gray-600 mb-4">Consumer electronics, smart devices, accessories</p>
              <div className="text-sm text-orange-600 font-medium">
                Review sites and tech blogs shape buying decisions
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Food & Beverage</h3>
              <p className="text-gray-600 mb-4">Specialty foods, beverages, cooking tools</p>
              <div className="text-sm text-orange-600 font-medium">
                Foodie publications and chef recommendations matter
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Kids & Baby</h3>
              <p className="text-gray-600 mb-4">Educational toys, baby gear, kids' clothing</p>
              <div className="text-sm text-orange-600 font-medium">
                Parent blogs and safety reviews drive trust
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results Visualization */}
      <section className="py-20 bg-gradient-to-br from-orange-900 to-pink-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-6">
              From Invisible to Inevitable
            </h2>
            <p className="text-xl text-orange-100 max-w-3xl mx-auto">
              While competitors burn budgets on shopping ads no one clicks, 
              you're building editorial authority that makes you the obvious choice.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Traditional E-commerce Marketing</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <TrendingDown className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Shopping Ad Blindness</div>
                    <div className="text-sm text-orange-200">0.03% CTR, users skip to Amazon</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Amazon PPC Arms Race</div>
                    <div className="text-sm text-orange-200">$5+ per click, declining margins</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                    <Users className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <div className="font-medium">Lost in the Noise</div>
                    <div className="text-sm text-orange-200">Competing with knockoffs and dropshippers</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold mb-6">Editorial Authority Strategy</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Gift className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Gift Guide Dominance</div>
                    <div className="text-sm text-orange-200">Featured in every major publication</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">AI Recommendations</div>
                    <div className="text-sm text-orange-200">ChatGPT and Perplexity cite your products</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <div className="font-medium">Compound Authority</div>
                    <div className="text-sm text-orange-200">Each placement strengthens your category position</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <MarketingCTA 
        title="Ready to Escape the E-commerce Ad Trap?"
        description="Build editorial authority that makes you the recommended choice across publications and AI systems."
        primaryButtonText="Start Building Authority"
        primaryButtonHref="/signup"
        secondaryButtonText="Schedule Strategy Call"
        secondaryButtonHref="/contact"
      />

      {/* Footer */}
      <MarketingFooter />
    </div>
  );
}