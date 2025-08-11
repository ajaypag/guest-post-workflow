'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: string;
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  mobileLabel?: string; // Optional different label for mobile
  hideOnMobile?: boolean; // Hide this column on mobile cards
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T, index: number) => string | number;
  className?: string;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  cardClassName?: string;
  tableClassName?: string;
  mobileCardRenderer?: (item: T, index: number) => React.ReactNode; // Custom mobile card renderer
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl'; // When to switch from cards to table
}

export default function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  className = '',
  emptyMessage = 'No data to display',
  emptyIcon,
  cardClassName = '',
  tableClassName = '',
  mobileCardRenderer,
  breakpoint = 'md'
}: ResponsiveTableProps<T>) {
  const breakpointClass = {
    sm: 'sm:hidden',
    md: 'md:hidden',
    lg: 'lg:hidden',
    xl: 'xl:hidden'
  }[breakpoint];

  const breakpointTableClass = {
    sm: 'hidden sm:block',
    md: 'hidden md:block',
    lg: 'hidden lg:block',
    xl: 'hidden xl:block'
  }[breakpoint];

  const alignmentClasses = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right'
  };

  if (data.length === 0) {
    return (
      <div className={cn('text-center py-8 text-gray-500', className)}>
        {emptyIcon && <div className="mb-3">{emptyIcon}</div>}
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Mobile Card View */}
      <div className={cn(breakpointClass, 'space-y-3')}>
        {data.map((item, index) => {
          // Use custom renderer if provided
          if (mobileCardRenderer) {
            return (
              <div key={keyExtractor(item, index)}>
                {mobileCardRenderer(item, index)}
              </div>
            );
          }

          // Default card renderer
          return (
            <div
              key={keyExtractor(item, index)}
              className={cn(
                'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
                cardClassName
              )}
            >
              <div className="space-y-3">
                {columns
                  .filter(col => !col.hideOnMobile)
                  .map((column, colIndex) => (
                    <div key={column.key} className={colIndex === 0 ? 'font-medium' : ''}>
                      {column.mobileLabel || column.header && (
                        <label className="text-xs text-gray-500 font-medium block mb-1">
                          {column.mobileLabel || column.header}
                        </label>
                      )}
                      <div className={cn('text-sm text-gray-900', column.className)}>
                        {column.accessor(item)}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className={cn(breakpointTableClass, 'overflow-x-auto', tableClassName)}>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columns.map(column => (
                <th
                  key={column.key}
                  className={cn(
                    'px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider',
                    alignmentClasses[column.align || 'left'],
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={keyExtractor(item, index)} className="hover:bg-gray-50">
                {columns.map(column => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-6 py-4 text-sm text-gray-900',
                      alignmentClasses[column.align || 'left'],
                      column.className
                    )}
                  >
                    {column.accessor(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Export helper function to create column definitions
export function createColumn<T>(
  key: string,
  header: string,
  accessor: (item: T) => React.ReactNode,
  options?: Partial<Column<T>>
): Column<T> {
  return {
    key,
    header,
    accessor,
    ...options
  };
}