import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  children: React.ReactNode;
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  return (
    <div className="group relative inline-flex items-center">
      {children}
      <Info className="ml-1 h-3 w-3 text-gray-400 group-hover:text-gray-600" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-[100]">
        <div className="bg-gray-900 text-white text-xs rounded py-2 px-3 max-w-xs whitespace-normal">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    </div>
  );
}