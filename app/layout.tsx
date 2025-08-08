import '../polyfills/randomUUID';   // load UUID polyfill before anything else
import type { Metadata } from "next";
import "./globals.css";
import { NotificationProvider } from "@/lib/contexts/NotificationContext";
import { WebVitals } from "@/components/WebVitals";
import { StructuredData, organizationSchema, websiteSchema } from "@/components/StructuredData";

export const metadata: Metadata = {
  metadataBase: new URL('https://linkio.com'),
  title: {
    default: "Linkio - Advanced Link Building & SEO Platform",
    template: "%s | Linkio"
  },
  description: "Master link building with Linkio's advanced SEO tools, anchor text optimization, and comprehensive guides from industry experts.",
  keywords: ["link building", "SEO", "backlinks", "anchor text optimization", "digital marketing", "SERP tracking"],
  authors: [{ name: "Linkio Team" }],
  creator: "Linkio",
  publisher: "Linkio",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://linkio.com",
    title: "Linkio - Advanced Link Building & SEO Platform",
    description: "Master link building with advanced SEO tools, anchor text optimization, and expert guides. Trusted by SEO professionals worldwide.",
    siteName: "Linkio",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Linkio - Advanced Link Building & SEO Tools",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Linkio - Advanced Link Building & SEO Platform",
    description: "Master link building with advanced SEO tools, anchor text optimization, and expert guides. Trusted by SEO professionals worldwide.",
    images: ["/og-image.jpg"],
  },
  alternates: {
    canonical: "https://linkio.com",
    types: {
      "application/rss+xml": [{ url: "/rss.xml", title: "Linkio Blog RSS Feed" }],
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "google-site-verification-code-here",
  },
  category: "technology",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StructuredData data={organizationSchema} />
        <StructuredData data={websiteSchema} />
      </head>
      <body className="min-h-screen bg-gray-50">
        <WebVitals />
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
