# Marketing Site Header Consistency Guide

## Overview
All external/marketing pages MUST use the unified `LinkioHeader` component to ensure consistent user experience and branding.

## Components

### 1. LinkioHeader Component (`/components/LinkioHeader.tsx`)
The main header component for all marketing pages.

**Variants:**
- `default` - Full navigation (home, guest posting sites, tools, blog, login, signup)
- `blog` - Minimal navigation for blog posts (back button, signup CTA)
- `tool` - Tool pages with breadcrumb (shows tool name in header)

### 2. MarketingLayout Component (`/components/MarketingLayout.tsx`)
A wrapper component that automatically includes the header. **Recommended for new pages.**

## Usage Guidelines

### For New Marketing Pages

Always use the `MarketingLayout` wrapper:

```tsx
import MarketingLayout from '@/components/MarketingLayout';

export default function YourPage() {
  return (
    <MarketingLayout variant="default">
      <div className="min-h-screen bg-gray-50">
        {/* Your page content */}
      </div>
    </MarketingLayout>
  );
}
```

### For Tool Pages

```tsx
<MarketingLayout variant="tool" toolName="Your Tool Name">
  {/* Tool page content */}
</MarketingLayout>
```

### For Blog Posts

Use the existing `BlogPostTemplate` which already includes LinkioHeader:

```tsx
import BlogPostTemplate from '@/components/BlogPostTemplate';

export default function BlogPost() {
  return (
    <BlogPostTemplate>
      {/* Blog content */}
    </BlogPostTemplate>
  );
}
```

## Current Implementation Status

### ✅ Pages WITH Correct Headers
- `/marketing` - LinkioHeader (default)
- `/blog` - LinkioHeader (blog)
- `/signup/marketing` - LinkioHeader (default)
- `/guest-posting-sites` - LinkioHeader (default)
- `/guest-posting-sites/[niche]` - LinkioHeader (default)
- `/anchor-text-optimizer` - LinkioHeader (tool)
- `/anchor-text-optimizer/pricing` - LinkioHeader (tool) - FIXED
- `/directory-submission-sites` - LinkioHeader (default) - FIXED
- All blog posts via BlogPostTemplate

### ❌ Never Use Internal Header
The `Header` component (`/components/Header.tsx`) is ONLY for internal authenticated pages. Never use it for marketing pages.

## Header Consistency Rules

1. **All marketing pages MUST have a header** - No exceptions
2. **Use LinkioHeader or MarketingLayout** - Never create custom headers
3. **Choose the correct variant** - default, blog, or tool
4. **Tool pages need toolName** - Pass the tool name for breadcrumb display
5. **Blog posts use BlogPostTemplate** - It handles the header automatically

## Quick Checklist for New Pages

- [ ] Is this a marketing/external page? → Use LinkioHeader
- [ ] Is it a tool page? → Use variant="tool" with toolName
- [ ] Is it a blog post? → Use BlogPostTemplate
- [ ] Is it a general marketing page? → Use variant="default"
- [ ] Added import for LinkioHeader or MarketingLayout?
- [ ] Removed any custom header implementations?

## Migration Guide for Existing Pages

If you find a page without a header:

1. Import LinkioHeader: `import LinkioHeader from '@/components/LinkioHeader';`
2. Add it at the top of your page component's return
3. Choose the appropriate variant
4. Remove any custom header implementation
5. Test the page to ensure proper display

## Common Mistakes to Avoid

❌ **DON'T** create custom headers
❌ **DON'T** use the internal Header component for marketing pages  
❌ **DON'T** forget to add headers to new pages
❌ **DON'T** mix PostFlow and Linkio branding
✅ **DO** use LinkioHeader consistently
✅ **DO** choose the appropriate variant
✅ **DO** use MarketingLayout for new pages