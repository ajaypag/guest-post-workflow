'use client';

import React from 'react';
import { WorkflowStep, GuestPostWorkflow } from '@/types/workflow';
import { SavedField } from '../SavedField';
import { CopyButton } from '../ui/CopyButton';
import { TutorialVideo } from '../ui/TutorialVideo';
import { ExternalLink } from 'lucide-react';

interface ImagesStepProps {
  step: WorkflowStep;
  workflow: GuestPostWorkflow;
  onChange: (data: any) => void;
}

export const ImagesStep = ({ step, workflow, onChange }: ImagesStepProps) => {
  // Get the final polished article from Step 6, fallback to earlier versions
  const finalPolishStep = workflow.steps.find(s => s.id === 'final-polish');
  const finalArticle = finalPolishStep?.outputs?.finalArticle || '';
  
  // Fallback chain if final article not available
  const contentAuditStep = workflow.steps.find(s => s.id === 'content-audit');
  const seoOptimizedArticle = contentAuditStep?.outputs?.seoOptimizedArticle || '';
  
  const articleDraftStep = workflow.steps.find(s => s.id === 'article-draft');
  const originalArticle = articleDraftStep?.outputs?.fullArticle || '';
  
  const fullArticle = finalArticle || seoOptimizedArticle || originalArticle;

  return (
    <div className="space-y-4">
      <TutorialVideo 
        videoUrl="https://www.loom.com/share/9efd5118eda6497e9283023c48607262"
        title="Create Images Tutorial"
        description="Learn how to create and optimize images for your guest post"
      />
      
      <div className="bg-blue-50 p-4 rounded-md">
        <h3 className="font-semibold mb-3">Step 12: Create Images for Your Guest Post</h3>
        
        <div className="bg-white p-3 rounded border border-blue-200 mb-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">🎯 Image Strategy by Article Type</p>
          <div className="grid md:grid-cols-2 gap-4 mt-3">
            <div className="bg-blue-50 p-3 rounded">
              <h5 className="font-semibold text-blue-800 mb-2">📄 Informational Articles</h5>
              <p className="text-sm text-blue-700 mb-2"><strong>Aim for 3 images:</strong></p>
              <ul className="text-sm text-blue-700 ml-4 space-y-1">
                <li>• 1 featured image (top of article)</li>
                <li>• 2 images placed throughout the content</li>
              </ul>
              <p className="text-sm text-blue-600 mt-2 italic">Use: Image Creator GPT</p>
            </div>
            
            <div className="bg-green-50 p-3 rounded">
              <h5 className="font-semibold text-green-800 mb-2">📋 Listicles (Product-based)</h5>
              <p className="text-sm text-green-700 mb-2"><strong>Recommended approach:</strong></p>
              <ul className="text-sm text-green-700 ml-4 space-y-1">
                <li>• 1 featured image (top of article)</li>
                <li>• 1 image per product mentioned</li>
              </ul>
              <p className="text-sm text-green-600 mt-2 italic">Use: Both GPTs (Creator + Finder)</p>
            </div>
          </div>
        </div>

        {finalArticle ? (
          <div className="bg-green-100 border border-green-300 rounded p-2 mb-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-green-800">✅ Article ready to copy</p>
              <CopyButton 
                text={fullArticle}
                label="Copy Article"
              />
            </div>
          </div>
        ) : (
          <div className="bg-yellow-100 border border-yellow-300 rounded p-2 mb-4">
            <p className="text-sm text-yellow-800">⚠️ Complete previous steps to get article content</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          {/* Image Creator GPT */}
          <div className="bg-purple-50 border border-purple-200 rounded p-4">
            <h4 className="font-semibold text-purple-800 mb-2">🎨 Image Creator GPT</h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Creates original images</strong> based on your article content.
            </p>
            <div className="text-sm text-gray-700 mb-3">
              <p className="font-semibold mb-1">Use for:</p>
              <ul className="ml-4 space-y-1">
                <li>• Featured images (informational articles)</li>
                <li>• Featured images (listicles)</li>
                <li>• Conceptual/explanatory images</li>
              </ul>
            </div>
            <a href="https://chatgpt.com/g/g-685c4280a6508191a939e2d05a8d0648-guest-post-image-creator?model=o3" 
               target="_blank" 
               className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium">
              Open Image Creator GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
            </a>
          </div>

          {/* Image Finder GPT */}
          <div className="bg-orange-50 border border-orange-200 rounded p-4">
            <h4 className="font-semibold text-orange-800 mb-2">🔍 Image Finder GPT</h4>
            <p className="text-sm text-gray-700 mb-2">
              <strong>Finds existing product images</strong> for items mentioned in your content.
            </p>
            <div className="text-sm text-gray-700 mb-3">
              <p className="font-semibold mb-1">Use for:</p>
              <ul className="ml-4 space-y-1">
                <li>• Individual product images (listicles)</li>
                <li>• Product roundup articles</li>
                <li>• "Best of" recommendation posts</li>
              </ul>
            </div>
            <a href="https://chatgpt.com/g/g-6864196b07dc8191943e1d1c3dfdb749-image-finder-for-listicles?model=o3" 
               target="_blank" 
               className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium">
              Open Image Finder GPT <ExternalLink className="w-3 h-3 ml-2 text-white" />
            </a>
          </div>
        </div>

        <div className="bg-blue-100 border border-blue-300 rounded p-3 mt-4">
          <p className="text-sm font-semibold text-blue-800 mb-2">💡 Recommended Workflow for Listicles</p>
          <div className="text-sm text-gray-700 space-y-2">
            <div className="flex items-start space-x-2">
              <span className="text-purple-600 font-bold">1.</span>
              <p><strong>Image Creator:</strong> Create 1 featured image for the top of your article</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-orange-600 font-bold">2.</span>
              <p><strong>Image Finder:</strong> Get individual product images for each item mentioned</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Which GPT(s) Did You Use?</label>
        <select
          value={step.outputs.gptUsed || ''}
          onChange={(e) => onChange({ ...step.outputs, gptUsed: e.target.value })}
          className="w-full px-3 py-2 border rounded-md"
        >
          <option value="">Select option...</option>
          <option value="creator">Image Creator only (created new images)</option>
          <option value="finder">Image Finder only (found product images)</option>
          <option value="both">Both GPTs (created + found images)</option>
          <option value="none">No images needed</option>
        </select>
      </div>

      <SavedField
        label="Total Images Used"
        value={step.outputs.totalImages || ''}
        placeholder="How many images total are you using in the article?"
        onChange={(value) => onChange({ ...step.outputs, totalImages: value })}
      />

      <SavedField
        label="Image Notes"
        value={step.outputs.imageNotes || ''}
        placeholder="Image placement notes or any issues encountered"
        onChange={(value) => onChange({ ...step.outputs, imageNotes: value })}
        isTextarea={true}
        height="h-24"
      />

      <div className="bg-yellow-100 border border-yellow-300 rounded p-3">
        <p className="text-sm font-semibold text-yellow-800 mb-2">📋 Don't Forget: Add Images to Your Google Doc</p>
        <p className="text-sm text-gray-700 mb-2">
          After getting your images, make sure to actually insert them into your Google Doc from Step 4 in the appropriate locations.
        </p>
        <ul className="text-sm text-gray-700 ml-4 space-y-1">
          <li>• Featured image at the top</li>
          <li>• Additional images throughout the content</li>
          <li>• Product images near their mentions (for listicles)</li>
        </ul>
      </div>

      <div className="bg-gray-100 border border-gray-300 rounded p-3">
        <p className="text-sm font-semibold text-gray-800 mb-1">📝 Note: No Source Links Required</p>
        <p className="text-sm text-gray-700">
          You don't need to add source links for product images or GPT-created images.
        </p>
      </div>
    </div>
  );
};