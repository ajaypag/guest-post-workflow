import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: 'How to Sort and Filter Link Prospects | Linkio',
  description: 'Complete guide on sorting and filtering link prospects. Learn to identify quality links, remove duplicates, and build an effective outreach list.',
};

export default function SortFilterLinkProspectsPage() {
  return (
    <BlogPostTemplate
      title="How to Sort and Filter Link Prospects"
      metaDescription="Complete guide on sorting and filtering link prospects. Learn to identify quality links, remove duplicates, and build an effective outreach list."
      publishDate="March 15, 2021"
      author="Ajay Paghdal"
      readTime="20 min read"
      heroImage=""
      heroImageAlt="How to Sort and Filter Link Prospects"
      relatedPosts={[
        {
          title: "Link Disavows Good or Bad",
          href: "/link-disavows-good-or-bad",
          description: "Learn about link disavows and SEO"
        },
        {
          title: "Resource Page Link Building",
          href: "/resource-page-link-building-guide",
          description: "Complete guide to resource page link building"
        }
      ]}
    >
      <div className="prose prose-lg max-w-none">
        <p className="text-gray-700 mb-6">
          Got stuck sorting out your link prospects? Every other guide out there suggests that you should rely on the domain authority, relevance, traffic, and social signals. The higher, the better.
        </p>
        
        <p className="text-gray-700 mb-6">
          While there's absolutely nothing wrong with such advice, it's the tip of the iceberg. Once you dig deeper into your spreadsheet with link prospects, you'll run into a bunch of controversies that no one explains how to deal with.
        </p>
        
        <p className="text-gray-700 mb-8">
          This chapter talks about how to sort out link prospects in your sheet and beyond it. No superficial info – I'll guide you through the process from the inside, where confusion arises all the time.
        </p>

        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><a href="#pre-stage" className="hover:text-blue-600">Pre-stage of getting your spreadsheet ready</a></li>
            <li><a href="#referring-pages" className="hover:text-blue-600">What kind of referring pages should you get rid of?</a></li>
            <li><a href="#pseudo-prospects" className="hover:text-blue-600">Which good-looking URLs are pseudo link prospects?</a></li>
            <li><a href="#low-authority" className="hover:text-blue-600">Should you gain backlinks from domains with low authority?</a></li>
            <li><a href="#nofollow" className="hover:text-blue-600">Can link prospects providing nofollow backlinks be of any value?</a></li>
            <li><a href="#outdated-blogs" className="hover:text-blue-600">Should you deal with blogs that haven't been updated?</a></li>
            <li><a href="#guest-posts" className="hover:text-blue-600">What should you do if your target referring page is a guest post?</a></li>
          </ul>
        </div>

        <h2 id="pre-stage" className="text-2xl font-bold text-gray-900 mb-6">Pre-stage of getting your spreadsheet with link prospects ready</h2>
        
        <p className="text-gray-700 mb-6">
          But first things first. If you haven't prepared a spreadsheet with your link prospects yet, follow these three easy steps.
        </p>

        <div className="space-y-4 mb-8">
          <div className="border-l-4 border-blue-500 pl-6">
            <h3 className="font-bold text-gray-900 mb-2">Step 1: Export backlinks</h3>
            <p className="text-gray-700">
              Go to your backlink checker and export backlinks to your competing pages. For example, if you need link prospects for a compilation of keyword tools, export backlinks to 30+ similar compilations.
            </p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-6">
            <h3 className="font-bold text-gray-900 mb-2">Step 2: Combine spreadsheets</h3>
            <p className="text-gray-700">
              Combine many spreadsheets into one for easier management and analysis.
            </p>
          </div>
          
          <div className="border-l-4 border-blue-500 pl-6">
            <h3 className="font-bold text-gray-900 mb-2">Step 3: Keep essential columns</h3>
            <p className="text-gray-700">
              Keep only the essential metrics to avoid distraction: DR, UR, Referring Page URL, Title, Link Anchor, Type (dofollow/nofollow), Language, Traffic, and Linked Domains.
            </p>
          </div>
        </div>

        {/* <img 
          src="" // Commented out: src="https://www.linkio.com/wp-content/uploads/2021/03/linked-domains.png" 
          alt="Linked domains analysis"
          className="w-full rounded-lg shadow-md mb-8"
        /> */}

        <h2 id="referring-pages" className="text-2xl font-bold text-gray-900 mb-6">What kind of referring pages should you get rid of?</h2>
        
        <p className="text-gray-700 mb-6">
          Dealing with your actual link prospects isn't the first step, as you might have expected. You'll be surprised to see how much trash your spreadsheet contains.
        </p>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 mb-8">
          <p className="text-gray-700">
            <strong>Spoiler:</strong> Having filtered out referring pages in my sheet, I kept only almost 31% of them.
          </p>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">1. URLs of referring pages in foreign languages</h3>
        
        <p className="text-gray-700 mb-6">
          A German-speaking writer shouldn't suggest to the German-speaking audience that they check a post in Italian. That's why you don't need to contact authors of foreign-language posts with a link request.
        </p>

        {/* <img 
          src="" // Commented out: src="https://www.linkio.com/wp-content/uploads/2021/03/spoiler.png" 
          alt="Language filtering example"
          className="w-full rounded-lg shadow-md mb-8"
        /> */}

        <h3 className="text-xl font-bold text-gray-900 mb-4">2. URLs of duplicate referring pages</h3>
        
        <p className="text-gray-700 mb-6">
          This is the biggest category of unwanted URLs you'll have in your spreadsheet – 40% in most cases. The web is full of duplicate pages, which end up in backlink databases eventually.
        </p>

        <div className="space-y-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Sort by title (Referring Page Title column)</h4>
            <p className="text-gray-700">
              You may notice minor variations in titles of the same reposted page. When removing duplicates, make sure you keep the original as it will have a higher DR than reposts.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Sort by surrounding text</h4>
            <p className="text-gray-700">
              While page titles differ, backlink anchors and surrounding text remain the same. Sort your sheet by the text preceding the anchor (TextPre) to see more duplicates.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Check for popular blogging platforms</h4>
            <p className="text-gray-700">
              Remove URLs hosted on BlogSpot and similar platforms. These are often duplicates with miserable metrics.
            </p>
          </div>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">3. URLs that look like trash</h3>
        
        <p className="text-gray-700 mb-6">
          Delete everything that doesn't look like a normal URL of a content page:
        </p>
        
        <ul className="list-disc pl-8 mb-8 text-gray-700">
          <li>URL shorteners</li>
          <li>URLs with IP addresses instead of domain names</li>
          <li>RSS feeds, social networks, content curation platforms</li>
          <li>URLs that look like gibberish</li>
          <li>Non-meaningful content pages (/site/, /search/, /comment/, etc.)</li>
        </ul>

        {/* <img 
          src="" // Commented out: src="https://www.linkio.com/wp-content/uploads/2021/03/trash-urls.png" 
          alt="Examples of trash URLs to remove"
          className="w-full rounded-lg shadow-md mb-8"
        /> */}

        <h2 id="pseudo-prospects" className="text-2xl font-bold text-gray-900 mb-6">Which good-looking URLs are pseudo link prospects?</h2>
        
        <p className="text-gray-700 mb-6">
          This time, the analysis will go beyond your spreadsheet. You'll need to click through URLs and practice analytical thinking.
        </p>

        <div className="space-y-6 mb-8">
          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Non-openers</h3>
            <p className="text-gray-700">
              URLs that don't open due to server errors, 404s, expired domains, or connection issues. Double-check later as some issues may be temporary.
            </p>
          </div>
          
          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Third-rate content</h3>
            <p className="text-gray-700">
              Bloggers who post short articles with basic info are often content farms. They don't respond to link requests or charge fees when they do.
            </p>
          </div>
          
          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Rewrites</h3>
            <p className="text-gray-700">
              Articles that sound familiar - close to duplicates but rewritten with synonyms. Look for double bios or identical table of contents.
            </p>
          </div>
          
          <div className="border-l-4 border-red-500 pl-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Awful typography</h3>
            <p className="text-gray-700">
              Pages with poor formatting, tiny headings, or user-unfriendly navigation devalue the content and your link prospects.
            </p>
          </div>
        </div>

        <h2 id="low-authority" className="text-2xl font-bold text-gray-900 mb-6">Should you gain backlinks from domains with low authority?</h2>
        
        <p className="text-gray-700 mb-6">
          The main stumbling point in link prospecting is whether you should deal with domains that have a low authority score. The answer isn't straightforward.
        </p>

        <h3 className="text-xl font-bold text-gray-900 mb-4">Metrics-based approach</h3>
        
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Organic Traffic</h4>
            <p className="text-gray-700 text-sm">
              If Google ranks sites high without tons of backlinks, that's awesome! Some get hundreds of monthly visitors despite low DR.
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Organic Keywords</h4>
            <p className="text-gray-700 text-sm">
              Low DR sites might just be new. If they rank for hundreds of keywords in top 100, Google approves them.
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">Linked Domains</h4>
            <p className="text-gray-700 text-sm">
              Link juice spreads among all domains a site links to. Fewer linked domains = more juice for you.
            </p>
          </div>
        </div>

        {/* <img 
          src="" // Commented out: src="https://www.linkio.com/wp-content/uploads/2021/03/link-juice-calculation.png" 
          alt="Link juice calculation example"
          className="w-full rounded-lg shadow-md mb-8"
        /> */}

        <h3 className="text-xl font-bold text-gray-900 mb-4">Bloggers-based approach</h3>
        
        <p className="text-gray-700 mb-6">
          Learn about people behind your target domains. You may find hidden gems - experienced professionals with new sites who could become valuable connections.
        </p>

        <h2 id="nofollow" className="text-2xl font-bold text-gray-900 mb-6">Can link prospects providing nofollow backlinks be of any value?</h2>
        
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-red-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">Con</h3>
            <p className="text-gray-700">
              They don't pass link juice and can't improve search rankings directly.
            </p>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">Pros</h3>
            <ul className="text-gray-700 text-sm space-y-1">
              <li>• Can bring visitors who link to you via dofollow</li>
              <li>• Natural profiles need both types of links</li>
            </ul>
          </div>
        </div>
        
        <p className="text-gray-700 mb-8">
          <strong>Verdict:</strong> Reach out to nofollow prospects, but limit to pages with organic traffic (referral traffic potential).
        </p>

        <h2 id="outdated-blogs" className="text-2xl font-bold text-gray-900 mb-6">Should you deal with blogs that haven't been updated since last year?</h2>
        
        <p className="text-gray-700 mb-6">
          The lack of new content doesn't always mean there's no life behind that domain. Here are hacks to figure out if your target domain is still alive:
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-8">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">✅ Active live chat</h4>
            <p className="text-gray-700 text-sm">Check if they respond within hours</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">✅ Recent blog comments</h4>
            <p className="text-gray-700 text-sm">Owner responding to comments</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">✅ Current year in titles</h4>
            <p className="text-gray-700 text-sm">"2024 trends" indicates activity</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-bold text-gray-900 mb-2">✅ Fresh copyright date</h4>
            <p className="text-gray-700 text-sm">Updated year in footer</p>
          </div>
        </div>

        <h2 id="guest-posts" className="text-2xl font-bold text-gray-900 mb-6">What should you do if your target referring page is a guest post?</h2>
        
        <p className="text-gray-700 mb-6">
          Since guest authors don't own those domains, they can't edit their posts. Your approach depends on your purpose:
        </p>

        <div className="space-y-4 mb-8">
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <h3 className="font-bold text-gray-900 mb-2">Purpose 1: Gaining a backlink from that specific page</h3>
            <p className="text-gray-700">
              Most likely a no. Guest writers won't contact editors for link changes, and editors smell manipulation.
            </p>
          </div>
          
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
            <h3 className="font-bold text-gray-900 mb-2">Purpose 2: Getting featured in product compilations</h3>
            <p className="text-gray-700">
              Contact guest authors with free accounts to test your tool. If no response, reach out to blog editors directly.
            </p>
          </div>
          
          <div className="bg-green-50 border-l-4 border-green-500 p-4">
            <h3 className="font-bold text-gray-900 mb-2">Purpose 3: Building relationships for future posts</h3>
            <p className="text-gray-700">
              Guest writers publish on multiple resources. Make friends with them for future link opportunities.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Final Word</h2>
        
        <p className="text-gray-700 mb-6">
          As soon as you finish sorting out your link prospects and remove the trash, you'll come to a logical conclusion. They are not infinite, so you can't approach them carelessly and waste your opportunities.
        </p>
        
        <p className="text-gray-700 mb-8">
          Invest some time in polishing your outreach emails to get link prospects on your side. This systematic approach to filtering will dramatically improve your outreach success rates.
        </p>
      </div>
    </BlogPostTemplate>
  );
}