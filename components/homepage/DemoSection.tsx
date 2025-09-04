'use client';

import { 
  Play,
  Code,
  Database,
  Brain,
  Eye,
  Sparkles
} from 'lucide-react';
import InteractiveWorkflowDemo from '@/components/InteractiveWorkflowDemo';

export default function DemoSection() {
  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            LIVE DEMO
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            See It in Action
          </h2>
        </div>

        {/* Interactive Demo */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Play className="w-6 h-6 text-blue-600" />
            <h3 className="text-xl font-bold text-gray-900">
              Interactive Workflow Demo
            </h3>
            <div className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
              LIVE
            </div>
          </div>
          
          <InteractiveWorkflowDemo />
        </div>

      </div>
    </section>
  );
}