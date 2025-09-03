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
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            LIVE SYSTEM DEMO
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Look Behind the Scenes
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            See how we vet sites and create content. This demo walks through our actual process 
            for finding opportunities and building strategic placements.
          </p>
        </div>

        {/* Process Overview */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Site Vetting</h3>
            <p className="text-gray-600">How we evaluate and qualify sites for strategic placement opportunities</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Brain className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 text-lg mb-2">Content Creation</h3>
            <p className="text-gray-600">How we research your product and create strategic comparison content</p>
          </div>
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

        {/* Why This Matters */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
          <h3 className="text-2xl font-bold mb-4">
            Why Show You Our Process?
          </h3>
          
          <p className="text-lg mb-6 text-blue-100 max-w-3xl mx-auto">
            Most agencies show you pretty slides and make promises. 
            We show you exactly how we vet sites and create strategic content for placements.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <div className="font-semibold mb-2">🔍 Behind the Scenes</div>
              <div className="text-blue-100">
                See how we evaluate opportunities and research your product
              </div>
            </div>
            
            <div>
              <div className="font-semibold mb-2">🎯 Strategic Approach</div>
              <div className="text-blue-100">
                Understand how we create content that gets you mentioned
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}