'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Globe,
  DollarSign,
  Clock,
  Edit,
  Copy,
  Pause,
  Play,
  MoreVertical,
  Tag,
  FileText,
  CheckCircle
} from 'lucide-react';

interface OfferingCardProps {
  offering: any;
  website: any;
  relationship: any;
}

export default function OfferingCard({ offering, website, relationship }: OfferingCardProps) {
  const [showActions, setShowActions] = useState(false);

  // Format currency - data is already in dollars, not cents
  const formatCurrency = (dollars: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: offering.currency || 'USD',
      minimumFractionDigits: 0,
    }).format(dollars);
  };

  // Get offering type icon
  const getOfferingIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'guest post':
        return FileText;
      case 'link insertion':
        return Tag;
      default:
        return Globe;
    }
  };

  const Icon = getOfferingIcon(offering.offeringType);

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${
              offering.isActive ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <Icon className={`h-5 w-5 ${
                offering.isActive ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">{offering.offeringType}</h3>
              <p className="text-sm text-gray-500">{website.domain}</p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="h-4 w-4 text-gray-400" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg py-1 z-10">
                <Link
                  href={`/publisher/offerings/${offering.id}`}
                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Offering
                </Link>
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </button>
                <button
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  {offering.isActive ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Offering
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Activate Offering
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Pricing */}
        <div className="mb-4">
          <div className="flex items-baseline">
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(parseFloat(offering.basePrice))}
            </span>
            <span className="text-sm text-gray-500 ml-2">base price</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              Turnaround
            </span>
            <span className="font-medium text-gray-900">{offering.turnaroundDays} days</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 flex items-center">
              <CheckCircle className="h-4 w-4 mr-1" />
              Availability
            </span>
            <span className="font-medium text-gray-900 capitalize">
              {offering.availability || 'available'}
            </span>
          </div>

          {offering.contentRequirements?.minWords && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Min Words</span>
              <span className="font-medium text-gray-900">
                {offering.contentRequirements.minWords}
              </span>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
            offering.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {offering.isActive ? 'Active' : 'Paused'}
          </span>
          
          <Link
            href={`/publisher/offerings/${offering.id}/pricing`}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Manage Pricing →
          </Link>
        </div>
      </div>
    </div>
  );
}