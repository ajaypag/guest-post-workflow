import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: 'SEO Webinars (On-Page, Off-Page and More) | PostFlow',
  description: 'Looking for some helpful SEO webinars? Take a look at our library of awesome webinars by SEO experts created to teach and inspire!',
};

export default function SEOWebinarsPage() {
  return (
    <BlogPostTemplate
      title="SEO Webinars (On-Page, Off-Page and More)"
      metaDescription="Looking for some helpful SEO webinars? Take a look at our library of awesome webinars by SEO experts created to teach and inspire!"
      publishDate="August 25, 2022"
      author="Ajay Paghdal"
      readTime="8 min read"
      heroImage="https://www.linkio.com/wp-content/uploads/2020/12/seo-webinars-featured-image-1024x536.png"
      heroImageAlt="SEO Webinars Collection"
      relatedPosts={[
        {
          title: "Guest Posting at Scale",
          href: "/guest-posting-sites",
          description: "Find high-quality guest posting opportunities in your niche"
        },
        {
          title: "Anchor Text Optimizer",
          href: "/anchor-text-optimizer",
          description: "Optimize your anchor text distribution for better rankings"
        },
        {
          title: "Directory Submission Sites",
          href: "/directory-submission-sites",
          description: "Discover high-quality directories for link building"
        }
      ]}
    >
      <p className="text-lg text-gray-700 mb-8">
        Craving some helpful, actionable SEO webinars? Then you're in the right place. Take a look at our library of recordings from myself and other SEO experts. Webinars to teach, inspire, and motivate.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">How Many Backlinks Do You Need to Rank?</h2>
      
      <div className="relative aspect-video mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
          title="How Many Backlinks Do You Need to Rank?"
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>

      <p className="text-gray-700 mb-8">
        One of the most common questions in SEO: How many backlinks do you actually need to rank? In this webinar, we dive deep into backlink analysis, competitive research, and practical strategies for determining your link building targets.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Building Peak Performance Website</h2>
      
      <div className="relative aspect-video mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
          title="Building Peak Performance Website"
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>

      <p className="text-gray-700 mb-8">
        Website performance is a crucial ranking factor. Learn how to optimize your site's speed, Core Web Vitals, and overall performance to improve both user experience and search rankings.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">How to use InRank to unlock internal link potential</h2>
      
      <div className="relative aspect-video mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
          title="How to use InRank to unlock internal link potential"
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>

      <p className="text-gray-700 mb-8">
        Internal linking is often overlooked but incredibly powerful. Discover how to use InRank methodology to maximize the SEO value of your internal link structure and boost your rankings without building a single external link.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">11 SEO Mistakes You're Making Right Now</h2>
      
      <div className="relative aspect-video mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
          title="11 SEO Mistakes You're Making Right Now"
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>

      <p className="text-gray-700 mb-8">
        Even experienced SEOs make mistakes. In this eye-opening webinar, we reveal 11 common SEO mistakes that could be holding back your rankings - and more importantly, how to fix them.
      </p>

      <ul className="list-disc list-inside space-y-2 text-gray-700 mb-8">
        <li>Over-optimizing anchor text</li>
        <li>Ignoring search intent</li>
        <li>Poor internal linking structure</li>
        <li>Neglecting technical SEO</li>
        <li>Building links too fast</li>
        <li>Not tracking the right metrics</li>
        <li>Focusing on quantity over quality</li>
        <li>Ignoring mobile optimization</li>
        <li>Not updating old content</li>
        <li>Poor site architecture</li>
        <li>Neglecting user experience signals</li>
      </ul>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Why SEO Consultants Get Fired</h2>
      
      <div className="relative aspect-video mb-8 rounded-lg overflow-hidden shadow-lg">
        <iframe 
          src="https://www.youtube.com/embed/YOUR_VIDEO_ID" 
          title="Why SEO Consultants Get Fired"
          className="absolute top-0 left-0 w-full h-full"
          frameBorder="0" 
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowFullScreen
        />
      </div>

      <p className="text-gray-700 mb-8">
        A candid discussion about why SEO consultants lose clients and how to avoid common pitfalls. Whether you're an agency, freelancer, or in-house SEO, this webinar provides valuable insights into client management and delivering results that matter.
      </p>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Key Takeaways from Our SEO Webinar Series</h2>

      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Backlink Building</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• Quality beats quantity every time</li>
          <li>• Anchor text diversity is crucial for natural link profiles</li>
          <li>• Competitor analysis reveals link building opportunities</li>
          <li>• Consistent link velocity matters more than bursts</li>
        </ul>
      </div>

      <div className="bg-purple-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical SEO</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• Site speed directly impacts rankings</li>
          <li>• Core Web Vitals are non-negotiable</li>
          <li>• Mobile-first indexing requires responsive design</li>
          <li>• Schema markup enhances SERP visibility</li>
        </ul>
      </div>

      <div className="bg-green-50 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Content Strategy</h3>
        <ul className="space-y-2 text-gray-700">
          <li>• Search intent alignment is fundamental</li>
          <li>• Comprehensive content outperforms thin pages</li>
          <li>• Regular content updates maintain rankings</li>
          <li>• Internal linking distributes authority effectively</li>
        </ul>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Additional SEO Learning Resources</h2>

      <p className="text-gray-700 mb-6">
        Beyond our webinar series, we've compiled additional resources to help you master SEO:
      </p>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Guest Posting Guide</h3>
          <p className="text-gray-700 mb-4">
            Discover how to build high-quality backlinks through strategic guest posting.
          </p>
          <a href="/guest-posting-sites" className="text-blue-600 hover:text-blue-700 font-medium">
            Explore Guest Post Sites →
          </a>
        </div>
        
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Anchor Text Optimization</h3>
          <p className="text-gray-700 mb-4">
            Learn how to optimize your anchor text distribution for maximum SEO impact.
          </p>
          <a href="/anchor-text-optimizer" className="text-blue-600 hover:text-blue-700 font-medium">
            Try Our Free Tool →
          </a>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mt-12 mb-6">Stay Updated with SEO Best Practices</h2>

      <p className="text-gray-700 mb-6">
        SEO is constantly evolving. What worked yesterday might not work tomorrow. That's why continuous learning through webinars, case studies, and practical experimentation is crucial for SEO success.
      </p>

      <div className="bg-gray-100 rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Join Our SEO Community</h3>
        <p className="text-gray-700 mb-4">
          Get notified about new webinars, SEO tips, and link building strategies.
        </p>
        <a 
          href="https://app.linkio.com/users/sign_up?_ga=2.195646757.845028537.1754360403-387936753.1754360403"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Start Your Free Trial
        </a>
      </div>

      <p className="text-gray-700">
        Remember, SEO success comes from combining knowledge with action. Watch these webinars, implement the strategies, and measure your results. The path to higher rankings starts with understanding the fundamentals and consistently applying proven techniques.
      </p>
    </BlogPostTemplate>
  );
}