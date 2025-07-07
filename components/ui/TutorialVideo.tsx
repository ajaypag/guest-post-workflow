'use client';

import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

interface TutorialVideoProps {
  videoUrl: string;
  title?: string;
  description?: string;
  timestamp?: string;
}

export const TutorialVideo = ({ 
  videoUrl, 
  title = "Video Tutorial", 
  description,
  timestamp 
}: TutorialVideoProps) => {
  return (
    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <Play className="w-4 h-4 text-purple-600" />
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-purple-800 mb-1">
            📹 {title}
            {timestamp && (
              <span className="text-sm font-normal text-purple-600 ml-2">
                (starts at {timestamp})
              </span>
            )}
          </h4>
          {description && (
            <p className="text-sm text-purple-700 mb-3">
              {description}
            </p>
          )}
          <a 
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium text-sm hover:underline"
          >
            Watch Tutorial <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </div>
    </div>
  );
};