'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  User, 
  CreditCard, 
  Package, 
  Settings, 
  HelpCircle,
  ChevronRight,
  Home
} from 'lucide-react';

interface AccountLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBreadcrumbs?: boolean;
}

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/account/dashboard',
    icon: Package,
    description: 'Overview of your account and orders'
  },
  {
    name: 'Account Settings',
    href: '/account/settings',
    icon: Settings,
    description: 'Manage your profile and security settings'
  },
  {
    name: 'Billing History',
    href: '/billing',
    icon: CreditCard,
    description: 'View invoices and payment history'
  },
  {
    name: 'Help & Support',
    href: '/support',
    icon: HelpCircle,
    description: 'Get help and contact support'
  }
];

export default function AccountLayout({ 
  children, 
  title, 
  subtitle,
  showBreadcrumbs = true 
}: AccountLayoutProps) {
  const pathname = usePathname();

  const getCurrentPageInfo = () => {
    const currentItem = navigationItems.find(item => pathname === item.href);
    if (currentItem) {
      return {
        title: currentItem.name,
        description: currentItem.description
      };
    }
    
    // Handle special cases
    if (pathname.startsWith('/billing')) {
      return {
        title: 'Billing History',
        description: 'View invoices and payment history'
      };
    }
    
    if (pathname.startsWith('/support')) {
      return {
        title: 'Help & Support',
        description: 'Get help and contact support'
      };
    }

    return {
      title: title || 'Account',
      description: subtitle || 'Manage your account'
    };
  };

  const currentPage = getCurrentPageInfo();

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-4rem)]">
      <div className="max-w-7xl mx-auto py-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:col-span-3 xl:col-span-2">
            <nav className="sticky top-8 space-y-1 bg-white rounded-lg shadow-sm p-6">
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                <p className="text-sm text-gray-600 mt-1">Manage your settings and preferences</p>
              </div>
              
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href === '/billing' && pathname.startsWith('/billing')) ||
                  (item.href === '/support' && pathname.startsWith('/support'));
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-500'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon
                      className={`flex-shrink-0 w-5 h-5 mr-3 ${
                        isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Main content */}
          <div className="lg:col-span-9 xl:col-span-10">
            <div className="px-4 sm:px-6 lg:px-0">
              {/* Mobile navigation */}
              <div className="lg:hidden mb-6">
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <select
                    value={pathname}
                    onChange={(e) => window.location.href = e.target.value}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {navigationItems.map((item) => (
                      <option key={item.name} value={item.href}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Breadcrumbs */}
              {showBreadcrumbs && (
                <div className="mb-6">
                  <nav className="flex items-center space-x-2 text-sm text-gray-500">
                    <Link 
                      href="/account/dashboard" 
                      className="hover:text-gray-700 flex items-center"
                    >
                      <Home className="w-4 h-4 mr-1" />
                      Account
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-gray-900 font-medium">{currentPage.title}</span>
                  </nav>
                </div>
              )}

              {/* Page header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  {title || currentPage.title}
                </h1>
                {(subtitle || currentPage.description) && (
                  <p className="text-gray-600 mt-2">
                    {subtitle || currentPage.description}
                  </p>
                )}
              </div>

              {/* Page content */}
              <div className="pb-8">
                {children}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}