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
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 mb-12 border border-blue-200">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-8 h-8 text-blue-600" />
          <span className="text-sm font-medium bg-blue-600 text-white px-3 py-1 rounded-full">
            Link Building Strategy
          </span>
        </div>
        <h1 className="text-4xl font-bold mb-4 text-gray-900">How to Sort and Filter Link Prospects</h1>
        <p className="text-lg text-gray-700 mb-6">
          Turn your messy spreadsheet into a goldmine of opportunities. Learn the insider tactics for identifying quality link prospects and avoiding time-wasters.
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <div className="text-2xl font-bold text-blue-600 mb-1">31%</div>
            <div className="text-sm text-gray-600">Of prospects are actually worth pursuing</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-purple-200">
            <div className="text-2xl font-bold text-purple-600 mb-1">40%</div>
            <div className="text-sm text-gray-600">Are duplicate or reposted content</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="text-2xl font-bold text-green-600 mb-1">5%</div>
            <div className="text-sm text-gray-600">Of nofollow links drive real traffic</div>
          </div>
        </div>
      </div>

      {/* Introduction */}
      <div className="prose prose-lg max-w-none mb-12">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-r-lg mb-8">
          <p className="text-lg font-medium text-gray-800 mb-3">
            <strong>Got stuck sorting out your link prospects?</strong>
          </p>
          <p className="text-gray-700 mb-4">
            Every other guide suggests relying on domain authority, relevance, traffic, and social signals. 
            While there's nothing wrong with that advice, <strong>it's just the tip of the iceberg</strong>.
          </p>
          <p className="text-gray-700">
            Once you dig deeper into your spreadsheet with link prospects, you'll run into controversies that no one explains how to deal with:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Should you cross ALL low-authority domains off your list?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">Are nofollow links ALWAYS no-go options?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">How to distinguish genuine bloggers from time-wasters?</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-700">What if influencers ignore your outreach emails?</p>
          </div>
        </div>

        <p className="text-gray-700 leading-relaxed mb-6">
          This chapter talks about how to sort out link prospects in your sheet and beyond it. No superficial info – 
          I'll guide you through the process from the inside, where confusion arises all the time.
        </p>
      </div>

      {/* Table of Contents */}
      <div className="bg-gray-50 rounded-lg p-6 mb-12">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-gray-600" />
          What You'll Learn
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  activeSection === item.id 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'bg-white border border-gray-200 hover:border-blue-200'
                }`}
              >
                <Icon className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium">{item.title}</span>
                <ChevronRight className="w-4 h-4 ml-auto text-gray-400" />
              </a>
            );
          })}
        </div>
      </div>

      {/* Section 1: Pre-stage */}
      <section id="pre-stage" className="mb-16">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
          <FileSpreadsheet className="w-8 h-8 text-blue-600" />
          Pre-stage: Getting Your Spreadsheet Ready
        </h2>
        
        <p className="text-gray-700 mb-6">
          But first things first. If you haven't prepared a spreadsheet with your link prospects yet, follow these three easy steps.
        </p>

        <div className="space-y-6 mb-8">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.1
            </div>
            <div>
              <h4 className="font-semibold mb-2">Export Competitor Backlinks</h4>
              <p className="text-gray-700">
                Go to your backlink checker and export backlinks to your competing pages. 
                For example, I exported backlinks to 33 similar compilations, totaling 3,383 URLs.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.2
            </div>
            <div>
              <h4 className="font-semibold mb-2">Combine Spreadsheets</h4>
              <p className="text-gray-700">
                Combine many spreadsheets into one following a simple two-minute guide.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
              0.3
            </div>
            <div>
              <h4 className="font-semibold mb-2">Keep Essential Metrics</h4>
              <p className="text-gray-700 mb-4">
                Depending on your backlink checker (I use Ahrefs), your sheet will contain many columns. 
                Keep only the essential ones:
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Table */}
        <div className="overflow-x-auto mb-8">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left p-4 font-semibold">Metric</th>
                <th className="text-left p-4 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="p-4 font-medium">DR</td>
                <td className="p-4 text-gray-700">How strong a backlink profile of an entire referring domain is</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 font-medium">UR</td>
                <td className="p-4 text-gray-700">How strong a backlink profile of a single referring page is</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 font-medium">Traffic</td>
                <td className="p-4 text-gray-700">Monthly organic traffic from Google</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 font-medium">Link Anchor</td>
                <td className="p-4 text-gray-700">Clickable snippet of text in a hyperlink</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="p-4 font-medium">Type</td>
                <td className="p-4 text-gray-700">Dofollow or nofollow</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-gray-700">
          As for the rest, feel free to remove them. With too many columns in your sheet, you won't know where to look first. It's distracting.
        </p>
      </section>

      {/* Section 2: What to Remove */}
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

        <p className="text-gray-700 mb-8">
          Dealing with your actual link prospects isn't the first step, as you might have expected. 
          You'll be surprised to see how much trash your spreadsheet contains.
        </p>

        {/* Foreign Language URLs */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <Globe className="w-6 h-6 text-gray-600" />
            1.1. URLs in Foreign Languages
          </h3>
          <p className="text-gray-700 mb-4">
            A German-speaking writer shouldn't suggest to their audience that they check a post in Italian. 
            Most won't understand the copy.
          </p>
          <p className="text-gray-700 mb-4">
            That's why you don't need to contact authors of foreign-language posts with a link request. 
            To find and remove them, sort your spreadsheet by language in the corresponding column.
          </p>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
            <p className="text-sm">
              <strong>Note:</strong> If you promote a product rather than content, you can gain backlinks from 
              foreign-language pages if you have a localized version.
            </p>
          </div>
        </div>

        {/* Duplicate Pages */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4">1.2. URLs of Duplicate Referring Pages</h3>
          <div className="bg-orange-50 rounded-lg p-6 mb-6 border border-orange-200">
            <p className="text-lg font-semibold text-orange-900 mb-2">
              Biggest category: 40% of unwanted URLs
            </p>
            <p className="text-gray-700">
              The web is full of duplicate pages from content syndication, reposts, and content theft.
            </p>
          </div>

          <p className="text-gray-700 mb-6">
            Some writers repost their content on platforms like growthhackers.com and medium.com. 
            Others repost someone else's content because they don't have time, resources, or skills to produce their own.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Sort by Title</h4>
              <p className="text-sm text-gray-600">Identify obvious duplicates by title</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Sort by TextPre/TextPost</h4>
              <p className="text-sm text-gray-600">Find hidden duplicates via surrounding text</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Check Platforms</h4>
              <p className="text-sm text-gray-600">BlogSpot, Medium, Squarespace</p>
            </div>
          </div>

          <h4 className="text-lg font-semibold mb-3">1.2.1. Sort the data by title (Referring Page Title column)</h4>
          <p className="text-gray-700 mb-4">
            You may notice minor variations in titles of the same reposted page. It happens because some authors update their articles over time.
          </p>
          <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg mb-6">
            <p className="text-sm">
              <strong>Tip:</strong> When you update your content, add minor changes to the title. Leave the main keyword as is, 
              but rephrase the surrounding text. It will help you diversify your backlink anchors in the long run.
            </p>
          </div>

          <h4 className="text-lg font-semibold mb-3">1.2.2. Sort the data by surrounding text (TextPre and TextPost columns)</h4>
          <p className="text-gray-700 mb-4">
            Many people who do reposts have a nasty habit of editing original titles. Due to such edits, 
            you won't be able to identify duplicates if you sort URLs by title.
          </p>
          <p className="text-gray-700 mb-4">
            While page titles differ, backlink anchors and surrounding text remain the same. 
            So, you need to sort your sheet by the text preceding the anchor (TextPre) to see more identicals.
          </p>
        </div>

        {/* Trash URLs */}
        <div className="mb-10">
          <h3 className="text-2xl font-bold mb-4">1.3. URLs That Look Like Trash</h3>
          <p className="text-gray-700 mb-4">
            The rule of thumb is to delete everything that doesn't look like a normal URL of a content page.
          </p>
          
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Remove URL shorteners</h4>
              <p className="text-sm text-gray-600">bit.ly, tinyurl.com, t.co links</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Remove URLs with IP addresses</h4>
              <p className="text-sm text-gray-600">192.168.x.x instead of domain names</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Remove feeds and social networks</h4>
              <p className="text-sm text-gray-600">URLs with "feed," "rss," "@", or usernames</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Pseudo Prospects */}
      <section id="pseudo-prospects" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Which Good-Looking URLs Are Pseudo Link Prospects?</h2>
        
        <p className="text-gray-700 mb-6">
          Got done with duplicates and other meaningless pages? Take a one-minute break and welcome a new portion of trash 
          masked behind good-looking URLs. This time, the analysis will go beyond your spreadsheet.
        </p>

        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-semibold mb-3">2.1. Non-openers</h3>
            <p className="text-gray-700 mb-4">
              URLs that look normal but don't open for various reasons: server down (error 521), 
              page not found (error 404), expired domains, or connection timeouts.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">2.2. URLs with Third-rate Content</h3>
            <p className="text-gray-700 mb-4">
              Nine times out of ten, a site that publishes short articles is nothing but a content farm. 
              Such companies hire low-paid writers who produce loads of third-rate content.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-3">2.3. URLs with Rewrites</h3>
            <p className="text-gray-700 mb-4">
              Articles that sound familiar—the so-called feeling of déjà vu. They're close to duplicates but aren't. 
              Look for double bios on pages or identical table of contents in different articles.
            </p>
          </div>
        </div>
      </section>

      {/* Section 4: Low Authority Domains */}
      <section id="low-authority" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Should You Gain Backlinks from Low Authority Domains?</h2>
        
        <p className="text-gray-700 mb-6">
          The main stumbling point in link prospecting is whether you should deal with domains that have a low authority score. 
          Domain Authority, Domain Rating, Trust Flow—they're all based on the same thing: <strong>backlinks and nothing else</strong>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white border border-green-200 rounded-lg p-6">
            <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold mb-2">Metrics-Based Approach</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Check organic traffic</li>
              <li>• Analyze organic keywords</li>
              <li>• Calculate linked domains ratio</li>
            </ul>
          </div>
          <div className="bg-white border border-blue-200 rounded-lg p-6">
            <Users className="w-8 h-8 text-blue-600 mb-3" />
            <h4 className="font-semibold mb-2">Blogger-Based Approach</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Research the person behind the site</li>
              <li>• Check their LinkedIn profile</li>
              <li>• Analyze their social media presence</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 border-l-4 border-blue-400 p-6 rounded-r-lg mb-8">
          <p className="font-semibold mb-2">💡 Key Insight</p>
          <p className="text-gray-700">
            Sites with low DR often have more responsive owners. They haven't become cocky yet, and building 
            connections with new people is on their priority list.
          </p>
        </div>

        <h3 className="text-xl font-semibold mb-4">3.1. Metrics-based Approach</h3>
        <p className="text-gray-700 mb-4">
          If your SEO tool has a batch analysis feature, you're lucky. You won't have to analyze domains with low DR one by one.
        </p>

        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Organic Traffic</h4>
            <p className="text-sm text-gray-700">
              If Google ranks some sites high without tons of backlinks, that's awesome! Such sites don't suck at all, 
              as their low DR suggests. Some can get hundreds or thousands of monthly visitors.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Organic Keywords</h4>
            <p className="text-sm text-gray-700">
              Some sites with low DR aren't low quality—they're just new. Check how many organic keywords 
              your prospects rank for in the top 100.
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Linked Domains</h4>
            <p className="text-sm text-gray-700">
              A website's link juice spreads among all domains it links to. The more linked domains, 
              the less juice you'll receive.
            </p>
          </div>
        </div>
      </section>

      {/* Section 5: Nofollow Links */}
      <section id="nofollow-links" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Can Nofollow Backlinks Be of Any Value?</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <XCircle className="w-8 h-8 text-red-600 mb-3" />
            <h4 className="font-semibold mb-2 text-red-900">The Con</h4>
            <p className="text-gray-700">
              They don't pass any link juice and therefore can't improve search rankings directly.
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <CheckCircle className="w-8 h-8 text-green-600 mb-3" />
            <h4 className="font-semibold mb-2 text-green-900">The Pros</h4>
            <ul className="space-y-2 text-sm text-gray-700">
              <li>• Can bring referral traffic</li>
              <li>• Makes backlink profile look natural</li>
              <li>• Visitors might link with dofollow</li>
            </ul>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
          <p className="font-semibold mb-2">📊 The Verdict</p>
          <p className="text-gray-700">
            Limit your nofollow prospects to pages driving organic traffic. According to my study, 
            only <strong>5% of pages with nofollow links</strong> usually have organic traffic.
          </p>
        </div>
      </section>

      {/* Section 6: Abandoned Blogs */}
      <section id="abandoned-blogs" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">Should You Deal with Blogs That Haven't Been Updated?</h2>
        
        <p className="text-gray-700 mb-6">
          Once you clean all the trash off your sheet, add one more column with the last blog update. 
          This will help you identify abandoned domains and remove them.
        </p>

        <p className="text-gray-700 mb-6">
          The main contenders for removal are blogs with no updates for a year or so. But this rule has exceptions. 
          Here are hacks to figure out if your target domain is still alive:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Active live chat</h4>
            <p className="text-sm text-gray-700">Check for recent chat activity</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Recent blog comments</h4>
            <p className="text-sm text-gray-700">Look for owner responses to comments</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Current year mentions</h4>
            <p className="text-sm text-gray-700">Check titles for current year references</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Fresh copyright date</h4>
            <p className="text-sm text-gray-700">Updated copyright in footer</p>
          </div>
        </div>
      </section>

      {/* Section 7: Guest Posts */}
      <section id="guest-posts" className="mb-16">
        <h2 className="text-3xl font-bold mb-6">What Should You Do If Your Target Page Is a Guest Post?</h2>
        
        <p className="text-gray-700 mb-6">
          You'll see that a bunch of pages on your list are guest posts. Since guest authors don't own those domains, 
          they have no access to the admin panel. It's beyond their power to edit their posts.
        </p>

        <div className="space-y-6">
          <div className="bg-red-50 rounded-lg p-6 border border-red-200">
            <h4 className="font-semibold mb-2 text-red-900">Purpose #1: Gaining a backlink to your blog post</h4>
            <p className="text-gray-700">
              Most likely, it's a no. No one will bother to contact blog editors and ask for a link change. 
              It's like chasing windmills—long and useless.
            </p>
          </div>

          <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
            <h4 className="font-semibold mb-2 text-yellow-900">Purpose #2: Gaining a backlink to your product</h4>
            <p className="text-gray-700">
              If there are guest posts strategically important for your business, contact guest authors with an offer 
              to test your tool. Create free accounts for them.
            </p>
          </div>

          <div className="bg-green-50 rounded-lg p-6 border border-green-200">
            <h4 className="font-semibold mb-2 text-green-900">Purpose #3: Future collaborations</h4>
            <p className="text-gray-700">
              Reach out to people who do guest posting and make friends with them. They publish content on multiple 
              resources—all your potential link targets.
            </p>
          </div>
        </div>
      </section>

      {/* Final Word */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-8 border border-blue-200">
        <h2 className="text-3xl font-bold mb-4">Final Word</h2>
        <p className="text-lg mb-6 text-gray-700">
          As soon as you finish sorting out your link prospects and remove the trash, you'll come to a logical conclusion. 
          They are not infinite, so you can't approach them carelessly and waste your opportunities.
        </p>
        <p className="text-gray-700 mb-6">
          Invest some time in polishing your outreach emails to get link prospects on your side. 
          Quality over quantity always wins in link building.
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors">
            Download Prospect Template
          </button>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors border border-blue-600">
            Read Next: Outreach Templates
          </button>
        </div>
      </section>
    </BlogPostTemplate>
  );
}