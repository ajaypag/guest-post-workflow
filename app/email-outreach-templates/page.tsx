import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: '111 Cold Email Outreach Templates for Link Building (Free) | Linkio',
  description: 'Get 111 proven email outreach templates for link building campaigns. Broken link building, guest post pitches, resource pages, and more. Ready to copy & customize.',
};

export default function EmailOutreachTemplatesPage() {
  return (
    <BlogPostTemplate
      title="Cold Email Outreach Templates For Link Building"
      metaDescription="Get 111 proven email outreach templates for link building campaigns. Broken link building, guest post pitches, resource pages, and more. Ready to copy & customize."
      publishDate="January 15, 2021"
      author="Ajay Paghdal"
      authorRole="Founder and Marketer for Linkio"
      readTime="20 min read"
      heroImage=""
      heroImageAlt="Email Outreach Templates for Link Building"
      relatedPosts={[
        {
          title: "Resource Page Link Building Guide",
          href: "/resource-page-link-building-guide",
          description: "Complete guide to resource page link building"
        },
        {
          title: "Best Blogger Outreach Services",
          href: "/best-blogger-outreach-services",
          description: "Find the right outreach service for your needs"
        }
      ]}
    >
      <div className="prose prose-lg max-w-none">
        <nav className="bg-gray-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4">Template Categories (111 Total)</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">Update Existing Article</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• <a href="#broken-link" className="hover:text-blue-600">Broken Link Building (7)</a></li>
                <li>• <a href="#link-reclamation" className="hover:text-blue-600">Link Reclamation (2)</a></li>
                <li>• <a href="#resource-pages" className="hover:text-blue-600">Resource Pages (4)</a></li>
                <li>• <a href="#skyscraper" className="hover:text-blue-600">Skyscraper Outreach (6)</a></li>
                <li>• <a href="#link-insertion" className="hover:text-blue-600">Link Insertion (3)</a></li>
                <li>• <a href="#anchor-text" className="hover:text-blue-600">Update Anchor Text (2)</a></li>
                <li>• <a href="#edu-outreach" className="hover:text-blue-600">.EDU Outreach (5)</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Pitch Your Content</h4>
              <ul className="space-y-1 text-gray-700">
                <li>• <a href="#guest-post" className="hover:text-blue-600">Guest Post Pitch (18)</a></li>
                <li>• <a href="#infographic" className="hover:text-blue-600">Infographic Outreach (5)</a></li>
                <li>• <a href="#press-outreach" className="hover:text-blue-600">Press Outreach (4)</a></li>
                <li>• <a href="#product-review" className="hover:text-blue-600">Product Review (4)</a></li>
                <li>• <a href="#expert-roundup" className="hover:text-blue-600">Expert Roundup (3)</a></li>
                <li>• <a href="#follow-ups" className="hover:text-blue-600">Follow-ups (15)</a></li>
              </ul>
            </div>
          </div>
        </nav>

        <p className="text-gray-700 mb-6">
          Link building outreach is one of the most time-consuming parts of any SEO campaign. But it doesn't have to be if you have the right email templates at your disposal.
        </p>

        <p className="text-gray-700 mb-8">
          Below you'll find 111 proven email templates for every type of link building campaign. From broken link building to guest post pitches, we've got you covered.
        </p>

        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">📧 How to Use These Templates</h3>
          <ul className="text-gray-700 space-y-2">
            <li>• <strong>Personalize every email</strong> - Never send a template as-is</li>
            <li>• <strong>Research your prospects</strong> - Mention something specific about their site</li>
            <li>• <strong>Provide genuine value</strong> - Focus on what you can offer them</li>
            <li>• <strong>Test different approaches</strong> - A/B test your subject lines and messaging</li>
          </ul>
        </div>

        <h2 id="broken-link" className="text-2xl font-bold text-gray-900 mb-6">Broken Link Building Outreach Email Templates</h2>

        <div className="space-y-8 mb-12">
          <div className="bg-gray-50 border-l-4 border-gray-400 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 1: Simple Broken Link Alert</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> One of your links on {'{{Their website}}'} is broken</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I was looking for some good data on {'{{topic}}'} and stumbled upon your {'{{article name}}'}.</p>
                <p className="mb-2">I found what I was looking for, however, I noticed that the link directing to the {'{{site name with 404 error}}'} leads to a 404.</p>
                <p className="mb-2">{'{{broken link URL}}'}</p>
                <p className="mb-2">I feel like one of my own posts on {'{{topic}}'} would be a great addition to your page and a good replacement for the broken link. {'{{elaborate why}}'}</p>
                <p className="mb-2">{'{{Your post\'s URL}}'}</p>
                <p className="mb-2">Let me know if there's anything else I can help you with.</p>
                <p className="mb-2">Thanks {'{{prospect.first_name}}'},</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-l-4 border-gray-400 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 2: 404 Error Alert</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> One of your links is a 404</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I was just reading your post about {'{{topic}}'} and noticed you linked to {'{{site name with 404 error}}'}.</p>
                <p className="mb-2">It looks like {'{{competing website\'s name}}'} have moved or deleted that page, so when I try to follow the link, it leads to a 404 error. I was wondering whether it would be possible to replace the broken link with a working link to my own article.</p>
                <p className="mb-2">I did some research on {'{{topic}}'} and found out that {'{{your article\'s summary}}'}</p>
                <p className="mb-2">You can find it here: {'{{Your post\'s URL}}'}</p>
                <p className="mb-2">I feel like my post would fit right in and your readers would find it interesting, because {'{{elaborate why}}'}</p>
                <p className="mb-2">Let me know what you think,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-l-4 border-gray-400 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 3: Dead Link Discovery</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Found a dead link on your site</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hey {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I was digging around for information on {'{{topic}}'} today and came across your post: {'{{link to their post}}'}</p>
                <p className="mb-2">This is great! Lots of good advice. I even {'{{implemented something, learned something}}'}.</p>
                <p className="mb-2">However, I did find some broken links there. Let me know if you'd like me to send you the list I made.</p>
                <p className="mb-2">Cheers,</p>
                <p>{'{{inbox.signature}}'}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 id="resource-pages" className="text-2xl font-bold text-gray-900 mb-6">Resource Page Outreach Email Templates</h2>

        <div className="space-y-8 mb-12">
          <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 1: Resource Page Addition</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Great resource for {'{{topic}}'}</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I came across your resource page {'{{resource page link}}'} while gathering some information on {'{{topic}}'}.</p>
                <p className="mb-2">Great list, I had no idea about some of the resources before I found them on your site.</p>
                <p className="mb-2">If you're interested, I have an article of my own on {'{{topic}}'} that I think would make a great addition to your page. Here it is: {'{{Your post\'s URL}}'}.</p>
                <p className="mb-2">I think your readers would enjoy it because {'{{elaborate why}}'} and it would fit right in.</p>
                <p className="mb-2">Thank you for your time,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 2: Resource Page Question</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Question about {'{{Their website}}'}</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">My name is {'{{inbox.name}}'}, and I just found your resource page for {'{{audience}}'}.</p>
                <p className="mb-2">{'{{resource page link}}'}</p>
                <p className="mb-2">I'm from {'{{your company\'s name}}'} and we {'{{tell them about what you do and what you can offer}}'}.</p>
                <p className="mb-2">{'{{Your post\'s URL}}'}</p>
                <p className="mb-2">It might make a good addition to your resource page and provide good value for your visitors.</p>
                <p className="mb-2">Let me know if I can do anything else for you.</p>
                <p className="mb-2">Thank you,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 id="skyscraper" className="text-2xl font-bold text-gray-900 mb-6">Skyscraper Outreach Email Templates</h2>

        <div className="space-y-8 mb-12">
          <div className="bg-purple-50 border-l-4 border-purple-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 1: Bigger and Better</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Bigger and better</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I was going through your articles at {'{{Their website}}'} and came across this page: {'{{article name}}'}.</p>
                <p className="mb-2">I noticed that in it you linked to one of my favorite articles ever: {'{{article name}}'}.</p>
                <p className="mb-2">It's an awesome piece of content, and it actually inspired me to write something bigger and better. {'{{Your post\'s URL}}'}</p>
                <p className="mb-2">I like {'{{the name of the author of the article they linked to}}'}\'s work, but it is a little outdated and lacks a few critical details.</p>
                <p className="mb-2">So, I think my article on {'{{topic}}'} will make a good addition to your page since it is more recent and more informative.</p>
                <p className="mb-2">Let me know what you think,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border-l-4 border-purple-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 2: Room for Improvement</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Room for improvement</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I was reading through your articles on {'{{topic}}'} and one specific article caught my attention: {'{{article name}}'}.</p>
                <p className="mb-2">It is linking to one of my all-time favorite posts. In fact, when I first read it, it inspired me to write something even more wholesome and informative.</p>
                <p className="mb-2">You've probably already guessed what I'm leading to. My post on {'{{topic}}'} is essentially the same thing, just more up-to-date and covers a few things that the original didn't.</p>
                <p className="mb-2">It might be a good addition to your resource.</p>
                <p className="mb-2">Anyhow, keep up the good work!</p>
                <p className="mb-2">Cheers,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 id="guest-post" className="text-2xl font-bold text-gray-900 mb-6">Guest Post Pitch Email Templates</h2>

        <div className="space-y-8 mb-12">
          <div className="bg-green-50 border-l-4 border-green-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 1: Simple Guest Post Pitch</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Guest post idea for {'{{Their website}}'}</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hi {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I've been following {'{{Their website}}'} for a while now and really enjoy your content on {'{{topic}}'}.</p>
                <p className="mb-2">I'm {'{{your name}}'} from {'{{your website}}'}, and I specialize in {'{{your expertise}}'}.</p>
                <p className="mb-2">I'd love to contribute a guest post to your site. Here are a few topic ideas:</p>
                <p className="mb-2">• {'{{Topic 1}}'}</p>
                <p className="mb-2">• {'{{Topic 2}}'}</p>
                <p className="mb-2">• {'{{Topic 3}}'}</p>
                <p className="mb-2">I can provide unique insights based on {'{{your experience/data/case studies}}'} and make sure the content is actionable for your audience.</p>
                <p className="mb-2">Would any of these topics be a good fit for your editorial calendar?</p>
                <p className="mb-2">Best regards,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border-l-4 border-green-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 2: Value-First Guest Post</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Free article for your readers on {'{{topic}}'}</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hello {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I noticed you recently published an article about {'{{recent article topic}}'}. Great insights!</p>
                <p className="mb-2">I think your readers would also be interested in learning about {'{{your proposed topic}}'}, especially since {'{{connection to their content}}'}.</p>
                <p className="mb-2">I've actually written a detailed guide on this topic that I'd be happy to share exclusively with your audience. It covers:</p>
                <p className="mb-2">• {'{{Key point 1}}'}</p>
                <p className="mb-2">• {'{{Key point 2}}'}</p>
                <p className="mb-2">• {'{{Key point 3}}'}</p>
                <p className="mb-2">The article is 2,000+ words with original research and actionable tips your readers can implement immediately.</p>
                <p className="mb-2">Would you be interested in taking a look?</p>
                <p className="mb-2">Best,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>
        </div>

        <h2 id="follow-ups" className="text-2xl font-bold text-gray-900 mb-6">Follow-Up Email Templates</h2>

        <div className="space-y-8 mb-12">
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 1: Gentle Nudge</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> Following up on my email</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hi {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I wanted to follow up on my previous email about {'{{brief reminder of what you offered}}'}.</p>
                <p className="mb-2">I know you're probably busy, but I thought this might be valuable for your readers since {'{{specific reason}}'}.</p>
                <p className="mb-2">No pressure at all - just wanted to make sure my email didn't get lost in your inbox!</p>
                <p className="mb-2">Best regards,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6">
            <h4 className="font-bold text-gray-900 mb-3">Template 2: Additional Value Follow-Up</h4>
            <div className="bg-white rounded p-4 text-gray-700 text-sm">
              <p className="mb-2"><strong>Subject:</strong> One more thing for your readers</p>
              <div className="border-t pt-3">
                <p className="mb-2">Hi {'{{prospect.first_name}}'},</p>
                <p className="mb-2">I sent you an email last week about {'{{original offer}}'}, but I wanted to share something else that might be even more valuable for your audience.</p>
                <p className="mb-2">I just finished {'{{new resource/case study/tool}}'} that shows {'{{specific benefit}}'}.</p>
                <p className="mb-2">Since your readers are interested in {'{{their audience interest}}'}, I thought this might be a perfect fit.</p>
                <p className="mb-2">Would you like me to send over the details?</p>
                <p className="mb-2">Thanks,</p>
                <p>{'{{inbox.name}}'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border-l-4 border-green-500 p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">💡 Pro Tips for Better Results</h3>
          <ul className="text-gray-700 space-y-2">
            <li>• <strong>Research first:</strong> Spend 5 minutes researching each prospect before reaching out</li>
            <li>• <strong>Personalize the subject line:</strong> Include their website name or recent content</li>
            <li>• <strong>Keep it short:</strong> Aim for 150 words or less in your initial outreach</li>
            <li>• <strong>Follow up strategically:</strong> Wait 5-7 days between follow-ups</li>
            <li>• <strong>Track your results:</strong> Monitor open rates and response rates to optimize</li>
          </ul>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Feel Free to Make Use of These Templates</h2>

        <p className="text-gray-700 mb-6">
          Thank you for coming to our page, and good luck with your outreach campaigns! Feel free to use these templates to speed up your work (it's exactly why we gathered them in one place for you anyway), but remember to personalize each pitch you send to the point where your prospects would never guess it was a template in the first place!
        </p>

        <p className="text-gray-700 mb-8">
          And always keep in mind that you always need to provide value to your prospects and their audience, regardless of why you're pitching them.
        </p>

        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">🎯 Want More Templates?</h3>
          <p className="text-gray-700 mb-3">
            These 111 templates are just the beginning. For more advanced outreach strategies and templates, check out our other resources:
          </p>
          <ul className="text-gray-700 space-y-2">
            <li>• Resource page link building templates</li>
            <li>• Broken link building strategies</li>
            <li>• Guest posting pitch templates</li>
            <li>• Follow-up email sequences</li>
          </ul>
        </div>
      </div>
    </BlogPostTemplate>
  );
}