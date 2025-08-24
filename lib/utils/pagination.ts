/**
 * Pagination utilities for API endpoints
 * Prevents memory exhaustion from large datasets
 */

import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Extract and validate pagination parameters from request
 */
export function getPaginationParams(request: NextRequest): PaginationParams {
  const searchParams = request.nextUrl.searchParams;
  
  // Get page and limit from query params
  const pageParam = searchParams.get('page');
  const limitParam = searchParams.get('limit');
  
  // Parse and validate page (default to 1)
  let page = parseInt(pageParam || '1', 10);
  if (isNaN(page) || page < 1) {
    page = 1;
  }
  
  // Parse and validate limit (default to 20, max 100)
  let limit = parseInt(limitParam || '20', 10);
  if (isNaN(limit) || limit < 1) {
    limit = 20;
  }
  // Enforce maximum limit to prevent memory issues
  if (limit > 100) {
    limit = 100;
  }
  
  // Calculate offset
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
}

/**
 * Create pagination metadata for response
 */
export function createPaginationMeta(
  params: PaginationParams,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / params.limit);
  
  return {
    page: params.page,
    limit: params.limit,
    total: totalCount,
    totalPages,
    hasNext: params.page < totalPages,
    hasPrev: params.page > 1
  };
}

/**
 * Create pagination links for API responses
 */
export function createPaginationLinks(
  request: NextRequest,
  meta: PaginationMeta
): {
  first?: string;
  prev?: string;
  next?: string;
  last?: string;
} {
  const baseUrl = request.nextUrl.clone();
  const links: any = {};
  
  // First page link
  if (meta.page > 1) {
    baseUrl.searchParams.set('page', '1');
    links.first = baseUrl.toString();
  }
  
  // Previous page link
  if (meta.hasPrev) {
    baseUrl.searchParams.set('page', String(meta.page - 1));
    links.prev = baseUrl.toString();
  }
  
  // Next page link
  if (meta.hasNext) {
    baseUrl.searchParams.set('page', String(meta.page + 1));
    links.next = baseUrl.toString();
  }
  
  // Last page link
  if (meta.page < meta.totalPages) {
    baseUrl.searchParams.set('page', String(meta.totalPages));
    links.last = baseUrl.toString();
  }
  
  return links;
}

/**
 * Apply pagination to Drizzle query
 * Usage: query.limit(params.limit).offset(params.offset)
 */
export function applyPagination<T>(
  query: any,
  params: PaginationParams
): any {
  return query.limit(params.limit).offset(params.offset);
}

/**
 * Format paginated response
 */
export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
  links?: {
    first?: string;
    prev?: string;
    next?: string;
    last?: string;
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  totalCount: number,
  params: PaginationParams,
  request?: NextRequest
): PaginatedResponse<T> {
  const meta = createPaginationMeta(params, totalCount);
  
  const response: PaginatedResponse<T> = {
    data,
    meta
  };
  
  if (request) {
    response.links = createPaginationLinks(request, meta);
  }
  
  return response;
}

/**
 * Cursor-based pagination for better performance on large datasets
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export function getCursorPaginationParams(request: NextRequest): CursorPaginationParams {
  const searchParams = request.nextUrl.searchParams;
  
  const cursor = searchParams.get('cursor') || undefined;
  const limitParam = searchParams.get('limit');
  
  let limit = parseInt(limitParam || '20', 10);
  if (isNaN(limit) || limit < 1) {
    limit = 20;
  }
  if (limit > 100) {
    limit = 100;
  }
  
  return { cursor, limit };
}

/**
 * Create cursor for next page
 */
export function encodeCursor(value: string | number | Date): string {
  return Buffer.from(String(value)).toString('base64');
}

export function decodeCursor(cursor: string): string {
  try {
    return Buffer.from(cursor, 'base64').toString('utf-8');
  } catch {
    throw new Error('Invalid cursor');
  }
}