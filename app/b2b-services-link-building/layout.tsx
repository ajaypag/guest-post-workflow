import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'B2B Services Link Building | Strategic Authority Building & AI Citations',
  description: 'Specialized B2B services link building with strategic modifier coverage. Build industry authority across service variations for maximum market domination.',
  keywords: ['b2b services link building', 'b2b link building', 'business services seo', 'b2b marketing', 'b2b authority building', 'professional services link building'],
  openGraph: {
    title: 'B2B Services Link Building | Strategic Authority & Market Domination',
    description: 'Build B2B service authority through strategic modifier coverage. Dominate across all service variations with comprehensive market coverage.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'B2B Services Link Building | Strategic Authority Building',
    description: 'Specialized B2B services link building with strategic modifier coverage for complete market domination.',
  },
};

export default function B2BServicesLinkBuildingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}