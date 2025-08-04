'use client';

import React, { useState, useEffect } from 'react';
import { formatCurrency } from '@/lib/utils/formatting';
import { 
  Globe, LinkIcon, Edit, Trash2, Plus, ChevronDown, ChevronRight,
  Building, Target, Package, User, ExternalLink, Eye, AlertCircle,
  CheckCircle, Clock, PlayCircle, FileText, Zap
} from 'lucide-react';

interface OrderGroup {
  id: string;
  clientId: string;
  client: {
    id: string;
    name: string;
    website: string;
  };
  linkCount: number;
  bulkAnalysisProjectId?: string;
  targetPages?: Array<{
    id?: string;
    url: string;
    pageId?: string;
  }>;
  anchorTexts?: string[];
  packageType?: string;
  packagePrice?: number;
  groupStatus?: string;
  siteSelections?: {
    approved: number;
    pending: number;
    total: number;
  };
}

interface SiteSubmission {
  id: string;
  orderGroupId: string;
  domainId: string;
  domain: {
    id: string;
    domain: string;
    qualificationStatus?: string;
    notes?: string;
  } | null;
  domainRating?: number;
  traffic?: number;
  price: number;
  status: 'pending' | 'submitted' | 'approved' | 'rejected' | 'client_approved' | 'client_rejected';
  submissionStatus?: string;
  clientApprovedAt?: string;
  clientRejectedAt?: string;
  clientReviewedAt?: string;
  clientReviewNotes?: string;
  specialInstructions?: string;
  targetPageUrl?: string;
  anchorText?: string;
  createdAt?: string;
  selectionPool?: 'primary' | 'alternative';
  poolRank?: number;
  metadata?: {
    targetPageUrl?: string;
    anchorText?: string;
    specialInstructions?: string;
    [key: string]: any;
  };
}

interface UnifiedOrderTableProps {
  orderGroups: OrderGroup[];
  siteSubmissions: Record<string, SiteSubmission[]>;
  userType: 'internal' | 'external' | 'account';
  orderStatus: string;
  orderState?: string;
  isPaid: boolean;
  onUpdateGroup?: (groupId: string, updates: Partial<OrderGroup>) => void;
  onAddRow?: (clientId: string) => void;
  onRemoveRow?: (groupId: string, linkIndex: number) => void;
  onSwitchDomain?: (submissionId: string, groupId: string) => void;
  onUpdateSubmission?: (submissionId: string, updates: any) => void;
}

export default function UnifiedOrderTable({
  orderGroups,
  siteSubmissions,
  userType,
  orderStatus,
  orderState,
  isPaid,
  onUpdateGroup,
  onAddRow,
  onRemoveRow,
  onSwitchDomain,
  onUpdateSubmission
}: UnifiedOrderTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{groupId: string, linkIndex: number, field: string} | null>(null);
  
  // Determine what features are available based on order state
  const features = {
    basicEditing: !isPaid, // Can edit basic info until payment
    siteManagement: orderState !== 'draft' && siteSubmissions && Object.keys(siteSubmissions).length > 0,
    statusTracking: orderState === 'in_progress' || orderStatus === 'completed',
    addRemoveRows: !isPaid && (userType === 'internal' || orderStatus === 'draft'),
    bulkActions: userType === 'internal'
  };

  const toggleRowExpansion = (rowKey: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowKey)) {
      newExpanded.delete(rowKey);
    } else {
      newExpanded.add(rowKey);
    }
    setExpandedRows(newExpanded);
  };

  const handleCellEdit = (groupId: string, linkIndex: number, field: string, value: any) => {
    if (!features.basicEditing) return;
    
    const group = orderGroups.find(g => g.id === groupId);
    if (!group) return;

    // Handle different field types
    let updates: Partial<OrderGroup> = {};
    
    switch (field) {
      case 'targetPage':
        const newTargetPages = [...(group.targetPages || [])];
        newTargetPages[linkIndex] = { ...newTargetPages[linkIndex], url: value };
        updates.targetPages = newTargetPages;
        break;
      
      case 'anchorText':
        const newAnchorTexts = [...(group.anchorTexts || [])];
        newAnchorTexts[linkIndex] = value;
        updates.anchorTexts = newAnchorTexts;
        break;
      
      case 'package':
        updates.packageType = value;
        updates.packagePrice = getPackagePrice(value);
        break;
    }

    onUpdateGroup?.(groupId, updates);
    setEditingCell(null);
  };

  const getPackagePrice = (packageType: string) => {
    const pricing = {
      'good': 230,
      'better': 279, 
      'best': 349
    };
    return (pricing as any)[packageType] || 279;
  };

  const renderEditableCell = (
    groupId: string, 
    linkIndex: number, 
    field: string, 
    value: any, 
    isEditing: boolean
  ) => {
    if (!features.basicEditing || !isEditing) {
      return <span>{value || '-'}</span>;
    }

    switch (field) {
      case 'targetPage':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCellEdit(groupId, linkIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        );
      
      case 'anchorText':
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleCellEdit(groupId, linkIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        );
      
      case 'package':
        return (
          <select
            value={value || 'better'}
            onChange={(e) => handleCellEdit(groupId, linkIndex, field, e.target.value)}
            onBlur={() => setEditingCell(null)}
            className="w-full px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-blue-500"
            autoFocus
          >
            <option value="good">Good ($230)</option>
            <option value="better">Better ($279)</option>
            <option value="best">Best ($349)</option>
          </select>
        );
      
      default:
        return <span>{value || '-'}</span>;
    }
  };

  const renderSiteManagement = (groupId: string, linkIndex: number, targetPageUrl?: string) => {
    if (!features.siteManagement) return null;

    const groupSubmissions = siteSubmissions[groupId] || [];
    const matchingSubmissions = groupSubmissions.filter(sub => 
      sub.targetPageUrl === targetPageUrl || sub.metadata?.targetPageUrl === targetPageUrl
    );

    const primarySubmission = matchingSubmissions.find(sub => sub.selectionPool === 'primary');
    const alternativeSubmissions = matchingSubmissions.filter(sub => sub.selectionPool === 'alternative');
    
    const rowKey = `${groupId}-${linkIndex}`;
    const isExpanded = expandedRows.has(rowKey);

    return (
      <div className="space-y-2">
        {/* Primary Selection */}
        {primarySubmission && (
          <div className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">
                {primarySubmission.domain?.domain || 'Unknown'}
              </span>
              {primarySubmission.domainRating && (
                <span className="text-xs text-gray-600">DR: {primarySubmission.domainRating}</span>
              )}
              <span className="text-sm font-medium">{formatCurrency(primarySubmission.price)}</span>
            </div>
            {alternativeSubmissions.length > 0 && features.basicEditing && (
              <button
                onClick={() => onSwitchDomain?.(primarySubmission.id, groupId)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Switch
              </button>
            )}
          </div>
        )}

        {/* Alternatives Toggle */}
        {alternativeSubmissions.length > 0 && (
          <button
            onClick={() => toggleRowExpansion(rowKey)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
          >
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {alternativeSubmissions.length} alternatives
          </button>
        )}

        {/* Expanded Alternatives */}
        {isExpanded && alternativeSubmissions.map((submission) => (
          <div key={submission.id} className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded ml-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-400" />
              <span className="text-sm">
                {submission.domain?.domain || 'Unknown'}
              </span>
              {submission.domainRating && (
                <span className="text-xs text-gray-600">DR: {submission.domainRating}</span>
              )}
              <span className="text-sm">{formatCurrency(submission.price)}</span>
            </div>
            {features.basicEditing && (
              <button
                onClick={() => onSwitchDomain?.(submission.id, groupId)}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Make Primary
              </button>
            )}
          </div>
        ))}
      </div>
    );
  };

  const getColumnHeaders = () => {
    const headers = ['Client / Target Page', 'Anchor Text'];
    
    if (features.siteManagement) {
      headers.push('Guest Post Site');
    } else {
      headers.push('Package');
    }
    
    if (features.statusTracking) {
      headers.push('Status');
    }
    
    headers.push('Price');
    
    if (features.addRemoveRows) {
      headers.push('Actions');
    }
    
    return headers;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {getColumnHeaders().map((header, index) => (
                <th
                  key={index}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orderGroups.map((group) => (
              Array.from({ length: group.linkCount }).map((_, linkIndex) => {
                const targetPageUrl = group.targetPages?.[linkIndex]?.url;
                const anchorText = group.anchorTexts?.[linkIndex];
                const rowKey = `${group.id}-${linkIndex}`;
                
                return (
                  <tr key={rowKey} className="hover:bg-gray-50">
                    {/* Client / Target Page */}
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">
                            {group.client.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-6">
                          <Target className="h-3 w-3 text-gray-400" />
                          {features.basicEditing ? (
                            <button
                              onClick={() => setEditingCell({
                                groupId: group.id,
                                linkIndex,
                                field: 'targetPage'
                              })}
                              className="text-sm text-gray-700 hover:text-gray-900 truncate max-w-xs"
                            >
                              {targetPageUrl || 'Click to add target page'}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-700 truncate max-w-xs">
                              {targetPageUrl || '-'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Editing overlay */}
                      {editingCell?.groupId === group.id && 
                       editingCell?.linkIndex === linkIndex && 
                       editingCell?.field === 'targetPage' && (
                        <div className="mt-2">
                          {renderEditableCell(group.id, linkIndex, 'targetPage', targetPageUrl, true)}
                        </div>
                      )}
                    </td>

                    {/* Anchor Text */}
                    <td className="px-6 py-4">
                      {editingCell?.groupId === group.id && 
                       editingCell?.linkIndex === linkIndex && 
                       editingCell?.field === 'anchorText' ? (
                        renderEditableCell(group.id, linkIndex, 'anchorText', anchorText, true)
                      ) : (
                        <div className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4 text-gray-400" />
                          {features.basicEditing ? (
                            <button
                              onClick={() => setEditingCell({
                                groupId: group.id,
                                linkIndex,
                                field: 'anchorText'
                              })}
                              className="text-sm text-gray-700 hover:text-gray-900"
                            >
                              {anchorText || 'Click to add anchor text'}
                            </button>
                          ) : (
                            <span className="text-sm text-gray-700">
                              {anchorText || '-'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Package OR Site Management */}
                    <td className="px-6 py-4">
                      {features.siteManagement ? (
                        renderSiteManagement(group.id, linkIndex, targetPageUrl)
                      ) : (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          {editingCell?.groupId === group.id && 
                           editingCell?.linkIndex === linkIndex && 
                           editingCell?.field === 'package' ? (
                            renderEditableCell(group.id, linkIndex, 'package', group.packageType, true)
                          ) : (
                            features.basicEditing ? (
                              <button
                                onClick={() => setEditingCell({
                                  groupId: group.id,
                                  linkIndex,
                                  field: 'package'
                                })}
                                className="text-sm text-gray-700 hover:text-gray-900 capitalize"
                              >
                                {group.packageType || 'better'}
                              </button>
                            ) : (
                              <span className="text-sm text-gray-700 capitalize">
                                {group.packageType || 'better'}
                              </span>
                            )
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status (if in progress) */}
                    {features.statusTracking && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-gray-700">In Progress</span>
                        </div>
                      </td>
                    )}

                    {/* Price */}
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(group.packagePrice || 279)}
                      </span>
                    </td>

                    {/* Actions */}
                    {features.addRemoveRows && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {userType === 'internal' && (
                            <button
                              onClick={() => onRemoveRow?.(group.id, linkIndex)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            ))}
            
            {/* Add Row Button */}
            {features.addRemoveRows && (
              <tr>
                <td colSpan={getColumnHeaders().length} className="px-6 py-4">
                  <button
                    onClick={() => onAddRow?.(orderGroups[0]?.clientId)}
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Row
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}