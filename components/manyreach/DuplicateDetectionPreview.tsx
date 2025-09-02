'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Users, 
  Globe, 
  DollarSign,
  AlertCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Equal
} from 'lucide-react';

interface PreviewData {
  draftId: string;
  currentState: {
    publisher?: any;
    websites: any[];
    offerings: any[];
    relationships: any[];
  };
  proposedActions: {
    publisherAction: 'create' | 'update' | 'skip';
    publisherDetails?: any;
    websiteActions: Array<{
      action: 'create' | 'exists' | 'update';
      domain: string;
      details?: any;
      existingWebsite?: any;
    }>;
    offeringActions: Array<{
      action: 'create' | 'update' | 'skip' | 'price_conflict';
      type: string;
      websiteDomain: string;
      details?: any;
      existingOffering?: any;
      priceConflict?: {
        existingPrice: number;
        newPrice: number;
        priceDifference: number;
        percentageChange: number;
      };
    }>;
    relationshipActions: Array<{
      action: 'create' | 'exists' | 'update';
      publisherEmail: string;
      websiteDomain: string;
      existingRelationship?: any;
    }>;
  };
  warnings: string[];
  estimatedImpact: {
    newPublishers: number;
    newWebsites: number;
    newOfferings: number;
    updatedRecords: number;
    priceConflicts: number;
    skippedDuplicates: number;
  };
}

interface DuplicateDetectionPreviewProps {
  previewData: PreviewData;
  onApprove: () => void;
  onCancel: () => void;
  isApproving?: boolean;
}

export function DuplicateDetectionPreview({ 
  previewData, 
  onApprove, 
  onCancel, 
  isApproving 
}: DuplicateDetectionPreviewProps) {
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'update':
        return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'skip':
        return <XCircle className="h-4 w-4 text-gray-600" />;
      case 'price_conflict':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'exists':
        return <Info className="h-4 w-4 text-gray-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'update':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'skip':
        return 'bg-gray-50 border-gray-200 text-gray-800';
      case 'price_conflict':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'exists':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getPriceChangeIcon = (percentageChange: number) => {
    if (percentageChange > 10) return <TrendingUp className="h-4 w-4 text-red-600" />;
    if (percentageChange < -10) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Equal className="h-4 w-4 text-yellow-600" />;
  };

  const hasCriticalIssues = previewData.estimatedImpact.priceConflicts > 0;
  const hasWarnings = previewData.warnings.length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl max-h-[95vh] overflow-y-auto w-full">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b p-6 z-10">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🔍 Duplicate Detection Analysis
                {hasCriticalIssues && <AlertTriangle className="h-6 w-6 text-red-500" />}
              </h2>
              <p className="text-gray-600 mt-1">
                Comprehensive analysis of duplicates and conflicts before approval
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Critical Issues Alert */}
          {hasCriticalIssues && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-900 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Critical Issues Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {previewData.estimatedImpact.priceConflicts > 0 && (
                    <div className="flex items-center gap-2 text-red-800">
                      <DollarSign className="h-4 w-4" />
                      <span>{previewData.estimatedImpact.priceConflicts} price conflict(s) require manual review</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Impact Summary */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Impact Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {previewData.estimatedImpact.newPublishers}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <Users className="h-3 w-3" />
                    New Publishers
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {previewData.estimatedImpact.newWebsites}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <Globe className="h-3 w-3" />
                    New Websites
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {previewData.estimatedImpact.newOfferings}
                  </div>
                  <div className="text-sm text-gray-600">New Offerings</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600">
                    {previewData.estimatedImpact.updatedRecords}
                  </div>
                  <div className="text-sm text-gray-600">Records Updated</div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    previewData.estimatedImpact.priceConflicts > 0 ? 'text-red-600' : 'text-gray-400'
                  }`}>
                    {previewData.estimatedImpact.priceConflicts}
                  </div>
                  <div className="text-sm text-gray-600 flex items-center justify-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Price Conflicts
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${
                    previewData.estimatedImpact.skippedDuplicates > 0 ? 'text-yellow-600' : 'text-gray-400'
                  }`}>
                    {previewData.estimatedImpact.skippedDuplicates}
                  </div>
                  <div className="text-sm text-gray-600">Duplicates Prevented</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Publisher Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Publisher Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`border rounded-lg p-4 ${getActionColor(previewData.proposedActions.publisherAction)}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getActionIcon(previewData.proposedActions.publisherAction)}
                  <span className="font-medium">
                    {previewData.proposedActions.publisherAction === 'create' ? 'New Publisher' :
                     previewData.proposedActions.publisherAction === 'update' ? 'Update Existing' : 'No Action'}
                  </span>
                </div>
                {previewData.proposedActions.publisherDetails && (
                  <div className="text-sm space-y-1">
                    <div><strong>Email:</strong> {previewData.proposedActions.publisherDetails.email}</div>
                    <div><strong>Contact:</strong> {previewData.proposedActions.publisherDetails.contactName}</div>
                    {previewData.proposedActions.publisherDetails.companyName && (
                      <div><strong>Company:</strong> {previewData.proposedActions.publisherDetails.companyName}</div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Website Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Website Duplicate Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {previewData.proposedActions.websiteActions.map((action, i) => (
                  <div key={i} className={`border rounded-lg p-3 ${getActionColor(action.action)}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {getActionIcon(action.action)}
                      <strong>{action.domain}</strong>
                      <Badge variant="outline">
                        {action.action === 'create' ? 'New Website' :
                         action.action === 'exists' ? 'Already Exists' :
                         action.action === 'update' ? 'Will Update' : action.action}
                      </Badge>
                    </div>
                    {action.existingWebsite && (
                      <div className="text-sm text-gray-600">
                        <div>Existing website found - created {new Date(action.existingWebsite.createdAt).toLocaleDateString()}</div>
                        {action.existingWebsite.categories && (
                          <div>Categories: {action.existingWebsite.categories.join(', ')}</div>
                        )}
                      </div>
                    )}
                    {action.details && action.details.addCategories && (
                      <div className="text-sm">
                        <strong>Will add categories:</strong> {action.details.addCategories.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Offering Actions - The Main Event */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Offering Duplicate & Conflict Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {previewData.proposedActions.offeringActions.map((offering, i) => (
                  <div key={i} className={`border rounded-lg p-4 ${getActionColor(offering.action)}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {getActionIcon(offering.action)}
                        <div>
                          <div className="font-medium">{offering.type} on {offering.websiteDomain}</div>
                          <Badge variant="secondary" className="mt-1">
                            {offering.action === 'create' ? '✨ New Offering' :
                             offering.action === 'update' ? '🔄 Update Existing' :
                             offering.action === 'skip' ? '⏭️ Skip Duplicate' :
                             offering.action === 'price_conflict' ? '⚠️ Price Conflict' : offering.action}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* New Price Information */}
                    {offering.details && offering.details.basePrice && (
                      <div className="mb-3 p-2 bg-white bg-opacity-50 rounded">
                        <div className="font-medium text-sm">New Offering Details:</div>
                        <div className="text-sm">
                          Price: ${offering.details.basePrice.toFixed(2)} {offering.details.currency || 'USD'}
                          {offering.details.turnaroundDays && ` • ${offering.details.turnaroundDays} days`}
                        </div>
                      </div>
                    )}

                    {/* Existing Offering Information */}
                    {offering.existingOffering && (
                      <div className="mb-3 p-3 border-l-4 border-gray-300 bg-gray-50 bg-opacity-50">
                        <div className="font-medium text-sm text-gray-800 mb-1">Existing Offering Found:</div>
                        <div className="text-sm space-y-1">
                          <div>Price: ${(offering.existingOffering.basePrice / 100).toFixed(2)}</div>
                          <div>Status: {offering.existingOffering.isActive ? '✅ Active' : '❌ Inactive'}</div>
                          <div>Created: {new Date(offering.existingOffering.createdAt).toLocaleDateString()}</div>
                          {offering.existingOffering.turnaroundDays && (
                            <div>Turnaround: {offering.existingOffering.turnaroundDays} days</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Price Conflict Analysis */}
                    {offering.priceConflict && (
                      <div className="bg-red-100 border-l-4 border-red-400 p-3 rounded">
                        <div className="flex items-center gap-2 font-medium text-red-900 mb-2">
                          {getPriceChangeIcon(offering.priceConflict.percentageChange)}
                          Price Conflict Detected
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-red-800">
                              <strong>Current:</strong> ${(offering.priceConflict.existingPrice / 100).toFixed(2)}
                            </div>
                            <div className="text-red-800">
                              <strong>New:</strong> ${(offering.priceConflict.newPrice / 100).toFixed(2)}
                            </div>
                          </div>
                          <div>
                            <div className="text-red-800">
                              <strong>Change:</strong> {offering.priceConflict.percentageChange > 0 ? '+' : ''}{offering.priceConflict.percentageChange}%
                            </div>
                            <div className="text-red-800">
                              <strong>Difference:</strong> ${Math.abs(offering.priceConflict.priceDifference / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 font-medium text-red-900 text-sm">
                          ⚠️ This significant price change requires manual review
                        </div>
                      </div>
                    )}

                    {/* Skip Reason */}
                    {offering.action === 'skip' && offering.details?.reason && (
                      <div className="bg-yellow-100 border-l-4 border-yellow-400 p-3 rounded">
                        <div className="font-medium text-yellow-900 mb-1">Duplicate Prevented:</div>
                        <div className="text-yellow-800 text-sm">{offering.details.reason}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {hasWarnings && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardHeader>
                <CardTitle className="text-yellow-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Warnings & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {previewData.warnings.map((warning, i) => (
                    <li key={i} className="flex items-start gap-2 text-yellow-800">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{warning}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t bg-gray-50 -mx-6 px-6 -mb-6 pb-6 sticky bottom-0">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isApproving}
            >
              Cancel
            </Button>
            <Button
              onClick={onApprove}
              disabled={isApproving}
              className={hasCriticalIssues ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {isApproving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : hasCriticalIssues ? (
                <>
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  Approve with {previewData.estimatedImpact.priceConflicts} Conflict(s)
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Create Records
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}