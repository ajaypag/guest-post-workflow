import { NextResponse } from 'next/server';

/**
 * Migration Notice for OrderGroups Endpoints
 * 
 * These endpoints are being phased out as part of the migration from
 * orderGroups to lineItems system. 
 * 
 * During migration phase:
 * - These endpoints return empty data or migration notices
 * - New orders use lineItems exclusively
 * - Existing orders with orderGroups continue to work (read-only)
 * 
 * @deprecated Use lineItems endpoints instead
 */
export function migrationResponse() {
  return NextResponse.json({
    error: 'This endpoint is deprecated during lineItems migration',
    migration: {
      status: 'in_progress',
      message: 'OrderGroups system is being replaced with lineItems',
      alternativeEndpoints: {
        lineItems: '/api/orders/[id]/line-items',
        assignDomain: '/api/orders/[id]/line-items/[lineItemId]/assign-domain'
      }
    }
  }, { status: 410 }); // 410 Gone - indicates the resource is no longer available
}

export function emptyGroupsResponse() {
  return NextResponse.json({
    groups: [],
    message: 'Order uses lineItems system instead of groups'
  });
}