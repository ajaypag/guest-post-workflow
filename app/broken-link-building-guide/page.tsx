import BlogPostTemplate from '@/components/BlogPostTemplate';

export const metadata = {
  title: "Broken Link Building Guide | PostFlow",
  description: "Learn more about broken link building guide",
};

export default function BrokenLinkBuildingGuidePage() {
  return (
    <BlogPostTemplate
      title="Broken Link Building Guide"
      metaDescription="Learn more about broken link building guide"
      publishDate="August 2022"
      author="Ajay Paghdal"
      readTime="8 min read"
    >
      <div className="prose prose-lg max-w-none">
        <p>Broken link building guide content will be added here.</p>
      </div>
    </BlogPostTemplate>
  );
}