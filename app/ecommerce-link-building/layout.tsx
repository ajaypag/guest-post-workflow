import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'E-commerce Link Building | Product Category Domination & Brand Authority',
  description: 'Strategic e-commerce link building through lifestyle and industry publication placement. Dominate product categories and build brand authority across multiple niches.',
  keywords: ['ecommerce link building', 'ecommerce seo', 'product category seo', 'online store link building', 'retail link building', 'ecommerce authority building'],
  openGraph: {
    title: 'E-commerce Link Building | Product Category Domination',
    description: 'Build e-commerce authority through strategic placement across lifestyle and industry publications. Dominate product categories with comprehensive coverage.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'E-commerce Link Building | Product Category Domination',
    description: 'Strategic e-commerce link building through lifestyle and industry publication placement for brand authority.',
  },
};

export default function EcommerceLinkBuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}