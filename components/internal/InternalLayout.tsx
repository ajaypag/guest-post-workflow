'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Globe, 
  Users,
  Upload,
  Link2,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Shield,
  Database,
  CheckCircle,
  Package,
  DollarSign,
  FileText,
  Search,
  Wrench
} from 'lucide-react';
import { AuthSession } from '@/lib/types/auth';
import Header from '@/components/Header';

interface InternalLayoutProps {
  children: React.ReactNode;
  session: AuthSession;
}

const navigation = [
  { name: 'Dashboard', href: '/internal', icon: Home },
  { name: 'Websites', href: '/internal/websites', icon: Globe },
  { name: 'Publishers', href: '/internal/publishers', icon: Users },
  { name: 'Publisher Tools', href: '/internal/publishers/tools', icon: Wrench },
  { name: 'Vetted Sites', href: '/vetted-sites', icon: Database },
  { name: 'Relationships', href: '/internal/relationships', icon: Link2 },
  { name: 'Bulk Import', href: '/internal/import', icon: Upload },
  { name: 'Quality Control', href: '/internal/quality', icon: CheckCircle },
  { name: 'Analytics', href: '/internal/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/internal/settings', icon: Settings },
];

export default function InternalLayout({ children, session }: InternalLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  // Generate breadcrumbs
  const generateBreadcrumbs = () => {
    const parts = pathname.split('/').filter(Boolean);
    const breadcrumbs: Array<{ name: string; href: string; current: boolean }> = [];
    let path = '';

    parts.forEach((part, index) => {
      path += `/${part}`;
      const name = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        name: index === 0 && part === 'internal' ? 'Internal Portal' : name,
        href: path,
        current: index === parts.length - 1,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <>
      {/* Use standard Header component */}
      <Header />
      
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumbs and mobile sidebar toggle */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-12">
              {/* Mobile sidebar toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 mr-4"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              
              {/* Breadcrumbs */}
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-4">
                  <li>
                    <div>
                      <Link href="/internal" className="text-gray-400 hover:text-gray-500">
                        <Shield className="h-4 w-4" />
                        <span className="sr-only">Internal Portal</span>
                      </Link>
                    </div>
                  </li>
                  {breadcrumbs.slice(1).map((breadcrumb) => (
                    <li key={breadcrumb.href}>
                      <div className="flex items-center">
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                        {breadcrumb.current ? (
                          <span className="ml-4 text-sm font-medium text-gray-900">
                            {breadcrumb.name}
                          </span>
                        ) : (
                          <Link
                            href={breadcrumb.href}
                            className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
                          >
                            {breadcrumb.name}
                          </Link>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/internal' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                        ${isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 h-5 w-5
                          ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>

              {/* Quick Stats */}
              <div className="px-4 py-4 border-t border-gray-200">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Total Websites</span>
                    <span className="font-medium text-gray-900">--</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Active Publishers</span>
                    <span className="font-medium text-gray-900">--</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Relationships</span>
                    <span className="font-medium text-gray-900">--</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-white">
              <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
                <span className="text-xl font-semibold text-gray-900">Menu</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/internal' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                        ${isActive
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 h-5 w-5
                          ${isActive ? 'text-indigo-600' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 1 && (
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-3">
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.href} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="h-4 w-4 text-gray-400 mx-2" />
                      )}
                      {crumb.current ? (
                        <span className="text-sm font-medium text-gray-700">
                          {crumb.name}
                        </span>
                      ) : (
                        <Link
                          href={crumb.href}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          {crumb.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          )}

          {/* Page Content */}
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
    </>
  );
}