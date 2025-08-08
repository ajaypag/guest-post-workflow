'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Niche {
  name: string;
  count: number;
}

interface NichesDirectoryProps {
  allNiches: Niche[];
}

export default function NichesDirectory({ allNiches }: NichesDirectoryProps) {
  const [showAllNiches, setShowAllNiches] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter niches based on search query
  const filteredNiches = allNiches.filter(niche =>
    niche.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show top 12 by default, all when expanded
  const displayedNiches = showAllNiches ? filteredNiches : filteredNiches.slice(0, 12);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[&\s]+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-blogs';
  };

  return (
    <div>
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">
          Browse by Niche
        </h2>
        <p className="text-lg text-gray-600">
          Find highly-specific guest posting opportunities in your exact niche
        </p>
      </div>

      {/* Search Box */}
      <div className="max-w-md mx-auto mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search niches..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          />
        </div>
        {searchQuery && (
          <p className="text-sm text-gray-500 mt-2">
            Found {filteredNiches.length} niche{filteredNiches.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </p>
        )}
      </div>

      {/* Niche Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {displayedNiches.map(niche => (
          <Link
            key={niche.name}
            href={`/guest-posting-sites/${generateSlug(niche.name)}`}
            className="group block p-6 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">{niche.count}</div>
              <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                {niche.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Guest posting sites
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* View All / Show Less Button */}
      {!searchQuery && filteredNiches.length > 12 && (
        <div className="text-center">
          <button
            onClick={() => setShowAllNiches(!showAllNiches)}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
          >
            {showAllNiches ? (
              <>
                Show Less Niches
                <ChevronUp className="w-5 h-5" />
              </>
            ) : (
              <>
                View All {allNiches.length} Niches
                <ChevronDown className="w-5 h-5" />
              </>
            )}
          </button>
        </div>
      )}

      {/* No Results Message */}
      {searchQuery && filteredNiches.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p className="text-lg font-medium">No niches found</p>
            <p>Try searching for a different term or browse all niches</p>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}
    </div>
  );
}