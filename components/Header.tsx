'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { sessionStorage } from '@/lib/userStorage';
import { type AuthSession } from '@/lib/auth';
import { useState, useEffect } from 'react';
import { User, LogOut, Users, Building2, Zap, Search, BarChart2, Globe, Mail, ShoppingCart, Package, Database, ChevronDown, Settings, CreditCard, HelpCircle, Menu, X, Shield, FileText } from 'lucide-react';
import NotificationBell from '@/components/ui/NotificationBell';
import ImpersonationBanner from '@/components/impersonation/ImpersonationBanner';

export default function Header() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [internalDropdownOpen, setInternalDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Set localStorage session immediately for fast render
    const localSession = sessionStorage.getSession();
    if (localSession) {
      setSession(localSession);
    }

    const fetchSession = async () => {
      try {
        const response = await fetch('/api/auth/session-state', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (data.sessionState) {
            // Update with server session state (includes impersonation data)
            setSession({
              userId: data.sessionState.currentUser.userId,
              email: data.sessionState.currentUser.email,
              userType: data.sessionState.currentUser.userType,
              clientId: data.sessionState.currentUser.clientId,
              isImpersonating: data.sessionState.impersonation?.isActive || false
            });
          } else if (!localSession) {
            // Only fallback to localStorage if we didn't already set it
            setSession(sessionStorage.getSession());
          }
        } else if (!localSession) {
          // Only fallback to localStorage if we didn't already set it
          setSession(sessionStorage.getSession());
        }
      } catch (error) {
        console.error('Error fetching session state:', error);
        // Only fallback to localStorage if we didn't already set it
        if (!localSession) {
          setSession(sessionStorage.getSession());
        }
      }
    };

    fetchSession();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setAdminDropdownOpen(false);
      setInternalDropdownOpen(false);
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
    };

    if (adminDropdownOpen || internalDropdownOpen || userDropdownOpen || mobileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [adminDropdownOpen, internalDropdownOpen, userDropdownOpen, mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    sessionStorage.clearSession();
    router.push('/login');
  };

  if (!session) return null;

  return (
    <>
      <ImpersonationBanner />
      <header className="bg-white border-b border-gray-100 relative z-40">
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
              <span className="text-lg font-semibold text-gray-900">Linkio</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
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
                  href="/vetted-sites"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Database className="w-4 h-4 mr-1.5" />
                  Vetted Sites
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
                  href="/vetted-sites"
                  className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                >
                  <Database className="w-4 h-4 mr-1.5" />
                  Vetted Sites
                </Link>

                {/* Internal Portal Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setInternalDropdownOpen(!internalDropdownOpen);
                    }}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    <Shield className="w-4 h-4 mr-1.5" />
                    Internal Portal
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${internalDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {internalDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                        Management
                      </div>
                      <Link
                        href="/internal"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setInternalDropdownOpen(false)}
                      >
                        <BarChart2 className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                      <Link
                        href="/internal/websites"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setInternalDropdownOpen(false)}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Websites
                      </Link>
                      <Link
                        href="/internal/publishers"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setInternalDropdownOpen(false)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Publishers
                      </Link>
                      <Link
                        href="/internal/tasks"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setInternalDropdownOpen(false)}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Tasks
                      </Link>
                      <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 border-t mt-1 pt-2">
                        Quick Actions
                      </div>
                      <Link
                        href="/internal/publishers/new"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setInternalDropdownOpen(false)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Add Publisher
                      </Link>
                    </div>
                  )}
                </div>
                
                {/* Admin Dropdown */}
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAdminDropdownOpen(!adminDropdownOpen);
                    }}
                    className="text-gray-600 hover:text-gray-900 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center"
                  >
                    <Settings className="w-4 h-4 mr-1.5" />
                    Admin
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {adminDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                      <Link
                        href="/websites"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Websites
                      </Link>
                      <Link
                        href="/contacts"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Contacts
                      </Link>
                      <Link
                        href="/accounts"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setAdminDropdownOpen(false)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Accounts
                      </Link>
                      {session.role === 'admin' && (
                        <>
                          <div className="border-t border-gray-100 my-1"></div>
                          <Link
                            href="/admin/users"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                            onClick={() => setAdminDropdownOpen(false)}
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Users
                          </Link>
                          <Link
                            href="/admin/account-invitations"
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                            onClick={() => setAdminDropdownOpen(false)}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Invitations
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Desktop User Menu & Mobile Menu Button */}
          <div className="flex items-center space-x-3">
            {/* Mobile menu button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMobileMenuOpen(!mobileMenuOpen);
              }}
              className="md:hidden p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Toggle mobile menu"
            >
              <Menu className="w-6 h-6 text-gray-600" />
            </button>
            {/* Notification Bell - Desktop only */}
            <div className="hidden md:block">
              <NotificationBell />
            </div>
            
            {/* User Dropdown - Desktop only */}
            <div className="relative hidden md:block">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setUserDropdownOpen(!userDropdownOpen);
                }}
                className="flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px]"
              >
                <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-gray-900">{session.name}</div>
                  {session.userType === 'account' && session.companyName && (
                    <div className="text-xs text-gray-500">{session.companyName}</div>
                  )}
                  {session.role === 'admin' && (
                    <div className="text-xs text-emerald-600 font-medium">Admin</div>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 py-2 z-50 max-w-[calc(100vw-2rem)] sm:max-w-none">
                  {session.userType === 'account' ? (
                    // Account User Menu
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{session.name}</div>
                        <div className="text-xs text-gray-500">{session.email}</div>
                        {session.companyName && (
                          <div className="text-xs text-gray-500">{session.companyName}</div>
                        )}
                      </div>
                      
                      <Link
                        href="/account/dashboard"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Dashboard
                      </Link>
                      
                      <Link
                        href="/account/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Account Settings
                      </Link>
                      
                      <Link
                        href="/billing"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Billing History
                      </Link>
                      
                      <Link
                        href="/support"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help & Support
                      </Link>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </>
                  ) : (
                    // Internal User Menu
                    <>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">{session.name}</div>
                        <div className="text-xs text-gray-500">{session.email}</div>
                        {session.role === 'admin' && (
                          <div className="text-xs text-emerald-600 font-medium">Admin Access</div>
                        )}
                      </div>
                      
                      <Link
                        href="/account/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </Link>
                      
                      <Link
                        href="/support"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        onClick={() => setUserDropdownOpen(false)}
                      >
                        <HelpCircle className="w-4 h-4 mr-2" />
                        Help & Support
                      </Link>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile Menu Overlay */}
    {mobileMenuOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden" onClick={() => setMobileMenuOpen(false)} />
    )}

    {/* Mobile Menu Drawer */}
    <div className={`fixed top-0 right-0 h-full w-72 max-w-[80vw] sm:w-80 sm:max-w-[85vw] bg-white z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
      mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
    }`}>
      <div className="flex flex-col h-full">
        {/* Mobile Menu Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">{session.name}</div>
              <div className="text-xs text-gray-500">{session.email}</div>
              {session.userType === 'account' && session.companyName && (
                <div className="text-xs text-gray-500">{session.companyName}</div>
              )}
              {session.role === 'admin' && (
                <div className="text-xs text-emerald-600 font-medium">Admin Access</div>
              )}
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Close mobile menu"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Mobile Menu Content */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Notification Bell - Mobile */}
          <div className="px-4 pb-4 border-b border-gray-100 mb-4">
            <NotificationBell />
          </div>

          {/* Mobile Navigation */}
          <nav className="px-4 space-y-1">
            {session.userType === 'account' ? (
              // Account Navigation - Mobile
              <>
                <Link
                  href="/account/dashboard"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Package className="w-5 h-5" />
                  <span className="text-base font-medium">Dashboard</span>
                </Link>
                <Link
                  href="/clients"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-base font-medium">Brands</span>
                </Link>
                <Link
                  href="/vetted-sites"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Database className="w-5 h-5" />
                  <span className="text-base font-medium">Vetted Sites</span>
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-base font-medium">My Orders</span>
                </Link>
                
                <div className="border-t border-gray-100 my-4"></div>
                
                <Link
                  href="/account/settings"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-base font-medium">Account Settings</span>
                </Link>
                <Link
                  href="/billing"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-base font-medium">Billing History</span>
                </Link>
                <Link
                  href="/support"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-base font-medium">Help & Support</span>
                </Link>
              </>
            ) : (
              // Internal Team Navigation - Mobile
              <>
                <Link
                  href="/"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Zap className="w-5 h-5" />
                  <span className="text-base font-medium">Workflows</span>
                </Link>
                <Link
                  href="/clients"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="text-base font-medium">Clients</span>
                </Link>
                <Link
                  href="/bulk-analysis"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart2 className="w-5 h-5" />
                  <span className="text-base font-medium">Bulk Analysis</span>
                </Link>
                <Link
                  href="/orders"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span className="text-base font-medium">Orders</span>
                </Link>
                <Link
                  href="/vetted-sites"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Database className="w-5 h-5" />
                  <span className="text-base font-medium">Vetted Sites</span>
                </Link>

                {/* Internal Portal Section - Mobile */}
                <div className="border-t border-gray-100 my-4"></div>
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Internal Portal</div>
                </div>
                
                <Link
                  href="/internal"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <BarChart2 className="w-5 h-5" />
                  <span className="text-base font-medium">Dashboard</span>
                </Link>
                <Link
                  href="/internal/websites"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-base font-medium">Websites</span>
                </Link>
                <Link
                  href="/internal/publishers"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-base font-medium">Publishers</span>
                </Link>
                <Link
                  href="/internal/tasks"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-base font-medium">Tasks</span>
                </Link>
                <Link
                  href="/internal/publishers/new"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-base font-medium">Add Publisher</span>
                </Link>
                
                {/* Admin Section - Mobile */}
                <div className="border-t border-gray-100 my-4"></div>
                <div className="px-4 py-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Admin</div>
                </div>
                
                <Link
                  href="/websites"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-base font-medium">Websites</span>
                </Link>
                <Link
                  href="/contacts"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Mail className="w-5 h-5" />
                  <span className="text-base font-medium">Contacts</span>
                </Link>
                <Link
                  href="/accounts"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Users className="w-5 h-5" />
                  <span className="text-base font-medium">Accounts</span>
                </Link>
                
                {session.role === 'admin' && (
                  <>
                    <div className="border-t border-gray-100 my-4"></div>
                    <div className="px-4 py-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Admin</div>
                    </div>
                    <Link
                      href="/admin/users"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Users className="w-5 h-5" />
                      <span className="text-base font-medium">Users</span>
                    </Link>
                    <Link
                      href="/admin/account-invitations"
                      className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Mail className="w-5 h-5" />
                      <span className="text-base font-medium">Invitations</span>
                    </Link>
                  </>
                )}
                
                <div className="border-t border-gray-100 my-4"></div>
                
                <Link
                  href="/account/settings"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Settings className="w-5 h-5" />
                  <span className="text-base font-medium">Settings</span>
                </Link>
                <Link
                  href="/support"
                  className="flex items-center space-x-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors min-h-[44px]"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <HelpCircle className="w-5 h-5" />
                  <span className="text-base font-medium">Help & Support</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* Mobile Menu Footer */}
        <div className="border-t border-gray-100 p-4">
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              handleLogout();
            }}
            className="flex items-center space-x-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors w-full min-h-[44px]"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-base font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </div>
    </>
  );
}