'use client';

import React, { useState } from 'react';
import { PlayCircle, X } from 'lucide-react';

export default function BulkAnalysisTutorial() {
  const [showVideo, setShowVideo] = useState(false);

  return (
    <div className="mb-6">
      {!showVideo ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlayCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-semibold text-blue-900">New to Bulk Domain Analysis?</h3>
              <p className="text-sm text-blue-700">Watch our quick tutorial to learn how to pre-qualify guest post opportunities efficiently.</p>
            </div>
          </div>
          <button
            onClick={() => setShowVideo(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Watch Tutorial
          </button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Bulk Domain Analysis Tutorial</h3>
            <button
              onClick={() => setShowVideo(false)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Close video"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative rounded-md overflow-hidden" style={{ paddingBottom: '56.25%' }}>
            <iframe
              src="https://www.loom.com/embed/47de2d4c70dd4147adbdfd0f0bbbcec4"
              frameBorder="0"
              allowFullScreen
              className="absolute top-0 left-0 w-full h-full"
              title="Bulk Domain Analysis Tutorial"
            />
          </div>
        </div>
      )}
    </div>
  );
}