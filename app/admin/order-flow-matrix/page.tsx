'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, Info, Eye, EyeOff, Shield, Users, 
  CheckCircle, XCircle, AlertTriangle, FileText,
  Activity, DollarSign, Package, Clock, Settings,
  GitBranch, Database, Code, Zap
} from 'lucide-react';
import Header from '@/components/Header';
import AuthWrapper from '@/components/AuthWrapper';

type UserType = 'internal' | 'external';
type ViewMode = 'matrix' | 'lifecycle' | 'technical';

interface StateConfig {
  status: string;
  state?: string;
  internalView: string;
  externalView: string;
  internalActions: string[];
  externalActions: string[];
  riskLevel?: 'low' | 'medium' | 'high';
  technicalNotes?: string;
}

const orderStates: StateConfig[] = [
  {
    status: 'draft',
    state: 'configuring',
    internalView: 'Full order details with editing capabilities',
    externalView: 'Full order details (if owner)',
    internalActions: ['Edit Order', 'Delete Order', 'Submit Order', 'Add/Remove Items', 'Transfer Ownership'],
    externalActions: ['Edit Order (if owner)', 'Submit Order'],
    riskLevel: 'low'
  },
  {
    status: 'pending_confirmation',
    state: '-',
    internalView: 'Full details with "Awaiting Confirmation" badge',
    externalView: '"Order Submitted Successfully" message',
    internalActions: ['Confirm Order', 'Edit Order', 'Delete Order (admin)', 'Transfer Ownership'],
    externalActions: ['View Status Only'],
    riskLevel: 'low'
  },
  {
    status: 'confirmed',
    state: 'analyzing / finding_sites',
    internalView: '"Finding Sites" status with bulk analysis project links',
    externalView: '"Analysis in Progress" with 24-48hr timeline',
    internalActions: ['Mark Sites Ready', 'View Analysis Projects', 'Add Notes'],
    externalActions: ['View Status', 'Refresh Page'],
    riskLevel: 'medium',
    technicalNotes: 'Duplicate states: analyzing = finding_sites (technical debt)'
  },
  {
    status: 'confirmed',
    state: 'sites_ready / site_review',
    internalView: 'Site submission table with review controls',
    externalView: '"Sites Ready for Review" with site counts',
    internalActions: ['Approve/Reject Sites', 'Edit Submissions', 'Generate Invoice', 'Add Comments'],
    externalActions: ['Review Sites', 'Approve Sites', 'Reject Sites', 'Request Changes'],
    riskLevel: 'medium',
    technicalNotes: 'Duplicate states: sites_ready = site_review (technical debt)'
  },
  {
    status: 'confirmed',
    state: 'client_reviewing',
    internalView: 'Sites under client review status',
    externalView: 'Active review interface with site cards',
    internalActions: ['Monitor Progress', 'Edit Submissions', 'Send Reminders'],
    externalActions: ['Approve/Reject Sites', 'Organize Sites', 'Add Comments'],
    riskLevel: 'low'
  },
  {
    status: 'confirmed',
    state: 'payment_pending',
    internalView: 'Invoice ready status with payment tracking',
    externalView: '"Invoice Ready for Payment" with download link',
    internalActions: ['View Invoice', 'Mark as Paid', 'Send Payment Reminder'],
    externalActions: ['View Invoice', 'Download Invoice', 'Make Payment'],
    riskLevel: 'medium'
  },
  {
    status: 'paid',
    state: 'payment_received',
    internalView: 'Payment confirmed, workflow generation pending',
    externalView: '"Payment received, content creation starting"',
    internalActions: ['Create Workflows', 'Monitor Status', 'Assign Writers'],
    externalActions: ['View Status'],
    riskLevel: 'low'
  },
  {
    status: 'paid',
    state: 'workflows_generated',
    internalView: 'Workflows created with direct links',
    externalView: '"Content creation has started"',
    internalActions: ['Manage Workflows', 'View Progress', 'Reassign Tasks'],
    externalActions: ['View Progress'],
    riskLevel: 'low'
  },
  {
    status: 'in_progress',
    state: 'in_progress / content_creation',
    internalView: 'Detailed workflow progress tracking',
    externalView: '"Creating Your Content" with progress bar',
    internalActions: ['Monitor Workflows', 'Update Status', 'Manage Issues'],
    externalActions: ['View Progress', 'View Timeline'],
    riskLevel: 'high',
    technicalNotes: 'Status/state overlap: in_progress exists as both (technical debt)'
  },
  {
    status: 'completed',
    state: '-',
    internalView: 'All deliverables with article links and reports',
    externalView: '"Order Complete" with deliverable links',
    internalActions: ['View Articles', 'Generate Reports', 'Export Data'],
    externalActions: ['View Deliverables', 'Download Content'],
    riskLevel: 'low'
  },
  {
    status: 'cancelled',
    state: '-',
    internalView: 'Cancellation reason and history',
    externalView: 'Order cancelled notice',
    internalActions: ['View Reason', 'Restore Order (admin)', 'Generate Report'],
    externalActions: ['View Reason'],
    riskLevel: 'low'
  }
];

const technicalDebt = [
  {
    issue: 'Dual Architecture',
    description: 'Orders use both orderGroups/orderItems (legacy) and orderLineItems (new)',
    impact: 'high',
    files: ['orderSchema.ts', 'orderService.ts', 'order pages']
  },
  {
    issue: 'Duplicate States',
    description: 'Multiple state values mean the same thing (analyzing = finding_sites)',
    impact: 'medium',
    files: ['orderSchema.ts']
  },
  {
    issue: 'Status/State Overlap',
    description: 'in_progress exists as both a status and a state',
    impact: 'medium',
    files: ['orderSchema.ts', 'OrderProgressSteps.tsx']
  },
  {
    issue: 'Non-atomic Transitions',
    description: 'Status and state updates are not atomic, can get out of sync',
    impact: 'high',
    files: ['orderService.ts', 'API routes']
  },
  {
    issue: 'Missing Validation',
    description: 'No validation for valid status/state combinations',
    impact: 'medium',
    files: ['API routes']
  }
];

const keyFiles = [
  { path: '/lib/db/orderSchema.ts', lines: '18-19', description: 'Status/State enum definitions' },
  { path: '/lib/services/orderService.ts', lines: '319-361', description: 'Core status transition logic' },
  { path: '/app/orders/[id]/page.tsx', lines: '28-96', description: 'Internal order view' },
  { path: '/app/account/orders/[id]/status/page.tsx', lines: '74-97', description: 'External order view' },
  { path: '/components/orders/OrderProgressSteps.tsx', lines: '61-98', description: 'Progress visualization' },
  { path: '/app/api/orders/route.ts', lines: '32-57', description: 'Permission checks' }
];

export default function OrderFlowMatrixPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('matrix');
  const [selectedUserType, setSelectedUserType] = useState<UserType | 'both'>('both');
  const [expandedState, setExpandedState] = useState<string | null>(null);

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/admin"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Link>
            
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <GitBranch className="w-8 h-8 text-indigo-600 mr-3" />
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                      Order Flow Visibility Matrix
                    </h1>
                    <p className="text-gray-600 mt-1">
                      Complete status/stage permissions and visibility reference
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setViewMode('matrix')}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === 'matrix' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Activity className="w-4 h-4 inline mr-2" />
                    Matrix View
                  </button>
                  <button
                    onClick={() => setViewMode('lifecycle')}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === 'lifecycle' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Lifecycle
                  </button>
                  <button
                    onClick={() => setViewMode('technical')}
                    className={`px-4 py-2 rounded-lg ${
                      viewMode === 'technical' 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Code className="w-4 h-4 inline mr-2" />
                    Technical
                  </button>
                </div>
              </div>

              {/* User Type Filter */}
              <div className="flex items-center gap-4 pt-4 border-t">
                <span className="text-sm font-medium text-gray-700">View as:</span>
                <button
                  onClick={() => setSelectedUserType('both')}
                  className={`px-3 py-1 rounded ${
                    selectedUserType === 'both' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Both Views
                </button>
                <button
                  onClick={() => setSelectedUserType('internal')}
                  className={`px-3 py-1 rounded ${
                    selectedUserType === 'internal' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Shield className="w-4 h-4 inline mr-1" />
                  Internal Only
                </button>
                <button
                  onClick={() => setSelectedUserType('external')}
                  className={`px-3 py-1 rounded ${
                    selectedUserType === 'external' 
                      ? 'bg-indigo-100 text-indigo-700' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  External Only
                </button>
              </div>
            </div>
          </div>

          {/* Matrix View */}
          {viewMode === 'matrix' && (
            <div className="space-y-4">
              {orderStates.map((state, idx) => {
                const stateKey = `${state.status}-${state.state}`;
                const isExpanded = expandedState === stateKey;
                
                return (
                  <div 
                    key={idx}
                    className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedState(isExpanded ? null : stateKey)}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">
                              {state.status.toUpperCase()}
                            </span>
                            {state.state !== '-' && (
                              <>
                                <span className="text-gray-400">/</span>
                                <span className="text-gray-600">
                                  {state.state}
                                </span>
                              </>
                            )}
                          </div>
                          {state.technicalNotes && (
                            <span className={`mt-1 text-xs px-2 py-0.5 rounded ${getRiskColor(state.riskLevel)}`}>
                              ⚠️ {state.technicalNotes}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {state.riskLevel && (
                          <span className={`text-xs px-2 py-1 rounded border ${getRiskColor(state.riskLevel)}`}>
                            {state.riskLevel} risk
                          </span>
                        )}
                        <Info className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="px-6 py-4 border-t border-gray-100">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Internal View */}
                          {(selectedUserType === 'both' || selectedUserType === 'internal') && (
                            <div className="space-y-3">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <Shield className="w-4 h-4 mr-2 text-indigo-600" />
                                Internal View
                              </h3>
                              <div className="bg-indigo-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{state.internalView}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Actions:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {state.internalActions.map((action, i) => (
                                    <span 
                                      key={i}
                                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                                    >
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* External View */}
                          {(selectedUserType === 'both' || selectedUserType === 'external') && (
                            <div className="space-y-3">
                              <h3 className="font-semibold text-gray-900 flex items-center">
                                <Users className="w-4 h-4 mr-2 text-green-600" />
                                External View (Advertiser)
                              </h3>
                              <div className="bg-green-50 rounded-lg p-3">
                                <p className="text-sm text-gray-700">{state.externalView}</p>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Actions:</h4>
                                <div className="flex flex-wrap gap-2">
                                  {state.externalActions.map((action, i) => (
                                    <span 
                                      key={i}
                                      className="px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-700"
                                    >
                                      {action}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Lifecycle View */}
          {viewMode === 'lifecycle' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Lifecycle Flow</h2>
              
              {/* Main Flow */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-center flex-1">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                    <div className="font-medium">DRAFT</div>
                    <div className="text-xs text-gray-500 mt-1">Creating order</div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center flex-1">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-600" />
                    <div className="font-medium">PENDING</div>
                    <div className="text-xs text-gray-500 mt-1">Awaiting confirmation</div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center flex-1">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                    <div className="font-medium">CONFIRMED</div>
                    <div className="text-xs text-gray-500 mt-1">Processing</div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center flex-1">
                    <DollarSign className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium">PAID</div>
                    <div className="text-xs text-gray-500 mt-1">Payment received</div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center flex-1">
                    <Activity className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                    <div className="font-medium">IN PROGRESS</div>
                    <div className="text-xs text-gray-500 mt-1">Creating content</div>
                  </div>
                  <div className="text-gray-400">→</div>
                  <div className="text-center flex-1">
                    <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <div className="font-medium">COMPLETED</div>
                    <div className="text-xs text-gray-500 mt-1">Delivered</div>
                  </div>
                </div>
              </div>

              {/* Confirmed Sub-states */}
              <div>
                <h3 className="font-medium text-gray-700 mb-3">Confirmed Status Sub-states:</h3>
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="px-3 py-1 bg-white rounded-full text-sm">analyzing</span>
                    <span className="text-blue-600">→</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm">site_review</span>
                    <span className="text-blue-600">→</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm">client_reviewing</span>
                    <span className="text-blue-600">→</span>
                    <span className="px-3 py-1 bg-white rounded-full text-sm">payment_pending</span>
                  </div>
                </div>
              </div>

              {/* Risk Indicators */}
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h3 className="font-medium text-yellow-900 mb-2">⚠️ Transition Risks</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Status and state changes are not atomic (can get out of sync)</li>
                  <li>• No validation for valid status/state combinations</li>
                  <li>• Dual system means some orders may have incomplete data</li>
                </ul>
              </div>
            </div>
          )}

          {/* Technical View */}
          {viewMode === 'technical' && (
            <div className="space-y-6">
              {/* Technical Debt */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Technical Debt & Issues</h2>
                <div className="space-y-3">
                  {technicalDebt.map((debt, idx) => (
                    <div key={idx} className="border-l-4 border-red-400 pl-4 py-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{debt.issue}</h3>
                          <p className="text-sm text-gray-600 mt-1">{debt.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className={`text-xs px-2 py-1 rounded ${getImpactColor(debt.impact)}`}>
                              {debt.impact} impact
                            </span>
                            <span className="text-xs text-gray-500">
                              Files: {debt.files.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Files */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Implementation Files</h2>
                <div className="space-y-2">
                  {keyFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <code className="text-sm font-mono text-indigo-600">{file.path}</code>
                        <span className="text-xs text-gray-500 ml-2">Lines {file.lines}</span>
                      </div>
                      <span className="text-sm text-gray-600">{file.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h2>
                
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Short-term Cleanup</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>✓ Consolidate duplicate states (analyzing = finding_sites)</li>
                      <li>✓ Add status/state validation in API endpoints</li>
                      <li>✓ Create migration status tracking dashboard</li>
                      <li>✓ Document valid status/state combinations</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Long-term Consolidation</h3>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Merge status and state into single state machine</li>
                      <li>• Complete migration from orderGroups to orderLineItems</li>
                      <li>• Remove legacy system code paths</li>
                      <li>• Implement atomic state transitions</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                    <h3 className="font-medium text-indigo-900 mb-2">Proposed Simplified State Machine</h3>
                    <pre className="text-xs bg-white p-3 rounded border border-indigo-200 overflow-x-auto">
{`enum OrderStatus {
  DRAFT = 'draft',
  AWAITING_CONFIRMATION = 'awaiting_confirmation',
  FINDING_SITES = 'finding_sites',
  SITE_REVIEW = 'site_review',
  AWAITING_PAYMENT = 'awaiting_payment',
  CREATING_CONTENT = 'creating_content',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}`}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AuthWrapper>
  );
}