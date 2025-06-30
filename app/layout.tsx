import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Guest Post Workflow Manager",
  description: "Streamline your guest post creation process",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{backgroundColor: '#f8f9fa'}}>
        <header className="shadow-sm border-b" style={{backgroundColor: '#ffffff', borderColor: '#dee2e6'}}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4">
              <h1 className="text-2xl font-bold" style={{color: '#212529'}}>Guest Post Workflow</h1>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
