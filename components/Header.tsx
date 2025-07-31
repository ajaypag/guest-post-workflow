'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sessionStorage } from '@/lib/userStorage';
import { type AuthSession } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { User, LogOut, Users, Building2, Zap, Search, BarChart2, Globe, Mail, ShoppingCart, Package, Database } from 'lucide-react';

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(sessionStorage.getSession());
  }, []);

  const handleLogout = () => {
    sessionStorage.clearSession();
    router.push('/login');
  };

  if (!session) return null;

  return (
    <header className="bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-3">
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full"></div>
              </div>
              <div>
                <div className="text-lg font-semibold text-gray-900">PostFlow</div>
                <div className="text-xs text-gray-500 -mt-1">Guest Post Automation</div>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center space-x-1">
            {session.userType === 'account' ? (
              // Account Navigation
              <>
                <Link
                  href="/account/dashboard"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Package className="w-4 h-4 mr-1.5" />
                  Dashboard
                </Link>
                <Link
                  href="/clients"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Building2 className="w-4 h-4 mr-1.5" />
                  Brands
                </Link>
                <Link
                  href="/orders"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  My Orders
                </Link>
              </>
            ) : (
              // Internal Team Navigation
              <>
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Workflows
                </Link>
                <Link
                  href="/clients"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Building2 className="w-4 h-4 mr-1.5" />
                  Clients
                </Link>
                <Link
                  href="/bulk-analysis"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <BarChart2 className="w-4 h-4 mr-1.5" />
                  Bulk Analysis
                </Link>
                <Link
                  href="/orders"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Orders
                </Link>
                <Link
                  href="/websites"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Globe className="w-4 h-4 mr-1.5" />
                  Websites
                </Link>
                <Link
                  href="/contacts"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  Contacts
                </Link>
                <Link
                  href="/accounts"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Users className="w-4 h-4 mr-1.5" />
                  Accounts
                </Link>
                {session.role === 'admin' && (
                  <>
                    <Link
                      href="/admin/users"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <Users className="w-4 h-4 mr-1.5" />
                      Users
                    </Link>
                    <Link
                      href="/admin/account-invitations"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <Mail className="w-4 h-4 mr-1.5" />
                      Invitations
                    </Link>
                    <Link
                      href="/admin/migrate-onboarding"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <Database className="w-4 h-4 mr-1.5" />
                      Migrate Onboarding
                    </Link>
                    <Link
                      href="/admin/fix-invitations-table"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                    >
                      <Database className="w-4 h-4 mr-1.5" />
                      Fix Invitations Table
                    </Link>
                  </>
                )}
              </>
            )}
          </nav>

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900">{session.name}</div>
                {session.role === 'admin' && (
                  <div className="text-xs text-emerald-600 font-medium">Admin</div>
                )}
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-50 p-2 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}