'use client';

import React, { useState } from 'react';
import { Search, Filter, X } from 'lucide-react';

export interface FilterOptions {
  status: 'all' | 'included' | 'excluded' | 'saved_for_later';
  drMin?: number;
  drMax?: number;
  priceMin?: number;
  priceMax?: number;
  qualification?: 'all' | 'qualified' | 'not_qualified';
  overlap?: 'all' | 'direct' | 'related' | 'both' | 'none';
  searchText?: string;
}

interface FilterBarProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  showAdvanced?: boolean;
}

export default function FilterBar({ filters, onFiltersChange, showAdvanced = false }: FilterBarProps) {
  const [expanded, setExpanded] = useState(false);

  const handleStatusChange = (status: FilterOptions['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFiltersChange({ ...filters, searchText: e.target.value });
  };

  const handleNumberChange = (field: keyof FilterOptions, value: string) => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    onFiltersChange({ ...filters, [field]: numValue });
  };

  const handleSelectChange = (field: keyof FilterOptions, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: 'all',
      drMin: undefined,
      drMax: undefined,
      priceMin: undefined,
      priceMax: undefined,
      qualification: 'all',
      overlap: 'all',
      searchText: undefined
    });
  };

  const hasActiveFilters = filters.status !== 'all' || 
    filters.drMin || filters.drMax || 
    filters.priceMin || filters.priceMax ||
    filters.qualification !== 'all' ||
    filters.overlap !== 'all' ||
    filters.searchText;

  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      {/* Primary Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search domains..."
              value={filters.searchText || ''}
              onChange={handleSearchChange}
              className="pl-10 pr-3 py-2 w-full border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Status:</span>
          <div className="flex gap-1">
            <button
              onClick={() => handleStatusChange('all')}
              className={`px-3 py-1 text-sm rounded ${
                filters.status === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100'
              }`}
            >
              All
            </button>
            <button
              onClick={() => handleStatusChange('included')}
              className={`px-3 py-1 text-sm rounded ${
                filters.status === 'included' ? 'bg-green-100 text-green-700' : 'bg-gray-100'
              }`}
            >
              Included
            </button>
            <button
              onClick={() => handleStatusChange('excluded')}
              className={`px-3 py-1 text-sm rounded ${
                filters.status === 'excluded' ? 'bg-red-100 text-red-700' : 'bg-gray-100'
              }`}
            >
              Excluded
            </button>
            <button
              onClick={() => handleStatusChange('saved_for_later')}
              className={`px-3 py-1 text-sm rounded ${
                filters.status === 'saved_for_later' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100'
              }`}
            >
              Saved
            </button>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        {showAdvanced && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 flex items-center gap-1"
          >
            <Filter className="h-4 w-4" />
            {expanded ? 'Hide' : 'Show'} Filters
          </button>
        )}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 flex items-center gap-1"
          >
            <X className="h-4 w-4" />
            Clear
          </button>
        )}
      </div>

      {/* Advanced Filters */}
      {showAdvanced && expanded && (
        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* DR Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">DR Range</label>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.drMin || ''}
                onChange={(e) => handleNumberChange('drMin', e.target.value)}
                className="w-20 px-2 py-1 text-sm border rounded"
                min="0"
                max="100"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.drMax || ''}
                onChange={(e) => handleNumberChange('drMax', e.target.value)}
                className="w-20 px-2 py-1 text-sm border rounded"
                min="0"
                max="100"
              />
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price Range ($)</label>
            <div className="flex gap-1 items-center">
              <input
                type="number"
                placeholder="Min"
                value={filters.priceMin ? filters.priceMin / 100 : ''}
                onChange={(e) => handleNumberChange('priceMin', e.target.value ? (parseFloat(e.target.value) * 100).toString() : '')}
                className="w-20 px-2 py-1 text-sm border rounded"
                min="0"
              />
              <span className="text-gray-500">-</span>
              <input
                type="number"
                placeholder="Max"
                value={filters.priceMax ? filters.priceMax / 100 : ''}
                onChange={(e) => handleNumberChange('priceMax', e.target.value ? (parseFloat(e.target.value) * 100).toString() : '')}
                className="w-20 px-2 py-1 text-sm border rounded"
                min="0"
              />
            </div>
          </div>

          {/* Qualification Status */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">AI Qualification</label>
            <select
              value={filters.qualification || 'all'}
              onChange={(e) => handleSelectChange('qualification', e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="all">All</option>
              <option value="qualified">Qualified</option>
              <option value="not_qualified">Not Qualified</option>
            </select>
          </div>

          {/* Overlap Type */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Overlap Type</label>
            <select
              value={filters.overlap || 'all'}
              onChange={(e) => handleSelectChange('overlap', e.target.value)}
              className="w-full px-2 py-1 text-sm border rounded"
            >
              <option value="all">All</option>
              <option value="direct">Direct</option>
              <option value="related">Related</option>
              <option value="both">Both</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}