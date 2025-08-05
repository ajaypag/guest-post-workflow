'use client';

import { useState } from 'react';
import BlogPostTemplate from '@/components/BlogPostTemplate';
import { ChevronRight, Filter, Trash2, CheckCircle, XCircle, AlertCircle, Users, Globe, FileSpreadsheet, Link2 } from 'lucide-react';

export default function HowToSortAndFilterLinkProspectsPage() {
  const [activeSection, setActiveSection] = useState('');

  const tableOfContents = [
    { id: "pre-stage", title: "Pre-stage of getting your spreadsheet ready", icon: FileSpreadsheet },
    { id: "referring-pages", title: "What referring pages to remove?", icon: Trash2 },
    { id: "pseudo-prospects", title: "Which URLs are pseudo link prospects?", icon: AlertCircle },
    { id: "low-authority", title: "Should you target low authority domains?", icon: Globe },
    { id: "nofollow-links", title: "Can nofollow backlinks be valuable?", icon: Link2 },
    { id: "abandoned-blogs", title: "Dealing with abandoned blogs", icon: Users },
    { id: "guest-posts", title: "What about guest posts?", icon: Users },
  ];

  return (
    <BlogPostTemplate
      title="How to Sort and Filter Link Prospects"
      metaDescription="Complete guide to sorting and filtering link prospects for effective outreach. Learn to identify quality opportunities and avoid time-wasters."
      publishDate="November 15, 2022"
      author="Ajay Paghdal"
      readTime="18 min read"
    >
      {/* Hero Section with Featured Image   */}
      <div className="relative rounded-2xl overflow-hidden mb-12 shadow-xl">
        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/11/sorting-link-prospects-fi-1024x536.png"
          alt="Sorting Link Prospects Guide"
          className="w-full h-[400px] object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-8 h-8" />
            <span className="text-sm font-medium bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
              Link Building Strategy
            </span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Master the Art of Link Prospect Filtering</h1>
          <p className="text-lg text-white/90">Turn your messy spreadsheet into a goldmine of opportunities</p>
        </div>
      </div>

      {/* Key Stats Banner   */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="text-3xl font-bold text-blue-600 mb-2">31%</div>
          <div className="text-sm text-blue-700">Of prospects are actually worth pursuing</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="text-3xl font-bold text-purple-600 mb-2">40%</div>
          <div className="text-sm text-purple-700">Are duplicate or reposted content</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="text-3xl font-bold text-green-600 mb-2">5%</div>
          <div className="text-sm text-green-700">Of nofollow links drive real traffic</div>
        </div>
      </div>

      {/* Interactive Table of Contents   */}
      <div className="bg-gray-50 rounded-2xl p-8 mb-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
          <FileSpreadsheet className="w-6 h-6 text-gray-600" />
          What You\'ll Learn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tableOfContents.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveSection(item.id);
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`flex items-center gap-3 p-4 rounded-lg transition-all ${
                  activeSection === item.id 
                    ? 'bg-blue-100 border-2 border-blue-400' 
                    : 'bg-white border-2 border-gray-200 hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <Icon className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium">{item.title}</span>
                <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Introduction   */}
      <div className="prose prose-lg max-w-none mb-12">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-8">
          <p className="text-lg font-medium text-gray-800 mb-3">
            <strong>Got stuck sorting out your link prospects?</strong>
          </p>
          <p className="text-gray-700">
            Every other guide suggests relying on domain authority, relevance, traffic, and social signals. 
            While there\'s nothing wrong with that advice, <strong>it\'s just the tip of the iceberg</strong>.
          </p>
        </div>

        <p className="text-gray-700 leading-relaxed">
          Once you dig deeper into your spreadsheet with link prospects, you\'ll run into controversies that no one explains how to deal with:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-sm">Should you cross ALL low-authority domains off your list?</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-sm">Are nofollow links ALWAYS no-go options?</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-sm">How to distinguish genuine bloggers from time-wasters?</p>
          </div>
          <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
            <AlertCircle className="w-5 h-5 text-orange-500 mb-2" />
            <p className="text-sm">What if influencers ignore your outreach emails?</p>
          </div>
        </div>
      </div>

      {/* Section 1: Pre-stage   */}
      <section id="pre-stage" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          Pre-stage: Getting Your Spreadsheet Ready
        </h2>
        
        <div className="bg-blue-50 rounded-xl p-8 mb-8">
          <p className="text-lg mb-6">Follow these three easy steps to prepare your link prospects spreadsheet:</p>
          
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                0.1
              </div>
              <div>
                <h4 className="font-semibold mb-2">Export Competitor Backlinks</h4>
                <p className="text-gray-700">Go to your backlink checker and export backlinks to your competing pages. 
                For example, I exported backlinks to 33 similar compilations, totaling 3,383 URLs.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                0.2
              </div>
              <div>
                <h4 className="font-semibold mb-2">Combine Spreadsheets</h4>
                <p className="text-gray-700">Combine many spreadsheets into one following a simple two-minute guide.</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                0.3
              </div>
              <div>
                <h4 className="font-semibold mb-2">Keep Essential Metrics</h4>
                <p className="text-gray-700">Your sheet will contain many columns. Keep only the essential ones:</p>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Table   */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-200">
                <th className="text-left p-4 font-semibold">Metric</th>
                <th className="text-left p-4 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">DR</td>
                <td className="p-4 text-gray-700">How strong a backlink profile of an entire referring domain is</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">UR</td>
                <td className="p-4 text-gray-700">How strong a backlink profile of a single referring page is</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">Traffic</td>
                <td className="p-4 text-gray-700">Monthly organic traffic from Google</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">Link Anchor</td>
                <td className="p-4 text-gray-700">Clickable snippet of text in a hyperlink</td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium">Type</td>
                <td className="p-4 text-gray-700">Dofollow or nofollow</td>
              </tr>
            </tbody>
          </table>
        </div>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/05/linked-domains.png"
          alt="Linked domains example"
          className="w-full rounded-lg shadow-md mb-4"
        />
      </section>

      {/* Section 2: What to Remove   */}
      <section id="referring-pages" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-red-600" />
          What Kind of Referring Pages Should You Get Rid Of?
        </h2>

        <div className="bg-red-50 border-l-4 border-red-400 p-6 rounded-r-lg mb-8">
          <p className="text-lg font-semibold text-red-900 mb-2">
            ⚠️ Spoiler Alert
          </p>
          <p className="text-red-800">
            After filtering out referring pages in my sheet, I kept only <strong>31% of them</strong>.
          </p>
        </div>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/05/spoiler.png"
          alt="Filtering results"
          className="w-full rounded-lg shadow-md mb-8"
        />

        {/* Foreign Language URLs   */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-gray-600" />
            1.1. URLs in Foreign Languages
          </h3>
          <p className="text-gray-700 mb-4">
            A German-speaking writer shouldn't suggest to their audience that they check a post in Italian. 
            Most won\'t understand the copy.
          </p>
          <img 
            src="https://www.linkio.com/wp-content/uploads/2020/05/foreign-language.png"
            alt="Foreign language example"
            className="w-full rounded-lg shadow-md mb-4"
          />
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note:</strong> If you promote a product rather than content, you can gain backlinks from 
              foreign-language pages if you have a localized version.
            </p>
          </div>
        </div>

        {/* Duplicate Pages   */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4">1.2. Duplicate Referring Pages</h3>
          <div className="bg-orange-50 rounded-xl p-6 mb-6">
            <p className="text-lg font-semibold text-orange-900 mb-2">
              Biggest category: 40% of unwanted URLs
            </p>
            <p className="text-gray-700">
              The web is full of duplicate pages from content syndication, reposts, and content theft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Sort by Title</h4>
              <p className="text-sm text-gray-600">Identify obvious duplicates</p>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Sort by TextPre/TextPost</h4>
              <p className="text-sm text-gray-600">Find hidden duplicates</p>
            </div>
            <div className="bg-white border-2 border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Check Platforms</h4>
              <p className="text-sm text-gray-600">BlogSpot, Medium, etc.</p>
            </div>
          </div>

          <img 
            src="https://www.linkio.com/wp-content/uploads/2020/05/reffering-page.png"
            alt="Duplicate pages example"
            className="w-full rounded-lg shadow-md"
          />
        </div>

        {/* More subsections with images   */}
        <div className="space-y-8">
          <img 
            src="https://www.linkio.com/wp-content/uploads/2020/05/rephrased.png"
            alt="Rephrased titles example"
            className="w-full rounded-lg shadow-md"
          />
          <img 
            src="https://www.linkio.com/wp-content/uploads/2020/05/TextPre.png"
            alt="TextPre sorting example"
            className="w-full rounded-lg shadow-md"
          />
        </div>
      </section>

      {/* Section 3: Low Authority Domains   */}
      <section id="low-authority" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Should You Gain Backlinks from Low Authority Domains?</h2>
        
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-8 mb-8">
          <p className="text-lg mb-4">
            The main stumbling point in link prospecting is whether you should deal with domains that have a low authority score.
          </p>
          <p className="text-gray-700">
            Domain Authority, Domain Rating, Trust Flow - they\'re all based on the same thing: <strong>backlinks and nothing else</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border-2 border-green-200 rounded-xl p-6">
            <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold mb-2">Metrics-Based Approach</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Check organic traffic</li>
              <li>• Analyze organic keywords</li>
              <li>• Calculate linked domains ratio</li>
            </ul>
          </div>
          <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
            <Users className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-semibold mb-2">Blogger-Based Approach</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Research the person behind the site</li>
              <li>• Check their LinkedIn profile</li>
              <li>• Analyze their social media presence</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg">
          <p className="font-semibold mb-2">💡 Pro Tip</p>
          <p className="text-gray-700">
            Sites with low DR often have more responsive owners. They haven\'t become cocky yet, and building 
            connections with new people is on their priority list.
          </p>
        </div>
      </section>

      {/* Section 4: Nofollow Links   */}
      <section id="nofollow-links" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Can Nofollow Backlinks Be of Any Value?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-red-50 rounded-xl p-6">
            <XCircle className="w-8 h-8 text-red-600 mb-3" />
            <h4 className="font-semibold mb-2 text-red-900">The Con</h4>
            <p className="text-gray-700">
              They don't pass any link juice and therefore can\'t improve search rankings directly.
            </p>
          </div>
          <div className="bg-green-50 rounded-xl p-6">
            <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold mb-2 text-green-900">The Pros</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Can bring referral traffic</li>
              <li>• Makes backlink profile look natural</li>
              <li>• Visitors might link with dofollow</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-100 rounded-xl p-6">
          <p className="font-semibold mb-2">📊 The Verdict</p>
          <p className="text-gray-700">
            Limit your nofollow prospects to pages driving organic traffic. According to my study, 
            only <strong>5% of pages with nofollow links</strong> usually have organic traffic.
          </p>
        </div>
      </section>

      {/* Final Section: Call to Action   */}
      <section className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-10 text-white">
        <h2 className="text-3xl font-bold mb-4">Ready to Clean Your Link Prospects?</h2>
        <p className="text-lg mb-6 text-white/90">
          Now that you know how to sort and filter link prospects, it\'s time to put this knowledge into action. 
          Remember: quality over quantity always wins in link building.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
            Download Prospect Template
          </button>
          <button className="bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition-colors border border-white/30">
            Read Next: Outreach Templates
          </button>
        </div>
      </section>
    </BlogPostTemplate>
  );
}
