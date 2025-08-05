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
      readTime="10 min read"
    >
      <p className="text-lg text-gray-700 mb-8">
        Craving some helpful, actionable SEO webinars? Then you're in the right place. Take a look at our library of recordings from myself and other SEO experts. Webinars to teach, inspire, and motivate.
      </p>

      <p className="text-gray-700 mb-12">
        Whether you're looking to understand the fundamentals of SEO, dive deep into advanced link building strategies, or learn about the latest algorithm updates, our comprehensive collection of webinars has something for everyone. These sessions are designed to provide practical, actionable insights that you can implement immediately to improve your search rankings.
      </p>

      <div className="space-y-12">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How Many Backlinks Do You Need to Rank?</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
          <div className="relative aspect-video mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <iframe 
              src="https://www.youtube.com/embed/KDqYwo2Dy-I" 
              title="How Many Backlinks Do You Need to Rank?"
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Building Peak Performance Website</h2>
          <p className="text-gray-700 mb-4">Presenter: Clwyd Probert</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How to use InRank to unlock internal link potential in your site</h2>
          <p className="text-gray-700 mb-4">Presenter: Jenny Halasz</p>
          <div className="relative aspect-video mb-4 rounded-lg overflow-hidden shadow-lg bg-gray-100">
            <iframe 
              src="https://www.youtube.com/embed/6gi26D83Mu4" 
              title="How to use InRank to unlock internal link potential"
              className="absolute top-0 left-0 w-full h-full"
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How To Rank at the Top of Google without Backlinks</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">11 SEO Mistakes You're Making Right Now</h2>
          <p className="text-gray-700 mb-4">Presenter: Viola Eva</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Why SEO Consultants Get Fired and Who They Get Replaced With</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal and Douglas Karr</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">SEO Tutorial for Beginners</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">What Google Values in a Website</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction to Off Page SEO and Link Building</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Make SEO Proposals that Convert</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How Google Understands Your Content</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Onsite Optimization Intro – Page Factors to Consider</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Backlinking Strategy – A Complete Guide</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Best Practices for Anchor Text Optimization</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">How To Build Quality Backlinks with Blogger Outreach</h2>
          <p className="text-gray-700 mb-4">Presenter: Ajay Paghdal</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Website Speed Perception: Users vs Search Engines</h2>
          <p className="text-gray-700 mb-4">Presenter: Matthew Edgar</p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Introduction to Schema Markup</h2>
        </div>
      </div>
    </BlogPostTemplate>
  );
}