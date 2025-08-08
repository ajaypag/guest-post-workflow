// Internal linking configuration for SEO optimization
export interface InternalLink {
  keyword: string;
  href: string;
  title: string;
  priority?: number; // Higher priority = link this first when keyword appears
}

// Master list of internal links organized by topic
export const internalLinksDatabase: InternalLink[] = [
  // Link Building
  { keyword: 'link building services', href: '/best-link-building-services', title: 'Best Link Building Services', priority: 10 },
  { keyword: 'link building costs', href: '/link-building-costs', title: 'Link Building Costs Guide', priority: 9 },
  { keyword: 'link building', href: '/broken-link-building-guide', title: 'Link Building Guide', priority: 8 },
  { keyword: 'high authority backlinks', href: '/how-to-get-high-authority-backlinks', title: 'Get High Authority Backlinks', priority: 9 },
  { keyword: 'broken link building', href: '/broken-link-building-guide', title: 'Broken Link Building Guide', priority: 10 },
  { keyword: 'edu links', href: '/edu-link-building-guide', title: 'EDU Link Building', priority: 9 },
  { keyword: 'local link building', href: '/local-business-link-building', title: 'Local Business Link Building', priority: 8 },
  
  // Guest Posting
  { keyword: 'guest posting services', href: '/best-guest-posting-services', title: 'Best Guest Posting Services', priority: 10 },
  { keyword: 'guest posting sites', href: '/guest-posting-sites', title: 'Guest Posting Sites List', priority: 9 },
  { keyword: 'guest posting', href: '/best-guest-posting-services', title: 'Guest Posting Services', priority: 8 },
  { keyword: 'blogger outreach', href: '/best-blogger-outreach-services', title: 'Blogger Outreach Services', priority: 10 },
  { keyword: 'outreach templates', href: '/email-outreach-templates', title: 'Email Outreach Templates', priority: 9 },
  { keyword: 'follow up email', href: '/follow-up-email', title: 'Follow-Up Email Templates', priority: 8 },
  
  // Industry Specific
  { keyword: 'saas link building', href: '/saas-link-building', title: 'SaaS Link Building', priority: 10 },
  { keyword: 'ecommerce link building', href: '/ecommerce-link-building', title: 'Ecommerce Link Building', priority: 10 },
  { keyword: 'ecommerce seo', href: '/ecommerce-seo-case-study', title: 'Ecommerce SEO Case Study', priority: 9 },
  { keyword: 'b2b link building', href: '/b2b-services-link-building', title: 'B2B Services Link Building', priority: 10 },
  
  // SEO Tools
  { keyword: 'content seo tools', href: '/best-content-seo-tools', title: 'Best Content SEO Tools', priority: 10 },
  { keyword: 'rank tracking', href: '/best-rank-tracking-tools-local-businesses', title: 'Rank Tracking Tools', priority: 9 },
  { keyword: 'email finder', href: '/best-email-finders', title: 'Best Email Finders', priority: 10 },
  { keyword: 'find email addresses', href: '/how-to-find-email-addresses', title: 'How to Find Email Addresses', priority: 9 },
  { keyword: 'anchor text', href: '/anchor-text-optimizer', title: 'Anchor Text Optimizer', priority: 10 },
  
  // SEO Education
  { keyword: 'seo tutorial', href: '/seo-tutorial', title: 'SEO Tutorial', priority: 9 },
  { keyword: 'seo case study', href: '/seo-case-study', title: 'SEO Case Study', priority: 9 },
  { keyword: 'seo books', href: '/best-seo-books-recommended-by-pros', title: 'Best SEO Books', priority: 8 },
  { keyword: 'seo newsletters', href: '/best-seo-newsletters', title: 'Best SEO Newsletters', priority: 8 },
  { keyword: 'seo webinars', href: '/seo-webinars', title: 'SEO Webinars', priority: 8 },
  { keyword: 'seo proposal', href: '/seo-proposal', title: 'SEO Proposal Template', priority: 8 },
  
  // Content Creation
  { keyword: 'how to write listicles', href: '/how-to-write-listicles', title: 'How to Write Listicles', priority: 8 },
  { keyword: 'listicles', href: '/how-to-write-listicles', title: 'Listicle Writing Guide', priority: 7 },
  
  // Technical SEO
  { keyword: 'link disavow', href: '/link-disavows-good-or-bad', title: 'Link Disavows Guide', priority: 8 },
  { keyword: 'google algorithm', href: '/googles-latest-algorithm-updates', title: "Google's Algorithm Updates", priority: 9 },
  { keyword: 'algorithm updates', href: '/googles-latest-algorithm-updates', title: 'Latest Algorithm Updates', priority: 8 },
  
  // Resources
  { keyword: 'resource page link building', href: '/resource-page-link-building-guide', title: 'Resource Page Link Building', priority: 9 },
  { keyword: 'directory submission', href: '/directory-submission-sites', title: 'Directory Submission Sites', priority: 7 },
  { keyword: 'easy backlinks', href: '/easy-backlinks-simple-strategies', title: 'Easy Backlink Strategies', priority: 8 },
  
  // Citation Building
  { keyword: 'citation building', href: '/best-citation-building-services', title: 'Best Citation Building Services', priority: 10 },
  { keyword: 'citation services', href: '/best-citation-building-services', title: 'Citation Building Services', priority: 9 },
];

// Function to automatically add internal links to content
export function addInternalLinks(content: string, maxLinks: number = 5): string {
  let modifiedContent = content;
  const linksAdded = new Set<string>();
  
  // Sort by priority
  const sortedLinks = [...internalLinksDatabase].sort((a, b) => 
    (b.priority || 0) - (a.priority || 0)
  );
  
  for (const link of sortedLinks) {
    if (linksAdded.size >= maxLinks) break;
    if (linksAdded.has(link.href)) continue;
    
    // Create regex to find the keyword (case-insensitive, word boundaries)
    const regex = new RegExp(`\\b(${link.keyword})\\b(?![^<]*>)`, 'gi');
    
    // Check if keyword exists in content
    if (regex.test(modifiedContent)) {
      // Replace first occurrence only
      modifiedContent = modifiedContent.replace(
        regex,
        `<a href="${link.href}" class="text-blue-600 hover:text-blue-800 underline">${link.title}</a>`
      );
      linksAdded.add(link.href);
    }
  }
  
  return modifiedContent;
}

// Get related links based on current page path
export function getRelatedLinks(currentPath: string, limit: number = 5): InternalLink[] {
  // Filter out current page
  const availableLinks = internalLinksDatabase.filter(link => link.href !== currentPath);
  
  // Simple relevance scoring based on shared words in path
  const currentWords = currentPath.toLowerCase().split(/[-/]/);
  
  const scoredLinks = availableLinks.map(link => {
    const linkWords = link.href.toLowerCase().split(/[-/]/);
    const sharedWords = currentWords.filter(word => 
      linkWords.includes(word) && word.length > 2
    );
    
    return {
      ...link,
      score: sharedWords.length + (link.priority || 0) / 10
    };
  });
  
  // Sort by score and return top results
  return scoredLinks
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score, ...link }) => link);
}

// Breadcrumb generation
export function generateBreadcrumbs(path: string): Array<{ name: string; href: string }> {
  const segments = path.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Home', href: '/' }];
  
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const name = segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    breadcrumbs.push({ name, href: currentPath });
  }
  
  return breadcrumbs;
}