'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Home, 
  Globe, 
  Package, 
  ShoppingCart, 
  DollarSign, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronRight,
  Zap,
  BarChart3,
  Bell,
  User
} from 'lucide-react';
import { AuthSession } from '@/lib/types/auth';

interface PublisherLayoutProps {
  children: React.ReactNode;
  session: AuthSession;
}

const navigation = [
  { name: 'Dashboard', href: '/publisher', icon: Home },
  { name: 'My Websites', href: '/publisher/websites', icon: Globe },
  { name: 'Offerings', href: '/publisher/offerings', icon: Package },
  { name: 'Orders', href: '/publisher/orders', icon: ShoppingCart },
  { name: 'Earnings', href: '/publisher/earnings', icon: DollarSign },
  { name: 'Analytics', href: '/publisher/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/publisher/settings', icon: Settings },
];

export default function PublisherLayout({ children, session }: PublisherLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/publisher/auth/logout', { method: 'POST' });
      if (!response.ok) {
        console.error('Logout failed with status:', response.status);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always redirect to login page, even on error
      router.push('/publisher/login');
    }
  };

  // Generate breadcrumbs
  interface Breadcrumb {
    name: string;
    href: string;
    current: boolean;
  }
  
  const generateBreadcrumbs = (): Breadcrumb[] => {
    const parts = pathname.split('/').filter(Boolean);
    const breadcrumbs: Breadcrumb[] = [];
    let path = '';

    parts.forEach((part, index) => {
      path += `/${part}`;
      const name = part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' ');
      breadcrumbs.push({
        name: index === 0 && part === 'publisher' ? 'Dashboard' : name,
        href: path,
        current: index === parts.length - 1,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Desktop Nav Toggle */}
            <div className="flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
              
              <Link href="/publisher" className="flex items-center ml-2 lg:ml-0">
                <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <span className="ml-3 text-xl font-semibold text-gray-900 hidden sm:block">
                  Publisher Portal
                </span>
              </Link>
            </div>

            {/* Right side - Notifications and User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg">
                <Bell className="h-5 w-5" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <span className="ml-3 text-gray-700 hidden md:block">{session.name}</span>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{session.name}</p>
                      <p className="text-xs text-gray-500">{session.email}</p>
                    </div>
                    <Link
                      href="/publisher/settings/profile"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile Settings
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="h-4 w-4 inline mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64">
            <div className="flex-1 flex flex-col min-h-0 bg-white border-r border-gray-200">
              <nav className="flex-1 px-2 py-4 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href || 
                    (item.href !== '/publisher' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                        ${isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 h-5 w-5
                          ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
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
                    (item.href !== '/publisher' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                        ${isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          mr-3 h-5 w-5
                          ${isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'}
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
  );
}