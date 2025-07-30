'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { sessionStorage } from '@/lib/userStorage';
import { 
  Users, 
  Building2, 
  Mail, 
  Calendar,
  ExternalLink,
  Eye,
  Ban,
  CheckCircle,
  Clock,
  Search,
  Filter
} from 'lucide-react';

interface Account {
  id: string;
  email: string;
  contactName: string;
  companyName: string;
  status: 'active' | 'pending' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
  primaryClient?: {
    id: string;
    name: string;
    website: string;
  };
  orderCount?: number;
  totalRevenue?: number;
}

export default function AccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'revenue'>('recent');

  useEffect(() => {
    // Check if user is internal
    const session = sessionStorage.getSession();
    if (!session || session.userType !== 'internal') {
      router.push('/');
      return;
    }
    
    loadAdvertisers();
  }, []);

  const loadAdvertisers = async () => {
    try {
      const response = await fetch('/api/advertisers');
      if (response.ok) {
        const data = await response.json();
        setAdvertisers(data.advertisers || []);
      }
    } catch (error) {
      console.error('Error loading advertisers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAdvertiserStatus = async (advertiserId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/advertisers/${advertiserId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        await loadAdvertisers();
      }
    } catch (error) {
      console.error('Error updating advertiser status:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <Ban className="w-3 h-3 mr-1" />
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100);
  };

  // Filter and sort advertisers
  const filteredAdvertisers = advertisers
    .filter(advertiser => {
      const matchesSearch = searchTerm === '' || 
        advertiser.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advertiser.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        advertiser.email.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || advertiser.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.companyName.localeCompare(b.companyName);
        case 'revenue':
          return (b.totalRevenue || 0) - (a.totalRevenue || 0);
        case 'recent':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  if (loading) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Advertiser Management</h1>
            <p className="text-gray-600 mt-1">
              Manage advertiser accounts and access their client data
            </p>
          </div>

          {/* Filters and Search */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name, company, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="pending">Pending</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
              
              <div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="recent">Most Recent</option>
                  <option value="name">Company Name</option>
                  <option value="revenue">Total Revenue</option>
                </select>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Users className="w-10 h-10 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Advertisers</p>
                  <p className="text-2xl font-bold text-gray-900">{advertisers.length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="w-10 h-10 text-green-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Active</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {advertisers.filter(a => a.status === 'active').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="w-10 h-10 text-yellow-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {advertisers.filter(a => a.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Ban className="w-10 h-10 text-red-500 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Suspended</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {advertisers.filter(a => a.status === 'suspended').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Advertisers Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Advertiser
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAdvertisers.map((advertiser) => (
                  <tr key={advertiser.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {advertiser.contactName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {advertiser.companyName}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Mail className="w-3 h-3 mr-1" />
                          {advertiser.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {advertiser.primaryClient ? (
                        <Link
                          href={`/clients/${advertiser.primaryClient.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Building2 className="w-3 h-3 mr-1" />
                          {advertiser.primaryClient.name}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      ) : (
                        <span className="text-sm text-gray-400">No client</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(advertiser.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {advertiser.orderCount || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {advertiser.totalRevenue ? formatCurrency(advertiser.totalRevenue) : '$0.00'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {advertiser.lastLoginAt ? (
                          <>
                            <Calendar className="w-3 h-3 inline mr-1" />
                            {formatDate(advertiser.lastLoginAt)}
                          </>
                        ) : (
                          'Never'
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-3">
                        {advertiser.primaryClient && (
                          <Link
                            href={`/clients/${advertiser.primaryClient.id}`}
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                            title="View Client"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        )}
                        
                        {advertiser.status === 'pending' && (
                          <button
                            onClick={() => updateAdvertiserStatus(advertiser.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="Activate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                        
                        {advertiser.status === 'active' && (
                          <button
                            onClick={() => updateAdvertiserStatus(advertiser.id, 'suspended')}
                            className="text-red-600 hover:text-red-900"
                            title="Suspend"
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                        
                        {advertiser.status === 'suspended' && (
                          <button
                            onClick={() => updateAdvertiserStatus(advertiser.id, 'active')}
                            className="text-green-600 hover:text-green-900"
                            title="Reactivate"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {filteredAdvertisers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No advertisers found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}