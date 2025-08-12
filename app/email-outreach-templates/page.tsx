'use client';

import { useState } from 'react';
import BlogPostTemplate from '@/components/BlogPostTemplate';

export default function EmailOutreachTemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null);

  const templates = [
    // Broken Link Building Templates (15 templates)
    {
      id: 1,
      category: 'broken-link',
      title: 'Simple Broken Link Alert',
      subject: 'One of your links on {{Their website}} is broken',
      body: `Hello {{prospect.first_name}},

I was looking for some good data on {{topic}} and stumbled upon your {{article name}}.

I found what I was looking for, however, I noticed that the link directing to the {{site name with 404 error}} leads to a 404.

{{broken link URL}}

I feel like one of my own posts on {{topic}} would be a great addition to your page and a good replacement for the broken link. {{elaborate why}}

{{Your post's URL}}

Let me know if there's anything else I can help you with.

Thanks {{prospect.first_name}},
{{inbox.name}}`
    },
    {
      id: 2,
      category: 'broken-link',
      title: '404 Error Alert',
      subject: 'One of your links is a 404',
      body: `Hello {{prospect.first_name}},

I was just reading your post about {{topic}} and noticed you linked to {{site name with 404 error}}.

It looks like {{competing website's name}} have moved or deleted that page, so when I try to follow the link, it leads to a 404 error. I was wondering whether it would be possible to replace the broken link with a working link to my own article.

I did some research on {{topic}} and found out that {{your article's summary}}

You can find it here: {{Your post's URL}}

I feel like my post would fit right in and your readers would find it interesting, because {{elaborate why}}

Let me know what you think,
{{inbox.name}}`
    },
    {
      id: 3,
      category: 'broken-link',
      title: 'Dead Link Discovery',
      subject: 'Found a dead link on your site',
      body: `Hey {{prospect.first_name}},

I was digging around for information on {{topic}} today and came across your post: {{link to their post}}

This is great! Lots of good advice. I even {{implemented something, learned something}}.

However, I did find some broken links there. Let me know if you'd like me to send you the list I made.

Cheers,
{{inbox.signature}}`
    },
    {
      id: 4,
      category: 'broken-link',
      title: 'Broken Link with Multiple Resources',
      subject: 'Multiple broken links found on {{Their website}}',
      body: `Hi {{prospect.first_name}},

I was browsing through your excellent article "{{article title}}" and found it extremely helpful for understanding {{topic}}.

While checking some of the resources you mentioned, I noticed that several links appear to be broken:

1. {{broken link 1}}
2. {{broken link 2}}
3. {{broken link 3}}

I have some updated resources that might serve as great replacements:

{{Your resource 1 URL}} - This covers {{topic 1}} in depth
{{Your resource 2 URL}} - A comprehensive guide to {{topic 2}}

Would you be interested in updating these links? I think your readers would find these resources valuable.

Best regards,
{{inbox.name}}`
    },
    {
      id: 5,
      category: 'broken-link',
      title: 'Broken Link with Data',
      subject: 'Quick heads up about a broken link',
      body: `Hello {{prospect.first_name}},

I came across your article on {{topic}} while researching for a project. Great work on explaining {{specific aspect}}!

I noticed one of your links ({{broken link}}) is returning a 404 error. The content it was linking to seems to have been moved or deleted.

I actually have a similar resource that covers the same topic with updated data from {{current year}}. Here it is: {{your URL}}

It includes:
- {{key feature 1}}
- {{key feature 2}}  
- {{key feature 3}}

Would this be helpful as a replacement?

Thanks,
{{inbox.name}}`
    },
    {
      id: 6,
      category: 'broken-link',
      title: 'Broken Link - Short and Sweet',
      subject: 'Broken link on your {{topic}} page',
      body: `Hi {{prospect.first_name}},

Quick note: Found a broken link in your {{article title}} article.

{{broken link URL}}

I have an updated resource on the same topic if you're interested in replacing it: {{your URL}}

Let me know!

{{inbox.name}}`
    },
    {
      id: 7,
      category: 'broken-link',
      title: 'Broken Link with Tool Offer',
      subject: 'Found broken links + free tool to check more',
      body: `Hey {{prospect.first_name}},

Love your content on {{topic}}! Your article "{{article title}}" was particularly insightful.

I noticed a couple of broken links:
- {{broken link 1}}
- {{broken link 2}}

I have replacements for both if you're interested. Also, I built a free tool that checks for broken links across entire sites. Would you like me to run it on {{their website}} to catch any others?

Here are the replacement resources:
{{your URL 1}}
{{your URL 2}}

Best,
{{inbox.name}}`
    },
    {
      id: 8,
      category: 'broken-link',
      title: 'Broken Link with Improvement Suggestion',
      subject: 'Quick fix for your {{article topic}} article',
      body: `Hi {{prospect.first_name}},

I was researching {{topic}} and found your article incredibly helpful. The section on {{specific section}} answered exactly what I was looking for.

However, I noticed the link to {{broken resource}} is no longer working. 

I recently created an updated guide on the same topic that includes {{unique value proposition}}. It might be a suitable replacement: {{your URL}}

Thanks for creating such valuable content!

{{inbox.name}}`
    },
    {
      id: 9,
      category: 'broken-link',
      title: 'Broken Link with Expertise Mention',
      subject: 'Broken link in your excellent {{topic}} guide',
      body: `Hello {{prospect.first_name}},

As someone who's been working in {{industry}} for {{years}}, I really appreciated your comprehensive guide on {{topic}}.

While going through the resources, I found that the link to {{broken resource}} is no longer active.

Given my experience with {{specific expertise}}, I've created a detailed resource that covers the same ground with some additional insights: {{your URL}}

Would this work as a replacement?

Best regards,
{{inbox.name}}`
    },
    {
      id: 10,
      category: 'broken-link',
      title: 'Broken Link with Social Proof',
      subject: 'Link issue on your popular {{topic}} post',
      body: `Hi {{prospect.first_name}},

I came across your {{topic}} article through {{social media platform/referral source}}. It's been shared quite a bit in our industry!

While reading through it, I noticed the link to {{broken resource}} returns a 404 error.

I have a resource that covers similar ground and has been well-received by the {{industry}} community: {{your URL}}

It's been shared by {{social proof examples}} and might be a good fit as a replacement.

What do you think?

{{inbox.name}}`
    },
    {
      id: 11,
      category: 'broken-link',
      title: 'Broken Link with Update Offer',
      subject: 'Outdated link in your {{topic}} resource',
      body: `Hey {{prospect.first_name}},

Your {{topic}} resource list is fantastic! I've bookmarked it for future reference.

I noticed that {{broken link}} is no longer working - looks like they restructured their site.

I have an updated resource that covers the same topic with {{current year}} data: {{your URL}}

Happy to send you a summary first if you'd like to review before updating the link.

Cheers,
{{inbox.name}}`
    },
    {
      id: 12,
      category: 'broken-link',
      title: 'Broken Link with Case Study',
      subject: 'Broken link + real results to share',
      body: `Hello {{prospect.first_name}},

I've been following your content on {{topic}} and really appreciate the practical advice you share.

I found a broken link in your "{{article title}}" post: {{broken URL}}

I have a case study that shows how we achieved {{specific result}} using {{your method}}. It might work well as a replacement: {{your URL}}

The results speak for themselves - {{specific metric improvement}}.

Worth taking a look?

{{inbox.name}}`
    },
    {
      id: 13,
      category: 'broken-link',
      title: 'Broken Link with Community Connection',
      subject: 'Quick heads up from the {{community}} community',
      body: `Hi {{prospect.first_name}},

I'm part of the {{relevant community}} community and your article on {{topic}} gets recommended frequently.

Someone mentioned that one of the links might be broken, so I checked and confirmed {{broken URL}} is returning a 404.

I have a resource that the community has been using as an alternative: {{your URL}}

It covers {{key topics}} and might work well as a replacement.

Best,
{{inbox.name}}`
    },
    {
      id: 14,
      category: 'broken-link',
      title: 'Broken Link with Personal Connection',
      subject: 'Broken link in your inspiring {{topic}} article',
      body: `Hey {{prospect.first_name}},

I had to reach out after reading your article on {{topic}}. As someone who {{personal connection to topic}}, your insights really resonated with me.

I noticed the link to {{broken resource}} isn't working anymore. 

I created a guide based on my own experience with {{topic}} that might serve as a good replacement: {{your URL}}

It's helped {{number}} people in similar situations.

Thanks for the great content!

{{inbox.name}}`
    },
    {
      id: 15,
      category: 'broken-link',
      title: 'Broken Link with Future Value',
      subject: 'Broken link + ongoing resource updates',
      body: `Hello {{prospect.first_name}},

Your {{topic}} guide is incredibly thorough! I can tell a lot of thought went into compiling those resources.

I noticed {{broken URL}} is no longer accessible.

I have a similar resource that I keep updated quarterly with new data and insights: {{your URL}}

If you decide to use it as a replacement, I'll make sure to keep you informed of any major updates.

What do you think?

{{inbox.name}}`
    },

    // Resource Page Templates (12 templates)
    {
      id: 16,
      category: 'resource-pages',
      title: 'Resource Page Addition',
      subject: 'Great resource for {{topic}}',
      body: `Hello {{prospect.first_name}},

I came across your resource page {{resource page link}} while gathering some information on {{topic}}.

Great list, I had no idea about some of the resources before I found them on your site.

If you're interested, I have an article of my own on {{topic}} that I think would make a great addition to your page. Here it is: {{Your post's URL}}.

I think your readers would enjoy it because {{elaborate why}} and it would fit right in.

Thank you for your time,
{{inbox.name}}`
    },
    {
      id: 17,
      category: 'resource-pages',
      title: 'Resource Page Question',
      subject: 'Question about {{Their website}}',
      body: `Hello {{prospect.first_name}},

My name is {{inbox.name}}, and I just found your resource page for {{audience}}.

{{resource page link}}

I'm from {{your company's name}} and we {{tell them about what you do and what you can offer}}.

{{Your post's URL}}

It might make a good addition to your resource page and provide good value for your visitors.

Let me know if I can do anything else for you.

Thank you,
{{inbox.name}}`
    },
    {
      id: 18,
      category: 'resource-pages',
      title: 'Comprehensive Resource Suggestion',
      subject: 'Addition to your comprehensive {{topic}} resources',
      body: `Hi {{prospect.first_name}},

I discovered your incredibly detailed {{topic}} resource page and I'm impressed by the quality of resources you've curated.

I recently published a comprehensive guide that covers {{specific subtopic}} in depth. It includes:

- {{key point 1}}
- {{key point 2}}
- {{key point 3}}

Given the high standard of your existing resources, I believe this would fit well: {{your URL}}

The guide has been downloaded over {{number}} times and received positive feedback from {{industry}} professionals.

Would you consider adding it to your collection?

Best regards,
{{inbox.name}}`
    },
    {
      id: 19,
      category: 'resource-pages',
      title: 'Resource Page with Data',
      subject: 'Data-driven resource for your {{topic}} page',
      body: `Hello {{prospect.first_name}},

Your {{topic}} resource page is an excellent compilation! I've already bookmarked several tools from your list.

I noticed you focus on evidence-based resources, so I thought you might be interested in my recent analysis of {{topic}}.

It's based on data from {{sample size}} and reveals some surprising insights about {{key finding}}.

Here's the resource: {{your URL}}

It might complement your existing resources well, especially for readers looking for data-backed insights.

What do you think?

{{inbox.name}}`
    },
    {
      id: 20,
      category: 'resource-pages',
      title: 'Resource Page - Tool Suggestion',
      subject: 'Free tool for your {{topic}} resources',
      body: `Hi {{prospect.first_name}},

I love how you've organized your {{topic}} resource page - it's clearly been helpful for many people!

I built a free tool that automates {{specific task}} that your audience might find valuable: {{your URL}}

It's been used by {{number}}+ professionals to {{benefit}} and has a 4.8/5 rating.

Since you curate high-quality resources, I thought it might be worth considering for your page.

Best,
{{inbox.name}}`
    },
    {
      id: 21,
      category: 'resource-pages',
      title: 'Resource Page - Video Content',
      subject: 'Video resource for your {{topic}} collection',
      body: `Hey {{prospect.first_name}},

Your {{topic}} resource page is incredibly helpful! I notice you have a great mix of articles and tools.

I created a video series that walks through {{topic}} step-by-step with real examples. It might add nice variety to your text-based resources.

The series has {{view count}} views and covers:
- {{topic 1}}
- {{topic 2}}
- {{topic 3}}

Here it is: {{your URL}}

Think it would fit with your other resources?

{{inbox.name}}`
    },
    {
      id: 22,
      category: 'resource-pages',
      title: 'Resource Page - Template Offer',
      subject: 'Free templates for your {{topic}} resource page',
      body: `Hello {{prospect.first_name}},

I came across your excellent {{topic}} resource page while researching best practices in our industry.

I noticed you don't currently have any template resources, so I wanted to share my collection of {{type}} templates that have been downloaded {{number}}+ times.

They include:
- {{template 1}}
- {{template 2}}  
- {{template 3}}

All free to use: {{your URL}}

Would these be a good fit for your resource page?

Thanks,
{{inbox.name}}`
    },
    {
      id: 23,
      category: 'resource-pages',
      title: 'Resource Page - Industry Report',
      subject: 'New {{year}} {{industry}} report for your resources',
      body: `Hi {{prospect.first_name}},

Your {{topic}} resource page has been invaluable for staying up-to-date with industry trends.

I just completed our {{year}} {{industry}} report based on surveys from {{sample size}} professionals. The findings are quite revealing, especially regarding {{key insight}}.

Since your audience values current industry data, this might be a valuable addition: {{your URL}}

The report is free and has already been cited by {{publications}}.

Would you like to take a look?

Best regards,
{{inbox.name}}`
    },
    {
      id: 24,
      category: 'resource-pages',
      title: 'Resource Page - Expert Interview',
      subject: 'Expert interview series for your {{topic}} page',
      body: `Hey {{prospect.first_name}},

I've been a fan of your {{topic}} resource page for a while. The curation is top-notch!

I recently conducted interviews with {{number}} leading experts in {{field}}, including {{notable person}}. The insights are incredible, particularly around {{topic}}.

Since you feature expert insights on your page, this might be a great fit: {{your URL}}

Each interview is about 20 minutes and packed with actionable advice.

What do you think?

{{inbox.name}}`
    },
    {
      id: 25,
      category: 'resource-pages',
      title: 'Resource Page - Local Focus',
      subject: 'Local {{topic}} resource for your page',
      body: `Hello {{prospect.first_name}},

Your {{topic}} resource page covers the fundamentals really well. I noticed it focuses mainly on general strategies.

I created a guide specifically for {{location}}-based {{topic}} that addresses local challenges and opportunities.

It includes:
- {{local insight 1}}
- {{local insight 2}}
- {{local case studies}}

Here's the guide: {{your URL}}

Since many businesses need location-specific advice, this might complement your existing resources well.

Best,
{{inbox.name}}`
    },
    {
      id: 26,
      category: 'resource-pages',
      title: 'Resource Page - Beginner Focus',
      subject: 'Beginner-friendly addition to your {{topic}} resources',
      body: `Hi {{prospect.first_name}},

Your {{topic}} resource page is comprehensive and clearly serves professionals well. 

I noticed most resources assume prior knowledge, so I thought you might be interested in my beginner's guide that breaks down {{topic}} in simple terms.

It's helped {{number}} newcomers get started and covers:
- {{basic concept 1}}
- {{basic concept 2}}
- {{step-by-step process}}

Here it is: {{your URL}}

It might be valuable for readers just starting their {{topic}} journey.

What do you think?

{{inbox.name}}`
    },
    {
      id: 27,
      category: 'resource-pages',
      title: 'Resource Page - Mobile Focus',
      subject: 'Mobile-optimized resource for your collection',
      body: `Hey {{prospect.first_name}},

Love your {{topic}} resource page! I've shared it with several colleagues.

I created a resource specifically designed for mobile users - something I noticed was missing from most {{topic}} resources.

It covers {{mobile-specific topic}} and is formatted for easy reading on phones/tablets.

Check it out: {{your URL}}

With mobile usage growing in our industry, this might be a valuable addition to your page.

Thanks,
{{inbox.name}}`
    },

    // Guest Post Templates (20 templates)
    {
      id: 28,
      category: 'guest-post',
      title: 'Simple Guest Post Pitch',
      subject: 'Guest post idea for {{Their website}}',
      body: `Hi {{prospect.first_name}},

I've been following {{Their website}} for a while now and really enjoy your content on {{topic}}.

I'm {{your name}} from {{your website}}, and I specialize in {{your expertise}}.

I'd love to contribute a guest post to your site. Here are a few topic ideas:

• {{Topic 1}}
• {{Topic 2}}
• {{Topic 3}}

I can provide unique insights based on {{your experience/data/case studies}} and make sure the content is actionable for your audience.

Would any of these topics be a good fit for your editorial calendar?

Best regards,
{{inbox.name}}`
    },
    {
      id: 29,
      category: 'guest-post',
      title: 'Value-First Guest Post',
      subject: 'Free article for your readers on {{topic}}',
      body: `Hello {{prospect.first_name}},

I noticed you recently published an article about {{recent article topic}}. Great insights!

I think your readers would also be interested in learning about {{your proposed topic}}, especially since {{connection to their content}}.

I've actually written a detailed guide on this topic that I'd be happy to share exclusively with your audience. It covers:

• {{Key point 1}}
• {{Key point 2}}
• {{Key point 3}}

The article is 2,000+ words with original research and actionable tips your readers can implement immediately.

Would you be interested in taking a look?

Best,
{{inbox.name}}`
    },
    {
      id: 30,
      category: 'guest-post',
      title: 'Data-Driven Guest Post',
      subject: 'Original research on {{topic}} for {{website}}',
      body: `Hi {{prospect.first_name}},

I've been reading your content on {{topic}} and appreciate your data-driven approach to the subject.

I recently completed a study analyzing {{research topic}} across {{sample size}} companies. The results were surprising - particularly the finding that {{key insight}}.

I'd love to share these findings exclusively with your audience through a detailed guest post that includes:

- Complete methodology and data
- Actionable insights based on the findings  
- Industry implications and trends
- Downloadable charts and graphics

The research hasn't been published anywhere else. Would this be valuable for your readers?

Best regards,
{{inbox.name}}`
    },
    {
      id: 31,
      category: 'guest-post',
      title: 'Guest Post with Expertise',
      subject: 'Guest post from {{your title}} at {{company}}',
      body: `Hello {{prospect.first_name}},

I'm the {{your title}} at {{company}}, where I've been working on {{expertise area}} for the past {{years}} years.

I've been following {{website}} and really admire the quality of content you publish, especially your recent piece on {{recent article}}.

Given your audience's interest in {{topic}}, I'd like to contribute a guest post sharing insights from my experience managing {{specific experience}}.

Some potential topics:
- {{Insider topic 1}}
- {{Insider topic 2}}  
- {{Insider topic 3}}

I can provide real examples and data that most people don't have access to.

Would any of these interest your readers?

Best,
{{inbox.name}}`
    },
    {
      id: 32,
      category: 'guest-post',
      title: 'Guest Post Case Study',
      subject: 'Case study: How we achieved {{result}}',
      body: `Hi {{prospect.first_name}},

Your audience seems to love actionable content based on real results. I noticed your recent article on {{topic}} generated great engagement.

I'd like to share a detailed case study showing how we achieved {{specific result}} using {{method/strategy}}.

The case study would include:
- Complete strategy breakdown
- Step-by-step implementation process
- Actual results and metrics  
- What we'd do differently
- Templates and resources used

This is real data from a live project, not theoretical advice.

Would your readers find this valuable?

Thanks,
{{inbox.name}}`
    },
    {
      id: 33,
      category: 'guest-post',
      title: 'Guest Post Tool Introduction',
      subject: 'Introducing a new {{tool type}} for your readers',
      body: `Hey {{prospect.first_name}},

I've been developing a {{tool type}} that solves a common problem your readers face: {{problem}}.

Rather than just pitching the tool, I'd love to write a comprehensive guest post for {{website}} that covers:

- The problem and why existing solutions fall short
- Our approach to solving it
- Behind-the-scenes look at the development process
- Free access for your readers
- Alternative solutions for different use cases

The focus would be educational first, with the tool as supporting material.

Would this type of content interest your audience?

Best,
{{inbox.name}}`
    },
    {
      id: 34,
      category: 'guest-post',
      title: 'Guest Post Trend Analysis',
      subject: '{{Current year}} trends in {{industry}} - guest post idea',
      body: `Hello {{prospect.first_name}},

As we head into {{current year}}, I've been analyzing emerging trends in {{industry}} based on data from {{data sources}}.

Some interesting patterns are emerging that your readers would likely find valuable, especially around {{trend 1}} and {{trend 2}}.

I'd love to write a comprehensive trend analysis for {{website}} covering:

- 5 key trends shaping {{industry}}
- Data backing each trend
- Practical implications for businesses
- Actionable steps readers can take
- Predictions for {{next year}}

This would be exclusive to your audience and could serve as a great resource for planning.

Interested?

Best regards,
{{inbox.name}}`
    },
    {
      id: 35,
      category: 'guest-post',
      title: 'Guest Post Comparison',
      subject: 'Ultimate comparison guide for your readers',
      body: `Hi {{prospect.first_name}},

I notice your readers often ask about choosing between different {{tools/strategies/approaches}} based on the comments on your recent posts.

I spent considerable time testing {{number}} different {{solutions}} and documented everything in a comprehensive comparison guide.

The post would include:
- Side-by-side feature comparisons
- Real-world testing results
- Pricing analysis
- Use case recommendations
- Implementation difficulty ratings

I think this could save your readers hours of research and provide ongoing value.

Would this be helpful for your audience?

Thanks,
{{inbox.name}}`
    },
    {
      id: 36,
      category: 'guest-post',
      title: 'Guest Post Interview Series',
      subject: 'Expert interview series - guest post idea',
      body: `Hey {{prospect.first_name}},

I've been conducting interviews with leading {{industry}} experts and have some fascinating insights to share.

I'd love to turn these into a guest post series for {{website}}, featuring interviews with:
- {{Expert 1}} from {{Company 1}}
- {{Expert 2}} from {{Company 2}}  
- {{Expert 3}} from {{Company 3}}

Each interview reveals unique strategies and lessons learned from years of experience in {{field}}.

The first post would focus on {{specific topic}} and include exclusive quotes and insights not available elsewhere.

Would your readers enjoy this type of expert-driven content?

Best,
{{inbox.name}}`
    },
    {
      id: 37,
      category: 'guest-post',
      title: 'Guest Post Myth Busting',
      subject: 'Busting common {{topic}} myths - guest post pitch',
      body: `Hello {{prospect.first_name}},

I've noticed a lot of outdated advice circulating about {{topic}}, some of which I see people following in our industry.

I'd like to write a myth-busting article for {{website}} that addresses the most common misconceptions, including:

Myth 1: {{Common myth 1}}
Reality: {{What actually happens}}

Myth 2: {{Common myth 2}}  
Reality: {{Correct approach}}

Myth 3: {{Common myth 3}}
Reality: {{Updated best practice}}

I'd back each point with current data and real examples from my work with {{number}} clients.

Think your readers would appreciate having these misconceptions cleared up?

Best regards,
{{inbox.name}}`
    },
    {
      id: 38,
      category: 'guest-post',
      title: 'Guest Post Process Deep-Dive',
      subject: 'Behind-the-scenes: Our {{process}} breakdown',
      body: `Hi {{prospect.first_name}},

Your readers seem to love detailed, actionable content. I noticed your recent process-focused articles get great engagement.

I'd like to share our complete {{process}} that we've refined over {{time period}} working with {{client types}}.

The post would include:
- Complete step-by-step breakdown
- Exact templates and checklists we use
- Common pitfalls and how to avoid them
- Real metrics from implementation
- Scaled vs. startup approaches

This is our actual internal process, not generic advice.

Would this level of detail be valuable for your audience?

Thanks,
{{inbox.name}}`
    },
    {
      id: 39,
      category: 'guest-post',
      title: 'Guest Post Personal Journey',
      subject: 'My journey from {{starting point}} to {{end point}}',
      body: `Hey {{prospect.first_name}},

I've been following {{website}} for a while and love how you share authentic, personal stories alongside practical advice.

I'd like to share my journey from {{starting point}} to {{current achievement}} - including all the mistakes, lessons learned, and turning points along the way.

The story includes:
- Major failures and what I learned
- Key decisions that changed everything
- Specific strategies that worked (and didn't)
- Resources that made the difference
- Advice for others starting the same journey

I think your readers would relate to the struggles and find the lessons valuable.

What do you think?

Best,
{{inbox.name}}`
    },
    {
      id: 40,
      category: 'guest-post',
      title: 'Guest Post Beginner\'s Guide',
      subject: 'Complete beginner\'s guide to {{topic}}',
      body: `Hello {{prospect.first_name}},

I notice many of your readers are looking for beginner-friendly guidance on {{topic}} based on the questions in your comments.

I'd love to create the ultimate beginner's guide that covers everything someone needs to know to get started:

- Essential concepts explained simply
- Step-by-step getting started process
- Common beginner mistakes to avoid
- Free tools and resources for starting out
- When to invest in paid solutions
- How to measure progress

I'll make sure it's comprehensive but not overwhelming.

Would this help fill a gap for your audience?

Best regards,
{{inbox.name}}`
    },
    {
      id: 41,
      category: 'guest-post',
      title: 'Guest Post Advanced Strategies',
      subject: 'Advanced {{topic}} strategies for your experienced readers',
      body: `Hi {{prospect.first_name}},

While browsing {{website}}, I noticed you have readers at various skill levels. Your foundational content is excellent, but I think your advanced audience might appreciate some expert-level strategies.

I'd like to write an advanced guide covering:
- Complex strategies most people don't know
- Enterprise-level implementation approaches  
- Advanced metrics and analysis techniques
- Scaling strategies for larger organizations
- Integration with other advanced systems

This would complement your existing content while serving readers ready for the next level.

Interested in this type of advanced content?

Thanks,
{{inbox.name}}`
    },
    {
      id: 42,
      category: 'guest-post',
      title: 'Guest Post Industry Prediction',
      subject: 'Where {{industry}} is heading in {{year}} - exclusive insights',
      body: `Hey {{prospect.first_name}},

Based on my work with {{number}} companies in {{industry}} and analysis of emerging patterns, I have some predictions about where our industry is heading.

I'd love to share these insights exclusively with your readers in a forward-looking piece that covers:

- 5 major shifts happening right now
- Technologies that will reshape {{industry}}
- Skills professionals need to develop
- Opportunities emerging from these changes
- How to prepare your business/career

This would be based on real data and insider insights, not speculation.

Would your readers value this type of strategic thinking?

Best,
{{inbox.name}}`
    },
    {
      id: 43,
      category: 'guest-post',
      title: 'Guest Post Problem-Solution',
      subject: 'Solving the biggest {{industry}} challenge',
      body: `Hello {{prospect.first_name}},

Every conversation I have with {{industry}} professionals comes back to the same challenge: {{specific problem}}.

I've developed a systematic approach to solving this that I've tested with {{number}} clients. The results have been consistently positive.

I'd like to share this solution with your readers through a detailed guide that includes:

- Why this problem is so persistent
- Our step-by-step solution framework
- Real implementation examples
- Metrics showing improvement
- Adaptations for different business sizes

This addresses what I believe is the #1 challenge your readers face.

Would this be valuable for your audience?

Best regards,
{{inbox.name}}`
    },
    {
      id: 44,
      category: 'guest-post',
      title: 'Guest Post Resource Compilation',
      subject: 'Ultimate {{topic}} resource compilation for your readers',
      body: `Hi {{prospect.first_name}},

Over the past {{time period}}, I've been compiling and testing every {{topic}} resource I can find. I've now tested over {{number}} tools, guides, and strategies.

I'd love to share this research with your readers in the form of the ultimate resource compilation:

- Top 10 tools actually worth using
- Best free resources for each skill level
- Hidden gems most people don't know about
- Detailed comparison charts
- When to use each resource
- Cost-benefit analysis

This could save your readers dozens of hours of research.

Interested in this comprehensive resource?

Thanks,
{{inbox.name}}`
    },
    {
      id: 45,
      category: 'guest-post',
      title: 'Guest Post Seasonal Strategy',
      subject: '{{Season/Holiday}} {{topic}} strategies for your readers',
      body: `Hey {{prospect.first_name}},

With {{season/holiday}} approaching, I've been helping clients prepare their {{topic}} strategies for this unique time period.

I'd love to share these seasonal insights with your readers:

- How {{season/holiday}} changes {{topic}} dynamics
- Specific strategies that work during this period
- Common mistakes to avoid
- Timeline for implementation
- Case studies from previous years
- Preparation checklist

This would be timely and actionable for your audience.

Would seasonal strategy content be valuable?

Best,
{{inbox.name}}`
    },
    {
      id: 46,
      category: 'guest-post',
      title: 'Guest Post Framework Introduction',
      subject: 'New framework for {{topic}} - exclusive for your readers',
      body: `Hello {{prospect.first_name}},

I've developed a framework for {{topic}} that I've been testing with clients over the past {{time period}}. The results have been impressive - {{specific result}}.

I'd like to introduce this framework to your readers through a comprehensive guest post:

- The problems with current approaches
- How our framework addresses these issues
- Step-by-step implementation guide
- Case studies and results
- Free templates and tools
- Adaptation for different situations

This would be the first public introduction of this methodology.

Would your readers be interested in a new approach to {{topic}}?

Best regards,
{{inbox.name}}`
    },
    {
      id: 47,
      category: 'guest-post',
      title: 'Guest Post Collaboration Idea',
      subject: 'Collaboration idea: {{joint topic}} deep-dive',
      body: `Hi {{prospect.first_name}},

I've been thinking about how {{your expertise}} and {{their expertise}} complement each other perfectly for addressing {{shared topic}}.

Would you be interested in collaborating on a comprehensive guest post that combines our expertise?

I could cover {{your part}} while you handle {{their part}}, creating something more valuable than either of us could produce alone.

The post could include:
- Dual perspectives on the same challenge
- Integration strategies
- Real examples from both approaches
- Joint recommendations

This would be unique content that showcases both of our expertise.

What do you think about this collaboration?

Best,
{{inbox.name}}`
    },

    // Skyscraper Templates (8 templates)
    {
      id: 48,
      category: 'skyscraper',
      title: 'Bigger and Better',
      subject: 'Bigger and better',
      body: `Hello {{prospect.first_name}},

I was going through your articles at {{Their website}} and came across this page: {{article name}}.

I noticed that in it you linked to one of my favorite articles ever: {{article name}}.

It's an awesome piece of content, and it actually inspired me to write something bigger and better. {{Your post's URL}}

I like {{the name of the author of the article they linked to}}'s work, but it is a little outdated and lacks a few critical details.

So, I think my article on {{topic}} will make a good addition to your page since it is more recent and more informative.

Let me know what you think,
{{inbox.name}}`
    },
    {
      id: 49,
      category: 'skyscraper',
      title: 'Room for Improvement',
      subject: 'Room for improvement',
      body: `Hello {{prospect.first_name}},

I was reading through your articles on {{topic}} and one specific article caught my attention: {{article name}}.

It is linking to one of my all-time favorite posts. In fact, when I first read it, it inspired me to write something even more wholesome and informative.

You've probably already guessed what I'm leading to. My post on {{topic}} is essentially the same thing, just more up-to-date and covers a few things that the original didn't.

It might be a good addition to your resource.

Anyhow, keep up the good work!

Cheers,
{{inbox.name}}`
    },
    {
      id: 50,
      category: 'skyscraper',
      title: 'Enhanced Version',
      subject: 'Enhanced version of {{resource they linked to}}',
      body: `Hi {{prospect.first_name}},

I was reading your excellent article on {{topic}} and noticed you linked to {{original resource}}.

That's actually one of my favorite resources on the topic! It inspired me to create an enhanced version that includes:

- Updated data from {{current year}}
- {{number}} additional strategies
- Interactive tools and templates
- Video explanations for complex concepts

Here it is: {{your URL}}

I think your readers would appreciate the additional depth and current information.

What do you think?

{{inbox.name}}`
    },
    {
      id: 51,
      category: 'skyscraper',
      title: 'Comprehensive Update',
      subject: 'More comprehensive version available',
      body: `Hey {{prospect.first_name}},

I came across your {{topic}} article and love how you've curated the resources, especially the link to {{original resource}}.

I recently created a much more comprehensive version of that resource that includes:

- Everything from the original plus {{additional content}}
- Real-world examples from {{number}} companies
- Step-by-step implementation guides
- Common pitfalls and how to avoid them

Check it out: {{your URL}}

It might be a valuable update for your readers who want more depth.

Best,
{{inbox.name}}`
    },
    {
      id: 52,
      category: 'skyscraper',
      title: 'Modern Take',
      subject: 'Modern take on {{topic}}',
      body: `Hello {{prospect.first_name}},

Your article on {{topic}} provides excellent foundational information. I noticed you reference {{older resource}}, which was groundbreaking when it was published.

I've created a modern version that adapts those principles for today's landscape:

{{your URL}}

Key updates include:
- Adaptation for current {{platform/technology}} changes
- New case studies from {{current year}}
- Updated best practices
- Integration with modern tools

It honors the original while making it relevant for today's audience.

Worth considering as an additional resource?

Thanks,
{{inbox.name}}`
    },
    {
      id: 53,
      category: 'skyscraper',
      title: 'Data-Rich Version',
      subject: 'Data-rich version of {{topic}} guide',
      body: `Hi {{prospect.first_name}},

I appreciate how you linked to {{original resource}} in your {{topic}} article. It's a solid foundation for understanding the concepts.

I recently published a data-rich version based on analysis of {{sample size}} real examples:

{{your URL}}

While the original focuses on theory, mine includes:
- Statistical analysis of what actually works
- Performance benchmarks by industry
- ROI calculations and projections
- Failure rate analysis

This adds a quantitative layer to the qualitative insights.

Might be valuable for your data-driven readers?

Best regards,
{{inbox.name}}`
    },
    {
      id: 54,
      category: 'skyscraper',
      title: 'Interactive Version',
      subject: 'Interactive version of {{resource}}',
      body: `Hey {{prospect.first_name}},

Loved your {{topic}} guide and the resources you've compiled, particularly {{original resource}}.

I took inspiration from that piece and created an interactive version:

{{your URL}}

Instead of just reading about the concepts, users can:
- Use calculators to estimate results
- Access customizable templates
- Follow guided step-by-step processes
- Download personalized recommendations

It transforms static advice into actionable tools.

Think your readers would enjoy this hands-on approach?

{{inbox.name}}`
    },
    {
      id: 55,
      category: 'skyscraper',
      title: 'Industry-Specific Version',
      subject: '{{Industry}}-specific version of {{topic}} guide',
      body: `Hello {{prospect.first_name}},

Your {{topic}} resource list is excellent, especially the link to {{original resource}}.

Since your audience includes many {{industry}} professionals, I created an industry-specific version that addresses unique challenges in that sector:

{{your URL}}

It includes:
- {{Industry}}-specific case studies
- Regulatory considerations for {{industry}}
- Vendor recommendations for {{industry}}
- Budget guidelines based on {{industry}} standards

This provides the same great framework but with relevant context.

Would this industry focus be valuable for your readers?

Best,
{{inbox.name}}`
    },

    // Link Insertion Templates (8 templates)
    {
      id: 56,
      category: 'link-insertion',
      title: 'Simple Link Insertion',
      subject: 'Great addition to your {{topic}} article',
      body: `Hi {{prospect.first_name}},

I was reading your article on {{topic}} and found it extremely helpful, especially the section on {{specific section}}.

I think your readers would benefit from additional information on {{subtopic}}, which complements your existing content perfectly.

I recently published a comprehensive guide on this exact topic: {{your URL}}

It covers {{key points}} that would add value to your article without overlapping with what you've already covered.

Would you consider adding it as an additional resource?

Thanks,
{{inbox.name}}`
    },
    {
      id: 57,
      category: 'link-insertion',
      title: 'Complementary Resource',
      subject: 'Complementary resource for your {{article title}}',
      body: `Hello {{prospect.first_name}},

Your article "{{article title}}" is incredibly thorough! I especially appreciated your insights on {{specific point}}.

I noticed you focused on {{their focus area}} but didn't cover {{your focus area}}, which is closely related and often the next step readers need.

I have a detailed guide that covers exactly that: {{your URL}}

It includes:
- {{complementary point 1}}
- {{complementary point 2}}
- {{complementary point 3}}

This could provide additional value for readers who want to take the next step.

Would you consider linking to it in your article?

Best regards,
{{inbox.name}}`
    },
    {
      id: 58,
      category: 'link-insertion',
      title: 'Supporting Data',
      subject: 'Supporting data for your {{topic}} claims',
      body: `Hey {{prospect.first_name}},

I was reading your excellent piece on {{topic}} and particularly liked your point about {{specific claim}}.

I actually have research that supports this claim with concrete data. My study of {{sample size}} showed {{supporting statistic}}.

Here's the full research: {{your URL}}

It provides statistical backing for several points you made and might strengthen your article for readers who like to see data behind the advice.

Thought you might find it useful to reference.

Best,
{{inbox.name}}`
    },
    {
      id: 59,
      category: 'link-insertion',
      title: 'Tool Suggestion',
      subject: 'Tool recommendation for your {{topic}} guide',
      body: `Hi {{prospect.first_name}},

Your {{topic}} guide is fantastic! I've already implemented several of your suggestions.

I noticed you mention the importance of {{task}} but didn't recommend specific tools for accomplishing it.

I built a free tool that makes this process much easier: {{your URL}}

It's been used by {{number}}+ people and automates the {{specific process}} you described in your article.

Would this be a valuable addition for readers looking for implementation tools?

Thanks,
{{inbox.name}}`
    },
    {
      id: 60,
      category: 'link-insertion',
      title: 'Case Study Addition',
      subject: 'Real-world example for your {{topic}} article',
      body: `Hello {{prospect.first_name}},

Your article on {{topic}} provides excellent strategic guidance. The frameworks you outlined are spot-on.

I think your readers would benefit from seeing these strategies in action. I have a detailed case study showing how we implemented your approach and achieved {{specific result}}.

Here it is: {{your URL}}

It includes:
- Step-by-step implementation of your strategy
- Challenges we encountered and solutions
- Actual results and metrics
- What we learned and would do differently

This could give readers confidence that your approach works in practice.

Would you consider adding it as a real-world example?

Best,
{{inbox.name}}`
    },
    {
      id: 61,
      category: 'link-insertion',
      title: 'Template Offer',
      subject: 'Free templates for your {{topic}} readers',
      body: `Hi {{prospect.first_name}},

I loved your {{topic}} article, especially how actionable you made the advice.

I created templates that help readers implement your strategies more easily:

{{your URL}}

The templates include:
- {{template 1}}
- {{template 2}}
- {{template 3}}

These would save your readers time and ensure they implement your advice correctly.

Would these be helpful to mention in your article?

Thanks,
{{inbox.name}}`
    },
    {
      id: 62,
      category: 'link-insertion',
      title: 'Updated Information',
      subject: 'Updated information for your {{topic}} article',
      body: `Hey {{prospect.first_name}},

Your {{topic}} article is one of the most comprehensive I've found on the subject.

I noticed it was published in {{publication date}} and some of the information has evolved since then, particularly around {{specific area}}.

I have an updated analysis of this area: {{your URL}}

It includes:
- Current best practices for {{specific area}}
- What's changed since {{original date}}
- New opportunities and challenges
- Updated recommendations

This could help keep your excellent article current.

Worth considering as an update?

Best regards,
{{inbox.name}}`
    },
    {
      id: 63,
      category: 'link-insertion',
      title: 'Deep Dive Addition',
      subject: 'Deep dive into {{subtopic}} for your readers',
      body: `Hello {{prospect.first_name}},

Your {{topic}} guide covers all the essential points beautifully. I particularly appreciated how you explained {{complex concept}} in simple terms.

I noticed you touched on {{subtopic}} briefly but didn't have space to go deep on it. Since this is a common sticking point for many people, I wrote a detailed deep-dive:

{{your URL}}

It explores:
- Advanced techniques for {{subtopic}}
- Common mistakes and how to avoid them
- Expert-level implementation tips
- Troubleshooting guide

This could serve readers who want to master that particular aspect.

Would this be a useful addition to reference?

Best,
{{inbox.name}}`
    },

    // Follow-Up Templates (15 templates)
    {
      id: 64,
      category: 'follow-ups',
      title: 'Gentle Nudge',
      subject: 'Following up on my email',
      body: `Hi {{prospect.first_name}},

I wanted to follow up on my previous email about {{brief reminder of what you offered}}.

I know you're probably busy, but I thought this might be valuable for your readers since {{specific reason}}.

No pressure at all - just wanted to make sure my email didn't get lost in your inbox!

Best regards,
{{inbox.name}}`
    },
    {
      id: 65,
      category: 'follow-ups',
      title: 'Additional Value Follow-Up',
      subject: 'One more thing for your readers',
      body: `Hi {{prospect.first_name}},

I sent you an email last week about {{original offer}}, but I wanted to share something else that might be even more valuable for your audience.

I just finished {{new resource/case study/tool}} that shows {{specific benefit}}.

Since your readers are interested in {{their audience interest}}, I thought this might be a perfect fit.

Would you like me to send over the details?

Thanks,
{{inbox.name}}`
    },
    {
      id: 66,
      category: 'follow-ups',
      title: 'Social Proof Follow-Up',
      subject: 'Quick update on the {{resource}} I mentioned',
      body: `Hey {{prospect.first_name}},

I reached out last week about {{original resource}} and thought you might be interested in a quick update.

Since I sent that email, {{social proof update}} - it's been shared by {{notable people/companies}} and has gotten some great feedback.

Here's what {{notable person}} said about it: "{{testimonial}}"

Given the positive response, I thought it might be even more valuable for your readers now.

Still worth considering?

Best,
{{inbox.name}}`
    },
    {
      id: 67,
      category: 'follow-ups',
      title: 'Timing Follow-Up',
      subject: 'Perfect timing for {{topic}}',
      body: `Hi {{prospect.first_name}},

I noticed you just published a new article about {{recent topic}}. Great timing!

This actually relates perfectly to the {{resource/idea}} I mentioned last week about {{original topic}}.

Given your readers' current interest in {{recent topic}}, the {{resource}} might be even more relevant now.

Here it is again: {{your URL}}

Worth a second look?

Thanks,
{{inbox.name}}`
    },
    {
      id: 68,
      category: 'follow-ups',
      title: 'Data Update Follow-Up',
      subject: 'New data supports the {{resource}} I mentioned',
      body: `Hello {{prospect.first_name}},

I reached out recently about {{original resource}}. Since then, I've gathered more data that makes it even more compelling.

The latest findings show {{new data point}}, which strongly supports the approach I outlined.

This makes the resource more valuable than when I first contacted you: {{your URL}}

Thought you'd appreciate the additional validation.

Best regards,
{{inbox.name}}`
    },
    {
      id: 69,
      category: 'follow-ups',
      title: 'Success Story Follow-Up',
      subject: 'Success story from the {{resource}} I shared',
      body: `Hi {{prospect.first_name}},

I wanted to share a quick success story related to the {{resource}} I mentioned last week.

{{Company/Person name}} implemented the strategies from the resource and achieved {{specific result}} in just {{timeframe}}.

Here's what they said: "{{testimonial}}"

This real-world validation might make the resource more interesting for your readers: {{your URL}}

Worth reconsidering?

Thanks,
{{inbox.name}}`
    },
    {
      id: 70,
      category: 'follow-ups',
      title: 'Industry Event Follow-Up',
      subject: 'Great discussion at {{event}} about {{topic}}',
      body: `Hey {{prospect.first_name}},

I just got back from {{industry event}} where {{topic}} was a major discussion point. Your name came up several times as someone producing quality content on the subject!

This reminded me of the {{resource}} I shared with you last week. Given the industry conversation around this topic, it might be timely for your readers.

The resource addresses exactly what people were discussing: {{your URL}}

Thought the timing might be perfect now.

Best,
{{inbox.name}}`
    },
    {
      id: 71,
      category: 'follow-ups',
      title: 'Competitor Mention Follow-Up',
      subject: 'Saw {{competitor}} covered similar topic',
      body: `Hi {{prospect.first_name}},

I noticed {{competitor}} just published something on {{similar topic}} - seems like there's definitely reader interest in this area.

This makes me think the {{resource}} I shared last week might be even more relevant for your audience now.

While their approach focused on {{their approach}}, my resource covers {{your unique angle}}: {{your URL}}

Could be a good way to provide a different perspective on a trending topic.

What do you think?

{{inbox.name}}`
    },
    {
      id: 72,
      category: 'follow-ups',
      title: 'Personal Connection Follow-Up',
      subject: 'Quick personal note about {{topic}}',
      body: `Hello {{prospect.first_name}},

I've been thinking about our potential collaboration and realized I should share why this topic is personally important to me.

{{Personal story/connection to topic}}

This experience is what drove me to create the {{resource}} I mentioned: {{your URL}}

I genuinely believe it could help your readers avoid the same challenges I faced.

Worth exploring?

Best regards,
{{inbox.name}}`
    },
    {
      id: 73,
      category: 'follow-ups',
      title: 'Limited Time Follow-Up',
      subject: 'Brief window for {{opportunity}}',
      body: `Hi {{prospect.first_name}},

I wanted to follow up about the {{resource/opportunity}} I mentioned because there's a brief window where this would be most valuable.

{{Reason for urgency - seasonal, trending topic, etc.}}

The {{resource}} I shared addresses this perfectly: {{your URL}}

Would love to help your readers take advantage of this timing.

Let me know if you're interested!

Thanks,
{{inbox.name}}`
    },
    {
      id: 74,
      category: 'follow-ups',
      title: 'Reader Question Follow-Up',
      subject: 'Reader question related to {{resource}}',
      body: `Hey {{prospect.first_name}},

I was reading the comments on your recent {{article}} post and noticed someone asked about {{specific question}}.

This is exactly what the {{resource}} I shared last week addresses! It includes a detailed section on {{relevant section}}.

Here it is again: {{your URL}}

Might be perfect for answering that reader's question and helping others with the same issue.

Best,
{{inbox.name}}`
    },
    {
      id: 75,
      category: 'follow-ups',
      title: 'Short and Sweet Follow-Up',
      subject: 'Still interested?',
      body: `Hi {{prospect.first_name}},

Quick follow-up on the {{resource}} I shared about {{topic}}.

Still interested? If not, no worries at all!

If timing isn't right now, feel free to keep it for future reference.

Thanks,
{{inbox.name}}`
    },
    {
      id: 76,
      category: 'follow-ups',
      title: 'Different Angle Follow-Up',
      subject: 'Different angle on {{topic}}',
      body: `Hello {{prospect.first_name}},

I reached out about {{original angle}} last week, but I thought of another angle that might be more interesting for your readers.

Instead of focusing on {{original angle}}, what if we approached it from the {{new angle}} perspective?

The same resource covers this angle too: {{your URL}}

This approach might fit better with your recent content themes.

What do you think?

Best regards,
{{inbox.name}}`
    },
    {
      id: 77,
      category: 'follow-ups',
      title: 'Final Follow-Up',
      subject: 'Last note about {{topic}}',
      body: `Hi {{prospect.first_name}},

This will be my last email about the {{resource}} I shared, but I wanted to say thanks for considering it.

If it's not a good fit right now, I completely understand. Feel free to keep the resource for future reference: {{your URL}}

I'll continue following your great content on {{topic}}!

Best,
{{inbox.name}}`
    },
    {
      id: 78,
      category: 'follow-ups',
      title: 'Value-Add Follow-Up',
      subject: 'Added bonus for your {{topic}} readers',
      body: `Hi {{prospect.first_name}},

Following up on my previous email about {{original resource}}.

I decided to add extra value by creating a bonus section specifically for your readers. It includes:

- {{bonus 1}}
- {{bonus 2}}
- {{bonus 3}}

This bonus content is only available through your site and makes the resource even more valuable for your audience.

Interested in this exclusive version?

Thanks,
{{inbox.name}}`
    },

    // .EDU Outreach Templates (10 templates)
    {
      id: 79,
      category: 'edu-outreach',
      title: 'Academic Resource Suggestion',
      subject: 'Academic resource for your {{topic}} page',
      body: `Dear Professor {{prospect.first_name}},

I came across your excellent {{topic}} resource page while researching for my own work in this field.

I recently published a comprehensive academic analysis of {{topic}} that might be valuable for your students: {{your URL}}

The paper includes:
- Peer-reviewed research methodology
- Statistical analysis of {{sample size}} cases
- Practical applications for students
- Extensive bibliography and citations

I believe this would complement the high-quality resources you've already compiled.

Would you consider reviewing it for potential inclusion?

Respectfully,
{{inbox.name}}`
    },
    {
      id: 80,
      category: 'edu-outreach',
      title: 'Student Resource Offer',
      subject: 'Free resource for your {{course}} students',
      body: `Hello Professor {{prospect.first_name}},

I understand you teach {{course name}} at {{university}}. I have great respect for the work you're doing in {{field}}.

I've developed a practical guide that bridges the gap between academic theory and real-world application in {{topic}}.

My resource includes:
- Case studies from actual {{industry}} scenarios
- Step-by-step implementation guides
- Templates students can use in projects
- Current industry trends and data

Here it is: {{your URL}}

This might help your students see how course concepts apply in practice.

Would you be interested in reviewing it for your students?

Best regards,
{{inbox.name}}`
    },
    {
      id: 81,
      category: 'edu-outreach',
      title: 'Research Collaboration',
      subject: 'Research collaboration opportunity in {{field}}',
      body: `Dear Dr. {{prospect.first_name}},

I've been following your research in {{field}} and found your recent paper on {{topic}} particularly insightful.

I'm currently conducting industry research on {{related topic}} and believe there could be value in connecting academic and industry perspectives.

My research includes data from {{number}} companies and reveals {{key finding}}.

Here's my preliminary analysis: {{your URL}}

Would you be interested in exploring potential collaboration or cross-referencing opportunities?

I'd welcome the chance to discuss this further.

Sincerely,
{{inbox.name}}`
    },
    {
      id: 82,
      category: 'edu-outreach',
      title: 'Industry Insights for Academia',
      subject: 'Industry insights for your {{topic}} research',
      body: `Hello Professor {{prospect.first_name}},

Your research on {{topic}} addresses questions I encounter regularly in my industry work. The theoretical framework you've developed is excellent.

I thought you might be interested in seeing how these concepts play out in practice. I've documented real-world applications and outcomes:

{{your URL}}

This includes:
- Case studies from {{number}} implementations
- Practical challenges not covered in academic literature
- Industry-specific adaptations
- Measurable outcomes and ROI data

This might provide valuable data points for future research or student discussions.

Best regards,
{{inbox.name}}`
    },
    {
      id: 83,
      category: 'edu-outreach',
      title: 'Guest Lecture Offer',
      subject: 'Guest lecture opportunity for your {{course}} class',
      body: `Dear Professor {{prospect.first_name}},

I've been working in {{industry}} for {{years}} and have deep appreciation for the academic foundation you provide students in {{field}}.

I'd be honored to offer a guest lecture for your {{course}} students on how {{topic}} concepts apply in professional settings.

I could cover:
- Real-world case studies
- Career paths in {{field}}
- Industry trends affecting the field
- How to translate academic knowledge to professional success

I've also created resources your students might find helpful: {{your URL}}

Would this type of industry perspective be valuable for your curriculum?

Respectfully,
{{inbox.name}}`
    },
    {
      id: 84,
      category: 'edu-outreach',
      title: 'Data Sharing Offer',
      subject: 'Industry data for your {{topic}} research',
      body: `Hello Dr. {{prospect.first_name}},

I've been following your research methodology in {{field}} and admire your rigorous approach to data analysis.

I have access to industry data that might support your research:
- {{type of data}} from {{number}} companies
- {{time period}} of performance metrics
- Segmentation by {{relevant categories}}

Here's a sample of the insights: {{your URL}}

If this data would be helpful for your research, I'd be happy to discuss sharing arrangements that meet academic standards.

Would this be of interest?

Best regards,
{{inbox.name}}`
    },
    {
      id: 85,
      category: 'edu-outreach',
      title: 'Curriculum Resource',
      subject: 'Curriculum resource for {{course}} students',
      body: `Dear Professor {{prospect.first_name}},

I see that you're teaching {{course}} this semester. Having worked in {{industry}} for several years, I understand the challenges students face applying theoretical knowledge in practice.

I've created a comprehensive resource that serves as a bridge between academia and industry:

{{your URL}}

It includes:
- Glossary of industry terms
- Real-world problem sets
- Interview preparation guides
- Professional network building strategies

This could supplement your excellent curriculum with practical application context.

Would you like to review it for potential course integration?

Sincerely,
{{inbox.name}}`
    },
    {
      id: 86,
      category: 'edu-outreach',
      title: 'Alumni Success Stories',
      subject: 'Alumni success story for your students',
      body: `Hello Professor {{prospect.first_name}},

As a {{university}} alumnus, I wanted to share how the foundation you provided in {{course}} has shaped my career in {{industry}}.

I've documented my journey from graduation to {{current position}}, including:
- How course concepts apply in my daily work
- Skills that proved most valuable
- Advice for current students
- Career progression insights

Here's my story: {{your URL}}

I thought current students might find it encouraging and informative to see the long-term value of their studies.

Would this be helpful to share with your students?

Best regards,
{{inbox.name}} (Class of {{graduation year}})`
    },
    {
      id: 87,
      category: 'edu-outreach',
      title: 'Professional Development Resource',
      subject: 'Professional development resource for your students',
      body: `Dear Professor {{prospect.first_name}},

I've observed that many students excel academically but need guidance on professional development in {{field}}.

I've created a comprehensive professional development guide specifically for {{field}} students:

{{your URL}}

It covers:
- Resume optimization for {{industry}}
- Interview strategies and common questions
- Professional networking in {{field}}
- First-year career navigation
- Long-term career planning

This addresses the gap between academic achievement and professional success.

Would your students find this valuable?

Best regards,
{{inbox.name}}`
    },
    {
      id: 88,
      category: 'edu-outreach',
      title: 'Research Publication Opportunity',
      subject: 'Publication opportunity in {{journal/publication}}',
      body: `Hello Dr. {{prospect.first_name}},

Your research on {{topic}} would be highly valuable to industry practitioners. I'm wondering if you'd consider adapting it for publication in {{industry publication}}.

As someone who bridges academia and industry, I could help translate the research for a practitioner audience while maintaining academic rigor.

I've also compiled supporting industry data that could strengthen the publication: {{your URL}}

This could help your research reach a broader audience and increase its real-world impact.

Would this type of collaboration interest you?

Sincerely,
{{inbox.name}}`
    },

    // Infographic Outreach Templates (8 templates)
    {
      id: 89,
      category: 'infographic',
      title: 'Visual Resource Offer',
      subject: 'Visual resource for your {{topic}} article',
      body: `Hi {{prospect.first_name}},

I really enjoyed your article on {{topic}}. The data you presented about {{specific data}} was particularly eye-opening.

I created an infographic that visualizes similar data points in an easy-to-digest format: {{your URL}}

It includes:
- Key statistics from {{data sources}}
- Visual comparison charts
- Step-by-step process flows
- Industry benchmarks

This might be a nice visual complement to your text-based content.

Would your readers find this useful?

Best,
{{inbox.name}}`
    },
    {
      id: 90,
      category: 'infographic',
      title: 'Data Visualization',
      subject: 'Data visualization for {{topic}}',
      body: `Hello {{prospect.first_name}},

Your research on {{topic}} presents fascinating insights. I thought your audience might appreciate seeing this data in visual format.

I created an infographic that turns the key findings into engaging visuals: {{your URL}}

The infographic covers:
- {{key statistic 1}}
- {{key statistic 2}}
- {{key statistic 3}}
- Trend analysis over {{time period}}

Visual learners in your audience might find this particularly helpful.

Interested in sharing it with your readers?

Thanks,
{{inbox.name}}`
    },
    {
      id: 91,
      category: 'infographic',
      title: 'Process Infographic',
      subject: 'Process visualization for your {{topic}} guide',
      body: `Hi {{prospect.first_name}},

Your step-by-step guide to {{topic}} is incredibly detailed and helpful. 

I created a visual representation of the process that might help readers follow along more easily: {{your URL}}

The infographic shows:
- Each step in your process visually
- Decision points and branches
- Common pitfalls to avoid
- Success indicators

This could serve as a handy reference sheet for your readers.

What do you think?

Best regards,
{{inbox.name}}`
    },
    {
      id: 92,
      category: 'infographic',
      title: 'Comparison Infographic',
      subject: 'Comparison infographic for your {{topic}} analysis',
      body: `Hey {{prospect.first_name}},

I loved your comparison of different {{tools/approaches/strategies}} for {{topic}}. The analysis was thorough and fair.

I thought your readers might appreciate a visual comparison chart: {{your URL}}

The infographic includes:
- Side-by-side feature comparisons
- Pricing visualization
- Pros and cons for each option
- Use case recommendations

This could make the decision-making process easier for your readers.

Worth adding to your article?

Thanks,
{{inbox.name}}`
    },
    {
      id: 93,
      category: 'infographic',
      title: 'Timeline Infographic',
      subject: 'Timeline visualization for {{topic}}',
      body: `Hello {{prospect.first_name}},

Your historical overview of {{topic}} provides excellent context for understanding current trends.

I created a timeline infographic that visualizes this evolution: {{your URL}}

It shows:
- Key milestones in {{topic}} development
- Important dates and events
- Evolution of best practices
- Future predictions

This could help readers quickly grasp the historical progression you described.

Interested in sharing it?

Best,
{{inbox.name}}`
    },
    {
      id: 94,
      category: 'infographic',
      title: 'Statistics Infographic',
      subject: 'Key statistics from your {{topic}} research',
      body: `Hi {{prospect.first_name}},

The statistics in your {{topic}} article tell a compelling story about industry trends.

I compiled the most striking numbers into a shareable infographic: {{your URL}}

Key stats included:
- {{impressive statistic 1}}
- {{impressive statistic 2}}
- {{impressive statistic 3}}
- Industry projections for {{year}}

This could be great for social media sharing and help spread your research further.

What do you think?

{{inbox.name}}`
    },
    {
      id: 95,
      category: 'infographic',
      title: 'Checklist Infographic',
      subject: 'Visual checklist for your {{topic}} guide',
      body: `Hey {{prospect.first_name}},

Your {{topic}} checklist is comprehensive and practical. I thought your readers might appreciate a visual version they can print and use.

I created an infographic checklist: {{your URL}}

It includes:
- All your checklist items with checkboxes
- Priority levels for each item
- Visual icons for easy scanning
- Print-friendly format

This could help readers actually implement your advice rather than just reading about it.

Worth considering?

Best,
{{inbox.name}}`
    },
    {
      id: 96,
      category: 'infographic',
      title: 'Survey Results Infographic',
      subject: 'Visual representation of your survey findings',
      body: `Hello {{prospect.first_name}},

The survey results in your {{topic}} article reveal some surprising insights about our industry.

I created an infographic that makes these findings more visually compelling: {{your URL}}

The visual includes:
- Key survey statistics with charts
- Demographic breakdowns
- Surprising findings highlighted
- Year-over-year comparisons

This could help the important findings from your survey reach a wider audience.

Interested in using it?

Best regards,
{{inbox.name}}`
    },

    // Link Reclamation Templates (8 templates)
    {
      id: 97,
      category: 'link-reclamation',
      title: 'Unlinked Mention',
      subject: 'Quick link suggestion for your {{article}}',
      body: `Hi {{prospect.first_name}},

I noticed you mentioned {{your company/brand}} in your article about {{topic}}. Thank you for the reference!

I noticed the mention doesn't link back to our site. Would you mind adding a link to help readers find more information?

Here's the relevant page: {{your URL}}

Thanks for the mention, and great article by the way!

Best,
{{inbox.name}}`
    },
    {
      id: 98,
      category: 'link-reclamation',
      title: 'Brand Mention Follow-Up',
      subject: 'Thanks for mentioning {{your brand}}!',
      body: `Hello {{prospect.first_name}},

I just discovered that you mentioned {{your brand/company}} in your recent article on {{topic}}. 

We really appreciate the mention! Would it be possible to add a link to our {{relevant page}} so readers can learn more about {{what you do}}?

Here's the link: {{your URL}}

Thanks for thinking of us in your article!

Best regards,
{{inbox.name}}`
    },
    {
      id: 99,
      category: 'link-reclamation',
      title: 'Tool Mention Reclamation',
      subject: 'Link suggestion for {{your tool}} mention',
      body: `Hi {{prospect.first_name}},

Great article on {{topic}}! I noticed you mentioned {{your tool}} as one of the recommended solutions.

Since readers might want to try it out, would you mind linking to our main page where they can sign up for free?

Here's the link: {{your URL}}

Thanks for the recommendation!

{{inbox.name}}`
    },
    {
      id: 100,
      category: 'link-reclamation',
      title: 'Research Citation',
      subject: 'Link to original research you cited',
      body: `Hello {{prospect.first_name}},

Thank you for citing our research on {{topic}} in your excellent article. We're honored to be included in your analysis.

I noticed the citation doesn't link back to the original research. Would you consider adding a link so readers can access the full study?

Here's the direct link to the research: {{your URL}}

This would help readers who want to dive deeper into the methodology and findings.

Thanks again for the citation!

Best,
{{inbox.name}}`
    },
    {
      id: 101,
      category: 'link-reclamation',
      title: 'Company Profile Mention',
      subject: 'Link addition for company profile mention',
      body: `Hi {{prospect.first_name}},

I was thrilled to see {{your company}} featured in your article about {{topic}}. The write-up was accurate and well-researched.

Would it be possible to add a link to our website so readers can learn more about our work in {{field}}?

Here's our main page: {{your URL}}

We'd really appreciate helping readers find us more easily.

Thanks for the great coverage!

{{inbox.name}}`
    },
    {
      id: 102,
      category: 'link-reclamation',
      title: 'Expert Quote Reclamation',
      subject: 'Link addition for expert quote',
      body: `Hello {{prospect.first_name}},

Thank you for including my quote about {{topic}} in your recent article. I'm glad my perspective was valuable to your readers.

Would you mind adding a link to my {{relevant page/bio/company}} so readers can learn more about my background in {{field}}?

Here's the link: {{your URL}}

Thanks again for the opportunity to contribute to your article!

Best regards,
{{inbox.name}}`
    },
    {
      id: 103,
      category: 'link-reclamation',
      title: 'Case Study Mention',
      subject: 'Link to full case study you mentioned',
      body: `Hi {{prospect.first_name}},

Great article on {{topic}}! I noticed you referenced our case study about {{case study topic}}.

Since some readers might want to see the complete case study with all the data and methodology, would you consider linking to the full version?

Here it is: {{your URL}}

This could provide additional value for readers interested in the implementation details.

Thanks for the mention!

{{inbox.name}}`
    },
    {
      id: 104,
      category: 'link-reclamation',
      title: 'Product Review Reclamation',
      subject: 'Link addition for product review',
      body: `Hey {{prospect.first_name}},

Thanks for reviewing {{your product}} in your {{topic}} roundup. We appreciate the fair and thorough evaluation.

Would it be possible to add a link to our product page so interested readers can learn more or start a free trial?

Here's the link: {{your URL}}

Thanks for taking the time to test and review our product!

Best,
{{inbox.name}}`
    },

    // Press Outreach Templates (6 templates)
    {
      id: 105,
      category: 'press-outreach',
      title: 'News Story Pitch',
      subject: '{{News angle}} - Story idea for {{publication}}',
      body: `Hi {{prospect.first_name}},

I have a story idea that I think would be perfect for {{publication}}'s audience.

{{Company}} just {{newsworthy event}} which represents a significant development in {{industry}}.

The story includes:
- {{news angle 1}}
- {{news angle 2}}
- {{industry implications}}
- Exclusive data/insights we can share

I can provide:
- Executive interviews
- Supporting data and research
- High-resolution images
- Industry context and analysis

Would this be of interest for an upcoming piece?

Best regards,
{{inbox.name}}`
    },
    {
      id: 106,
      category: 'press-outreach',
      title: 'Expert Commentary Offer',
      subject: 'Expert commentary on {{trending topic}}',
      body: `Hello {{prospect.first_name}},

I noticed {{publication}} has been covering {{trending topic}} extensively. As someone who has worked in {{field}} for {{years}}, I wanted to offer expert commentary.

I can provide insights on:
- Why this trend is happening now
- Long-term implications for {{industry}}
- What businesses should do in response
- Predictions for how this will evolve

I'm available for interviews, quotes, or can provide written analysis.

Here's my background: {{your URL}}

Would expert perspective be valuable for your coverage?

Thanks,
{{inbox.name}}`
    },
    {
      id: 107,
      category: 'press-outreach',
      title: 'Research Release',
      subject: 'New research reveals {{key finding}} about {{topic}}',
      body: `Hi {{prospect.first_name}},

We just completed research that reveals some surprising findings about {{topic}} - something I know {{publication}} readers care about.

Key findings include:
- {{surprising finding 1}}
- {{surprising finding 2}}
- {{industry implication}}

The research is based on {{methodology}} and includes data from {{sample size}}.

We're offering exclusive access to journalists before the public release. The findings could make for compelling coverage.

Research summary: {{your URL}}

Would you like to discuss this further?

Best,
{{inbox.name}}`
    },
    {
      id: 108,
      category: 'press-outreach',
      title: 'Industry Trend Analysis',
      subject: 'Major shift happening in {{industry}}',
      body: `Hello {{prospect.first_name}},

I'm seeing a major shift in {{industry}} that hasn't gotten much media attention yet, but I think it should.

The trend involves {{trend description}} and it's happening because {{underlying causes}}.

This affects {{audience}} significantly because {{impact}}.

I have data showing:
- {{supporting data 1}}
- {{supporting data 2}}
- {{projection for future}}

Full analysis here: {{your URL}}

Would this make for interesting coverage for {{publication}}'s audience?

Best regards,
{{inbox.name}}`
    },
    {
      id: 109,
      category: 'press-outreach',
      title: 'CEO Interview Offer',
      subject: 'CEO interview opportunity about {{topic}}',
      body: `Hi {{prospect.first_name}},

I'd like to offer an exclusive interview with {{CEO name}}, CEO of {{company}}, about {{relevant topic}}.

{{CEO name}} has unique insights because {{relevant experience/background}}.

Potential discussion topics:
- {{topic 1}}
- {{topic 2}}
- {{industry predictions}}
- {{company's unique approach}}

This would be exclusive to {{publication}} and could be conducted via phone, video, or in person.

CEO background: {{your URL}}

Would this interest your readers?

Thanks,
{{inbox.name}}`
    },
    {
      id: 110,
      category: 'press-outreach',
      title: 'Local Business Angle',
      subject: 'Local business story with broader implications',
      body: `Hey {{prospect.first_name}},

I have a local business story that I think illustrates broader trends your readers would find interesting.

{{Local company}} in {{location}} has {{achieved something notable}} by {{method/approach}}.

While it's a local story, it represents a broader trend of {{larger trend}} happening across {{industry/region}}.

The story includes:
- Impressive local results ({{specific numbers}})
- Innovative approach that others could replicate  
- Economic impact on the community
- Lessons for similar businesses elsewhere

More details: {{your URL}}

Would this type of local-to-global story work for {{publication}}?

Best,
{{inbox.name}}`
    },

    // Product Review Templates (6 templates)
    {
      id: 111,
      category: 'product-review',
      title: 'Free Product Trial Offer',
      subject: 'Free {{product}} trial for review consideration',
      body: `Hi {{prospect.first_name}},

I've been following your {{product category}} reviews on {{website}} and really appreciate your thorough, honest approach.

We just launched {{product name}}, which {{product description}}. I think your readers would be interested in an honest review since it addresses {{common problem}}.

I'd love to provide:
- Free extended trial (longer than our standard trial)
- Direct access to our development team for questions
- Exclusive data about how we're different from competitors
- High-resolution screenshots and marketing materials

Here's more about the product: {{your URL}}

Would this be worth reviewing for your audience?

Thanks,
{{inbox.name}}`
    }
  ];

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'broken-link', name: 'Broken Link Building', count: 15 },
    { id: 'resource-pages', name: 'Resource Pages', count: 12 },
    { id: 'guest-post', name: 'Guest Post Pitches', count: 20 },
    { id: 'skyscraper', name: 'Skyscraper Outreach', count: 8 },
    { id: 'link-insertion', name: 'Link Insertion', count: 8 },
    { id: 'follow-ups', name: 'Follow-Up Emails', count: 15 },
    { id: 'edu-outreach', name: '.EDU Outreach', count: 10 },
    { id: 'infographic', name: 'Infographic Outreach', count: 8 },
    { id: 'link-reclamation', name: 'Link Reclamation', count: 8 },
    { id: 'press-outreach', name: 'Press Outreach', count: 6 },
    { id: 'product-review', name: 'Product Reviews', count: 6 }
  ];

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    const matchesSearch = !searchQuery || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.body.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  const copyToClipboard = async (text: string, templateId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTemplate(templateId);
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'broken-link': 'bg-red-100 text-red-800 border-red-200',
      'resource-pages': 'bg-blue-100 text-blue-800 border-blue-200',
      'guest-post': 'bg-green-100 text-green-800 border-green-200',
      'skyscraper': 'bg-purple-100 text-purple-800 border-purple-200',
      'link-insertion': 'bg-orange-100 text-orange-800 border-orange-200',
      'follow-ups': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'edu-outreach': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'infographic': 'bg-pink-100 text-pink-800 border-pink-200',
      'link-reclamation': 'bg-teal-100 text-teal-800 border-teal-200',
      'press-outreach': 'bg-gray-100 text-gray-800 border-gray-200',
      'product-review': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getCategoryName = (category: string) => {
    const names: { [key: string]: string } = {
      'broken-link': 'Broken Link',
      'resource-pages': 'Resource Pages',
      'guest-post': 'Guest Post',
      'skyscraper': 'Skyscraper',
      'link-insertion': 'Link Insertion',
      'follow-ups': 'Follow-Up',
      'edu-outreach': '.EDU Outreach',
      'infographic': 'Infographic',
      'link-reclamation': 'Link Reclamation',
      'press-outreach': 'Press Outreach',
      'product-review': 'Product Review'
    };
    return names[category] || category;
  };

  return (
    <BlogPostTemplate
      title="111 Cold Email Outreach Templates for Link Building (Free)"
      metaDescription="Get 111 proven email outreach templates for link building campaigns. Broken link building, guest post pitches, resource pages, and more. Ready to copy & customize."
      publishDate="January 15, 2021"
      author="Ajay Paghdal"
      readTime="20 min read"
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
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8 mb-8">
        <div className="text-center">
          <div className="text-6xl mb-4">📧</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            111 Email Outreach Templates for Link Building
          </h1>
          <p className="text-xl text-gray-700 mb-6">
            Copy, customize, and start building high-quality backlinks today
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">111</div>
              <div className="text-sm text-gray-600">Templates</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-green-600">12</div>
              <div className="text-sm text-gray-600">Categories</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-purple-600">100%</div>
              <div className="text-sm text-gray-600">Free</div>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-600">Ready</div>
              <div className="text-sm text-gray-600">to Use</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg"
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === category.id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name} ({category.count})
            </button>
          ))}
        </div>
      </div>

      {/* Results Counter */}
      <div className="mb-6">
        <p className="text-lg text-gray-700">
          Showing <span className="font-bold text-blue-600">{filteredTemplates.length}</span> templates
          {selectedCategory !== 'all' && ` in ${categories.find(c => c.id === selectedCategory)?.name}`}
        </p>
      </div>

      {/* Templates Grid */}
      <div className="space-y-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getCategoryColor(template.category)}`}>
                      {getCategoryName(template.category)}
                    </span>
                    <span className="text-sm text-gray-500">Template #{template.id}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{template.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    <span className="font-medium">Subject:</span> {template.subject}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(template.body, template.id)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    copiedTemplate === template.id
                      ? 'bg-green-500 text-white'
                      : 'bg-blue-500 text-white hover:bg-blue-600'
                  }`}
                >
                  {copiedTemplate === template.id ? '✅ Copied!' : '📋 Copy'}
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 border">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed">
                  {template.body}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Usage Tips */}
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 mt-12">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          🎯 How to Use These Templates Effectively
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">1</div>
              <div>
                <h4 className="font-semibold text-gray-900">Personalize Every Email</h4>
                <p className="text-gray-700 text-sm">Never send a template as-is. Research your prospect and customize the message.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">2</div>
              <div>
                <h4 className="font-semibold text-gray-900">Research Your Prospects</h4>
                <p className="text-gray-700 text-sm">Mention something specific about their site, recent articles, or achievements.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">3</div>
              <div>
                <h4 className="font-semibold text-gray-900">Provide Genuine Value</h4>
                <p className="text-gray-700 text-sm">Focus on what you can offer them, not what you want from them.</p>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">4</div>
              <div>
                <h4 className="font-semibold text-gray-900">Test Different Approaches</h4>
                <p className="text-gray-700 text-sm">A/B test your subject lines and messaging to improve response rates.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">5</div>
              <div>
                <h4 className="font-semibold text-gray-900">Follow Up Strategically</h4>
                <p className="text-gray-700 text-sm">Wait 5-7 days between follow-ups and always add new value.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">6</div>
              <div>
                <h4 className="font-semibold text-gray-900">Track Your Results</h4>
                <p className="text-gray-700 text-sm">Monitor open rates and response rates to continuously optimize.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-8 mt-12 text-center">
        <h3 className="text-2xl font-bold mb-4">Ready to Start Building Links?</h3>
        <p className="text-xl mb-6">
          You now have 111 proven email templates to jumpstart your link building campaigns.
        </p>
        <div className="bg-white bg-opacity-20 rounded-lg p-6 max-w-md mx-auto">
          <h4 className="font-bold mb-3 text-white">Remember the Golden Rules:</h4>
          <ul className="text-left space-y-2 text-sm text-white">
            <li>✅ Always personalize your emails</li>
            <li>✅ Focus on providing value first</li>
            <li>✅ Be genuine and authentic</li>
            <li>✅ Follow up professionally</li>
            <li>✅ Track and optimize your results</li>
          </ul>
        </div>
      </div>

      {/* Final Tips */}
      <div className="mt-12 p-8 bg-gray-50 rounded-lg">
        <h3 className="text-2xl font-bold text-gray-900 mb-6">💡 Pro Tips for Better Results</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🎯</div>
            <h4 className="font-semibold text-gray-900 mb-2">Quality Over Quantity</h4>
            <p className="text-gray-700 text-sm">Send 10 highly personalized emails rather than 100 generic ones.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">📊</div>
            <h4 className="font-semibold text-gray-900 mb-2">Track Everything</h4>
            <p className="text-gray-700 text-sm">Use tools to track opens, clicks, and responses to optimize your approach.</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="text-3xl mb-3">🤝</div>
            <h4 className="font-semibold text-gray-900 mb-2">Build relationships</h4>
            <p className="text-gray-700 text-sm">Focus on long-term relationships, not just one-off link placements.</p>
          </div>
        </div>
      </div>
    </BlogPostTemplate>
  );
}