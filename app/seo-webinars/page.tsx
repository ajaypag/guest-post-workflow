import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: 'SEO Webinars (On-Page, Off-Page and More) | Linkio',
  description: 'Watch our collection of SEO webinars covering on-page optimization, off-page SEO, link building, and more. Learn from industry experts.',
};

export default function SeoWebinarsPage() {
  return (
    <BlogPostTemplate
      title="SEO Webinars (On-Page, Off-Page and More)"
      metaDescription="Watch our collection of SEO webinars covering on-page optimization, off-page SEO, link building, and more. Learn from industry experts."
      publishDate="December 15, 2020"
      author="Ajay Paghdal"
      readTime="20 min read"
      heroImage="https://www.linkio.com/wp-content/uploads/2020/12/seo-webinars-featured-image-1024x536.png"
      heroImageAlt="SEO Webinars Collection"
      relatedPosts={[
        {
          title: "Add Me to Search",
          href: "/add-me-to-search",
          description: "Learn how to create your Google People Card"
        }
      ]}
    >
      <div className="prose prose-lg max-w-none">
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Table of Contents</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li><a href="#how-many-backlinks" className="hover:text-blue-600">How Many Backlinks Do You Need to Rank?</a></li>
            <li><a href="#peak-performance" className="hover:text-blue-600">Building Peak Performance Website</a></li>
            <li><a href="#inrank" className="hover:text-blue-600">How to use InRank to unlock internal link potential</a></li>
            <li><a href="#seo-mistakes" className="hover:text-blue-600">11 SEO Mistakes You're Making Right Now</a></li>
            <li><a href="#seo-consultants" className="hover:text-blue-600">Why SEO Consultants Get Fired</a></li>
            <li><a href="#beginners" className="hover:text-blue-600">SEO Tutorial for Beginners</a></li>
            <li><a href="#google-values" className="hover:text-blue-600">What Google Values in a Website</a></li>
            <li><a href="#off-page" className="hover:text-blue-600">Introduction to Off Page SEO and Link Building</a></li>
            <li><a href="#proposals" className="hover:text-blue-600">How to Make SEO Proposals that Convert</a></li>
            <li><a href="#google-content" className="hover:text-blue-600">How Google Understands Your Content</a></li>
            <li><a href="#onsite" className="hover:text-blue-600">Onsite Optimization Intro</a></li>
            <li><a href="#backlinking" className="hover:text-blue-600">Backlinking Strategy – A Complete Guide</a></li>
            <li><a href="#anchor-text" className="hover:text-blue-600">Best Practices for Anchor Text Optimization</a></li>
            <li><a href="#blogger-outreach" className="hover:text-blue-600">How To Build Quality Backlinks with Blogger Outreach</a></li>
            <li><a href="#speed" className="hover:text-blue-600">Website Speed Perception</a></li>
            <li><a href="#schema" className="hover:text-blue-600">Introduction to Schema Markup for SEO</a></li>
            <li><a href="#anchor-guide" className="hover:text-blue-600">Anchor Text SEO Guide</a></li>
          </ul>
        </div>

        <p className="text-gray-700 mb-6">
          Craving some helpful, actionable SEO webinars? Then you're in the right place. Take a look at our library of recordings from myself and other SEO experts. Webinars to teach, inspire, and motivate. Sound like something you might like? Then kickback and let the learning begin.
        </p>

        <p className="text-gray-700 mb-8">
          To make a choice easier for you, the article lists both pros and cons of each tool.
        </p>

        <h2 id="how-many-backlinks" className="text-2xl font-bold text-gray-900 mb-4">
          <a href="https://www.youtube.com/watch?v=KDqYwo2Dy-I" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">
            How Many Backlinks Do You Need to Rank?
          </a>
        </h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-39.jpg" 
          alt="How Many Backlinks Do You Need to Rank webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          Presented by Ajay Paghdal, CEO at <a href="https://www.linkio.com/" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">Linkio</a>.
        </p>

        <p className="text-gray-700 mb-4">
          Learn an advanced way to calculate how many links you need to build based on the competitive level of your keyword.
        </p>

        <p className="text-gray-700 mb-6">
          Here's what you'll learn:<br />
          – A rundown of some current estimation methodologies<br />
          – What makes them good and faulty<br />
          – A fresh way to measure how many links you need<br />
          – A mix of tools to help speed up and automate the estimation process
        </p>

        <h2 id="peak-performance" className="text-2xl font-bold text-gray-900 mb-4">
          <a href="https://video.whitehat-seo.co.uk/building-peak-performing-websites" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">
            Building Peak Performance Website
          </a>
        </h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-40.jpg" 
          alt="Building Peak Performance Website webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          Presented by Clwyd Probert, CEO at <a href="https://www.whitehat-seo.co.uk/" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">Whitehat SEO Ltd</a>.
        </p>

        <p className="text-gray-700 mb-4">
          This is for those starting a business and looking to choose a content management platform for their next website build. Hear directly from HubSpot Go-to-Market Lead (Web & CMS Hub) Luke Summerfield on why he thinks you need to include the HubSpot CMS in your list and what are the best practices for building a website in 2021.
        </p>

        <p className="text-gray-700 mb-6">
          Here's what you'll learn:
        </p>
        <ul className="list-disc pl-8 mb-8 text-gray-700">
          <li>What are the problems with current CMS platforms</li>
          <li>What are the problems with the current website development project methods</li>
          <li>Why is the HubSpot CMS a good fit for both SMS and Enterprise website builds</li>
          <li>What is the best way to run a website project build</li>
        </ul>

        <h2 id="inrank" className="text-2xl font-bold text-gray-900 mb-4">
          <a href="https://www.youtube.com/watch?v=6gi26D83Mu4&list=PLY358cqlIiMr-Pi2WsuCXdo1I-3L2Z75A&index=9" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">
            How to use InRank to unlock internal link potential in your site
          </a>
        </h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-41.jpg" 
          alt="InRank Internal Link Potential webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          Presented by Jenny Halasz, Ambassador at <a href="https://www.oncrawl.com/" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">OnCrawl</a>.
        </p>

        <p className="text-gray-700 mb-4">
          When you're feeling like you've done everything you can do to optimize a site, it's time to look at InRank. InRank is the proprietary technology and rating system used by OnCrawl to determine internal PageRank.
        </p>

        <p className="text-gray-700 mb-4">
          Here's what you'll learn:
        </p>

        <p className="text-gray-700 mb-4">
          In recent core updates, Jenny Halasz found that tweaking a page's Inrank had a significant impact on how it performed post-update.
        </p>

        <p className="text-gray-700 mb-4">
          You don't want to miss this deep dive into Internal linking, where Jenny shows you how you can unlock additional potential from your website and really move the needle on those stubborn queries.
        </p>

        <p className="text-gray-700 mb-6">
          – Evaluate your website's internal value<br />
          – Components of Internal "Link Power"<br />
          – Importance of segmentation<br />
          – Examples of actionnable InkRank use<br />
          – How to use internal linking for optimizing your site?
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
          <p className="text-gray-700">
            Want to be added to this list? Click here to bring up our submission form. We will be in touch shortly with feedback.
          </p>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-4">How To Rank at the Top of Google without Backlinks</h3>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-34.jpg" 
          alt="Rank Without Backlinks webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at <a href="https://www.linkio.com/" target="_blank" rel="nofollow noopener" className="text-blue-600 hover:underline">Linkio</a>. Recorded in 2020.
        </p>

        <p className="text-gray-700 mb-4">
          You'll learn that it's not all about backlinks or content. Engagement is a secret weapon for getting skyhigh rankings – and getting it is easier than you think.
        </p>

        <p className="text-gray-700 mb-4">
          Key takeaways:<br />
          – How I ranked #1 for "top seo agency" without link building<br />
          – What tactic I used to create engagement<br />
          – How to automate the entire process<br />
          – Nuances to make sure you get good results
        </p>

        <p className="text-gray-700 mb-4">About the Presenter</p>
        <p className="text-gray-700 mb-6">
          Ajay has been in the SEO game since 2012, launching and selling a link building agency named OutreachMama and now working on a link building SaaS.
        </p>

        <div className="mb-8">
          <a href="https://www.youtube.com/watch?v=KDqYwo2Dy-I" target="_blank" rel="nofollow noopener" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="seo-mistakes" className="text-2xl font-bold text-gray-900 mb-4">11 SEO Mistakes You're Making Right Now</h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-35.jpg" 
          alt="11 SEO Mistakes webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          By Viola Eva of Head of SEO at White Light. Recorded in 2018.
        </p>

        <p className="text-gray-700 mb-6">
          From keyword research, to link building, to content – Viola covers some critical mistakes that, when done right, can move the needle substantially for your business.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="seo-consultants" className="text-2xl font-bold text-gray-900 mb-4">Why SEO Consultants Get Fired and Who They Get Replaced With</h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-36.jpg" 
          alt="Why SEO Consultants Get Fired webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Head of SEO at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          Host Ajay Paghdal welcomes Douglas Karr, CEO of DK New Media. Listen as they discuss why SEO consultants don't last and who they get replaced with.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="beginners" className="text-2xl font-bold text-gray-900 mb-4">SEO Tutorial for Beginners</h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-42.jpg" 
          alt="SEO Tutorial for Beginners webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This 2018 SEO training introduces basic concepts like onsite optimization, backlinks, and anchor text and explains the various intersections between them.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="google-values" className="text-2xl font-bold text-gray-900 mb-4">What Google Values in a Website</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This video focuses on understanding Google and covers the following topics: Google's goal for search results; How to get your content recognized by Google; How Google collects data to determine if your content is relevant; Google's algorithm for determining the best search results; The role of keywords and anchor text in Google searches; and finally, what Google would consider a "red flag".
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="off-page" className="text-2xl font-bold text-gray-900 mb-4">Introduction to Off Page SEO and Link Building</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This video focuses on building your popularity off of your website. Part of Google's ranking process includes not only optimizing your web site but having off-site content that points back to your site and is consistent with what you're showing on your site. This part focuses on building popularity of your website across the web through the use of backlinks from high quality and relevant web sites.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="proposals" className="text-2xl font-bold text-gray-900 mb-4">How to Make SEO Proposals that Convert</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          Learn how to craft an SEO proposal that is simple, easy to understand and converts. Follow this fast step-by-step process and see your deal flow increase.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="google-content" className="text-2xl font-bold text-gray-900 mb-4">How Google Understands Your Content</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This video focuses on how Google understands your outputs, defining four key components: URL, metadata, anchor text and content. It further identifies all of the terms you need to know within these four modules components and provides tips on how to best optimize your SEO strategy accordingly.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="onsite" className="text-2xl font-bold text-gray-900 mb-4">Onsite Optimization Intro – Page Factors to Consider</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This video focuses on the different SEO factors to consider when you are creating content. Now that we understand that the right combination of URL, metadata, anchor text and content is important, we discuss how to implement these components into your content creation strategy. Topics covered in this part include: The importance of variety and uniqueness in your content, creating an effective keywords list and categories of keywords, how to incorporate anchor text correctly, and what things to avoid in your content.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="backlinking" className="text-2xl font-bold text-gray-900 mb-4">Backlinking Strategy – A Complete Guide</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          Every online marketer worth their salt knows what a backlink is. It's an incredibly simple concept. You, as a website owner, convince another website owner to include a link on their website that points back to your website. Like I said, simple right? Well… Yes and no. While backlinks in and of themselves are simple, understanding how to build backlinks the right way is not. With the constant updates to Google's algorithm and best practices, the very same tactics that once landed you on the first page for your target keyword can now result in massive search engine penalties. All in all… building backlinks can quickly become a minefield of mistakes and mishaps for the uninformed SEO.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="anchor-text" className="text-2xl font-bold text-gray-900 mb-4">Best Practices for Anchor Text Optimization</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          Learn all about anchor text. How to optimize for it and the best practices. What in the World is Anchor Text, and Why Does it Matter? How the Penguin Update Changed the Game What Types of Anchor Text Are There Your Guide to Anchor Text Best Practices How to Apply This Knowledge
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="blogger-outreach" className="text-2xl font-bold text-gray-900 mb-4">How To Build Quality Backlinks with Blogger Outreach</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          OutreachMama presents the advanced guide to running blogger outreach link building campaigns to work. Watch this webinar to learn how to get onto page 1 of Google.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="speed" className="text-2xl font-bold text-gray-900 mb-4">Website Speed Perception: Users vs Search Engines</h2>

        <p className="text-gray-700 mb-4">
          By Matthew Edgar of Founder at Matthew Edgar. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          How the concept of speed differs between SEOs and website visitors
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="schema" className="text-2xl font-bold text-gray-900 mb-4">Introduction to Schema Markup for SEO</h2>

        <p className="text-gray-700 mb-4">
          By Ajay Paghdal of Founder at Linkio. Recorded in 2019.
        </p>

        <p className="text-gray-700 mb-6">
          This video focuses on Schema Markup and how it pertains to SEO. Schema markup is a type of metadata that is added to the backend of your website and can help Google identify and organize what is presented on your site. Specifically, this part addresses types of schema markup, the different categories that are in Google's database, and how you can implement relevant markup to optimize your search result listings.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <h2 id="anchor-guide" className="text-2xl font-bold text-gray-900 mb-4">Anchor Text SEO Guide</h2>

        <img 
          src="https://www.linkio.com/wp-content/uploads/2020/12/maxresdefault-38.jpg" 
          alt="Anchor Text SEO Guide webinar thumbnail"
          className="w-full rounded-lg shadow-md mb-6"
        />

        <p className="text-gray-700 mb-4">
          By Matt Diggity of Founder at Authority Builders. Recorded in 2020.
        </p>

        <p className="text-gray-700 mb-6">
          In this webinar, Matt breaks down a repeatable process for selecting the optimal anchor text when link building in SEO. He also covers 11 anchor text selection techniques that will help your backlinks become more effective while helping you avoid over-optimization penalties.
        </p>

        <div className="mb-8">
          <a href="#" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition">
            View Webinar
          </a>
        </div>

        <p className="text-gray-700 mb-8">
          If you decide to record your own webinar after watching, check out the best webinar software that will help you.
        </p>
      </div>
    </BlogPostTemplate>
  );
}