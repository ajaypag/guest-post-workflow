import type { Metadata } from "next";
import "./globals.css";
import DebugLoader from "@/components/DebugLoader";

export const metadata: Metadata = {
  title: "PostFlow - Guest Post Automation Platform",
  description: "Streamline your guest posting workflow from site selection to publication with our 15-step automated process.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        {children}
        <DebugLoader />
      </body>
    </html>
  );
}
