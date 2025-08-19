'use client';

import Link from 'next/link';
import { ChevronLeft, Home, Database, Mail, FlaskConical } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function AdminHeader() {
  const pathname = usePathname();
  
  // Define Shadow Publisher related pages
  const shadowPublisherPages = [
    '/admin/shadow-publishers',
    '/admin/test-shadow-publisher',
    '/admin/migration-shadow'
  ];
  
  const isShadowPublisherPage = shadowPublisherPages.includes(pathname);
  
  return (
    <div className="bg-white border-b mb-6">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/admin" 
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Admin Dashboard</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <h1 className="text-lg font-semibold text-gray-900">
              Shadow Publisher System
            </h1>
          </div>
          
          {isShadowPublisherPage && (
            <nav className="flex items-center gap-2">
              <Link
                href="/admin/shadow-publishers"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin/shadow-publishers'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Mail className="h-3.5 w-3.5" />
                Publishers
              </Link>
              
              <Link
                href="/admin/test-shadow-publisher"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin/test-shadow-publisher'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <FlaskConical className="h-3.5 w-3.5" />
                Test Email
              </Link>
              
              <Link
                href="/admin/migration-shadow"
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  pathname === '/admin/migration-shadow'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Database className="h-3.5 w-3.5" />
                Migrations
              </Link>
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}