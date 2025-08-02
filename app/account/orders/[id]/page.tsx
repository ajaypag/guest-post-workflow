'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { AuthService } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Building, Package, Plus, X, ChevronDown, ChevronUp, ChevronRight,
  Search, Target, Link as LinkIcon, Type, CheckCircle, CheckCircle2,
  AlertCircle, Copy, Trash2, User, Globe, ExternalLink, Loader2,
  ArrowLeft, Clock, Users, FileText, DollarSign, ShoppingCart,
  ThumbsUp, ThumbsDown, MessageSquare, RefreshCw, Send
} from 'lucide-react';

// Import column components
import OrderDetailsColumn from '@/components/orders/columns/OrderDetailsColumn';
import ClientSelectionColumn from '@/components/orders/columns/ClientSelectionColumn';
import TargetPageColumn from '@/components/orders/columns/TargetPageColumn';
import OrderSummaryColumn from '@/components/orders/columns/OrderSummaryColumn';
import SiteReviewColumn from '@/components/orders/columns/SiteReviewColumn';
import WorkflowProgressColumn from '@/components/orders/columns/WorkflowProgressColumn';
import OrderStatusColumn from '@/components/orders/columns/OrderStatusColumn';

interface OrderData {
  id: string;
  accountId?: string;
  accountEmail: string;
  accountName: string;
  accountCompany?: string;
  orderType: string;
  status: string;
  state?: string;
  subtotalRetail: number;
  discountPercent: string;
  discountAmount: number;
  totalRetail: number;
  totalWholesale: number;
  profitMargin: number;
  includesClientReview: boolean;
  clientReviewFee: number;
  rushDelivery: boolean;
  rushFee: number;
  internalNotes?: string;
  accountNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  assignedTo?: string;
  orderGroups: any[];
  lineItems?: any[];
}

type ColumnType = 'left' | 'middle' | 'right';

interface ColumnConfig {
  left: React.ComponentType<any> | null;
  middle: React.ComponentType<any> | null;
  right: React.ComponentType<any>;
  leftTitle?: string;
  middleTitle?: string;
  rightTitle?: string;
}

// Define column configurations for external users only
const getColumnConfig = (
  status: string, 
  state: string | undefined,
  isNewOrder: boolean
): ColumnConfig => {
  // New order creation (external user flow)
  if (isNewOrder) {
    return {
      left: ClientSelectionColumn,
      middle: TargetPageColumn,
      right: OrderDetailsColumn,
      leftTitle: 'Select Brands',
      middleTitle: 'Target Pages',
      rightTitle: 'Order Details'
    };
  }

  // Existing order views for external users
  const configs: Record<string, ColumnConfig> = {
    // Draft - ready to confirm
    'draft': {
      left: OrderSummaryColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Order Summary',
      rightTitle: 'Order Details'
    },
    
    // Pending confirmation - waiting for internal team
    'pending_confirmation': {
      left: OrderStatusColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Order Status',
      rightTitle: 'Order Details'
    },
    
    // Confirmed - internal team is finding sites
    'confirmed': {
      left: OrderStatusColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Order Progress',
      rightTitle: 'Order Details'
    },
    
    // Sites ready - client can review
    'sites_ready': {
      left: SiteReviewColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Review & Approve Sites',
      rightTitle: 'Order Details'
    },
    
    // Client reviewing sites
    'client_reviewing': {
      left: SiteReviewColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Review & Approve Sites',
      rightTitle: 'Order Details'
    },
    
    // Client approved - awaiting payment
    'client_approved': {
      left: OrderStatusColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Awaiting Payment',
      rightTitle: 'Order Details'
    },
    
    // Paid/In Progress - content creation
    'paid': {
      left: WorkflowProgressColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Content Creation Progress',
      rightTitle: 'Order Details'
    },
    
    'in_progress': {
      left: WorkflowProgressColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Content Creation Progress',
      rightTitle: 'Order Details'
    },
    
    // Completed
    'completed': {
      left: WorkflowProgressColumn,
      middle: null,
      right: OrderDetailsColumn,
      leftTitle: 'Completed Deliverables',
      rightTitle: 'Order Details'
    }
  };

  return configs[status] || configs['draft'];
};

export default function UnifiedAccountOrderPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const isNewOrder = orderId === 'new';
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Mobile view state
  const [mobileView, setMobileView] = useState<'left' | 'middle' | 'right'>('left');
  
  useEffect(() => {
    const loadSession = async () => {
      const userSession = await AuthService.getSession();
      
      // Ensure only external users can access this page
      if (userSession?.userType !== 'account') {
        router.push('/auth/login');
        return;
      }
      
      setSession(userSession);
    };
    loadSession();
  }, []);
  
  useEffect(() => {
    if (!isNewOrder && orderId && session) {
      loadOrder();
      
      // Auto-refresh for status monitoring
      const interval = setInterval(() => {
        if (order && ['pending_confirmation', 'confirmed', 'sites_ready', 'client_reviewing', 'client_approved'].includes(order.status)) {
          loadOrder(true);
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [orderId, isNewOrder, session]);
  
  const loadOrder = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      else setRefreshing(true);
      
      const response = await fetch(`/api/orders/${orderId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('Order not found');
          return;
        }
        if (response.status === 403) {
          setError('You do not have permission to view this order');
          return;
        }
        throw new Error('Failed to load order');
      }
      
      const data = await response.json();
      setOrder(data);
      
    } catch (error) {
      console.error('Error loading order:', error);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Get column configuration based on current state
  const columnConfig = getColumnConfig(
    order?.status || 'draft',
    order?.state,
    isNewOrder
  );
  
  // Handle order updates from child components
  const handleOrderUpdate = (updates: Partial<OrderData>) => {
    if (order) {
      setOrder({ ...order, ...updates });
    }
  };
  
  // Handle navigation between columns on mobile
  const getVisibleColumns = () => {
    const columns = [];
    if (columnConfig.left) columns.push('left');
    if (columnConfig.middle) columns.push('middle');
    columns.push('right'); // Right column always exists for external users
    return columns;
  };
  
  const visibleColumns = getVisibleColumns();
  
  if (loading && !isNewOrder) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-600">Loading order details...</span>
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }
  
  if (error) {
    return (
      <AuthWrapper>
        <div className="min-h-screen bg-gray-100">
          <Header />
          <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="bg-white rounded-lg shadow-md p-8">
              <div className="flex flex-col items-center">
                <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                <p className="text-gray-900 font-medium mb-2">{error}</p>
                <button
                  onClick={() => router.push('/account/orders')}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Back to Orders
                </button>
              </div>
            </div>
          </div>
        </div>
      </AuthWrapper>
    );
  }
  
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <Header />
        
        {/* Top Bar with Order Info and Status */}
        {!isNewOrder && order && (
          <div className="bg-white border-b px-4 py-3">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => router.push('/account/orders')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Order #{order.id.slice(0, 8)}
                  </h1>
                  <p className="text-sm text-gray-600">
                    Created {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                {/* Status Badge */}
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  order.status === 'paid' || order.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  order.status === 'sites_ready' || order.status === 'client_reviewing' ? 'bg-purple-100 text-purple-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status === 'pending_confirmation' ? 'Awaiting Confirmation' :
                   order.status === 'confirmed' ? 'Finding Sites' :
                   order.status === 'sites_ready' ? 'Sites Ready for Review' :
                   order.status === 'client_reviewing' ? 'Reviewing Sites' :
                   order.status === 'client_approved' ? 'Awaiting Payment' :
                   order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </div>
                
                {/* Refresh button for certain statuses */}
                {['pending_confirmation', 'confirmed', 'sites_ready', 'client_reviewing'].includes(order.status) && (
                  <button
                    onClick={() => loadOrder(true)}
                    className={`p-2 text-gray-600 hover:text-gray-900 ${refreshing ? 'animate-spin' : ''}`}
                    title="Refresh order"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                
                {/* Total Price */}
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatCurrency(order.totalRetail / 100)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Navigation (shown on small screens) */}
        <div className="md:hidden bg-white border-b border-gray-200">
          <div className="flex">
            {visibleColumns.map((col) => (
              <button
                key={col}
                onClick={() => setMobileView(col as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  mobileView === col 
                    ? 'text-blue-600 border-blue-600' 
                    : 'text-gray-600 border-transparent hover:text-gray-900'
                }`}
              >
                {col === 'left' && columnConfig.leftTitle}
                {col === 'middle' && columnConfig.middleTitle}
                {col === 'right' && columnConfig.rightTitle}
              </button>
            ))}
          </div>
        </div>
        
        {/* Main Content Area - Adaptive Columns */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 flex gap-4 p-4 max-w-7xl mx-auto w-full">
            {/* Left Column */}
            {columnConfig.left && (
              <div className={`bg-white rounded-lg shadow-sm flex flex-col ${
                visibleColumns.length === 3 ? 'w-full md:w-1/3' : 
                visibleColumns.length === 2 ? 'w-full md:w-1/2' : 
                'w-full'
              } ${mobileView === 'left' ? 'block md:block' : 'hidden md:block'}`}>
                <columnConfig.left
                  order={order}
                  isNewOrder={isNewOrder}
                  session={session}
                  onOrderUpdate={handleOrderUpdate}
                  onNavigate={(view: string) => setMobileView(view as any)}
                />
              </div>
            )}
            
            {/* Middle Column */}
            {columnConfig.middle && (
              <div className={`bg-white rounded-lg shadow-sm flex flex-col ${
                visibleColumns.length === 3 ? 'w-full md:w-1/3' : 
                visibleColumns.length === 2 ? 'w-full md:w-1/2' : 
                'w-full'
              } ${mobileView === 'middle' ? 'block md:block' : 'hidden md:block'}`}>
                <columnConfig.middle
                  order={order}
                  isNewOrder={isNewOrder}
                  session={session}
                  onOrderUpdate={handleOrderUpdate}
                  onNavigate={(view: string) => setMobileView(view as any)}
                />
              </div>
            )}
            
            {/* Right Column - Always Present (Order Details) */}
            <div className={`bg-white rounded-lg shadow-sm flex flex-col ${
              visibleColumns.length === 3 ? 'w-full md:w-1/3' : 
              visibleColumns.length === 2 ? 'w-full md:w-1/2' : 
              'w-full'
            } ${mobileView === 'right' ? 'block md:block' : 'hidden md:block'}`}>
              <columnConfig.right
                order={order}
                isNewOrder={isNewOrder}
                session={session}
                onOrderUpdate={handleOrderUpdate}
                onNavigate={(view: string) => setMobileView(view as any)}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}