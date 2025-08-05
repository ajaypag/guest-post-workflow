'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Upload, Image as ImageIcon, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';

type ImageRequirement = {
  id: string;
  path: string;
  description: string;
  blogPost: string;
  dimensions?: string;
  status: 'missing' | 'uploaded';
};

export default function ImageUploadAdminPage() {
  const [uploadStatus, setUploadStatus] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Check for existing images on mount
  useEffect(() => {
    const checkExistingImages = async () => {
      try {
        const response = await fetch('/api/images/check');
        if (response.ok) {
          const existingImages = await response.json();
          setUploadStatus(existingImages);
        }
      } catch (error) {
        console.error('Error checking existing images:', error);
      }
    };
    checkExistingImages();
  }, []);

  // Define all required images across blog posts
  const imageRequirements: ImageRequirement[] = [
    // Resource Page Link Building Guide
    {
      id: 'resource-process',
      path: '/images/resource-page-link-building-process.png',
      description: 'Step-by-step resource page link building process infographic',
      blogPost: 'Resource Page Link Building Guide',
      dimensions: 'Recommended: 1200x800px',
      status: 'missing'
    },
    {
      id: 'google-operators',
      path: '/images/google-search-operators.png',
      description: 'Google search operators for finding resource pages',
      blogPost: 'Resource Page Link Building Guide',
      dimensions: 'Recommended: 1200x600px',
      status: 'missing'
    },
    {
      id: 'email-templates',
      path: '/images/email-outreach-templates.png',
      description: 'Email outreach templates for resource page link building',
      blogPost: 'Resource Page Link Building Guide',
      dimensions: 'Recommended: 1200x800px',
      status: 'missing'
    },
    {
      id: 'link-tools',
      path: '/images/link-building-tools.png',
      description: 'Essential tools for resource page link building: Ahrefs, Hunter.io, NinjaOutreach',
      blogPost: 'Resource Page Link Building Guide',
      dimensions: 'Recommended: 1200x600px',
      status: 'missing'
    },
    {
      id: 'types-resource-pages',
      path: '/images/types-of-resource-pages.png',
      description: 'Different types of resource pages visualization',
      blogPost: 'Resource Page Link Building Guide',
      dimensions: 'Recommended: 1200x800px',
      status: 'missing'
    }
  ];

  const handleFileUpload = async (imageId: string, file: File, targetPath: string) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', targetPath);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      console.log('Upload successful:', result);
      
      // Mark as uploaded
      setUploadStatus(prev => ({ ...prev, [imageId]: true }));
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const groupedImages = imageRequirements.reduce((acc, img) => {
    if (!acc[img.blogPost]) {
      acc[img.blogPost] = [];
    }
    acc[img.blogPost].push(img);
    return acc;
  }, {} as Record<string, ImageRequirement[]>);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Link href="/admin" className="flex items-center text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Admin
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Image Upload Manager</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Blog Post Image Manager</h1>
          <p className="text-gray-600">
            Upload images for blog posts. Each placeholder shows where an image is needed and its recommended dimensions.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">How to use this tool:</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>Review the missing images for each blog post below</li>
            <li>Prepare images according to the recommended dimensions</li>
            <li>Click "Choose File" to select and upload each image</li>
            <li>Images will be automatically placed in the correct location</li>
            <li>Once uploaded, the blog posts will display the images properly</li>
          </ol>
        </div>

        {/* Image Requirements by Blog Post */}
        {Object.entries(groupedImages).map(([blogPost, images]) => (
          <div key={blogPost} className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">{blogPost}</h2>
            
            <div className="grid gap-6">
              {images.map((image) => (
                <div 
                  key={image.id} 
                  className={`bg-white rounded-lg border ${
                    uploadStatus[image.id] ? 'border-green-300' : 'border-gray-200'
                  } p-6`}
                >
                  <div className="flex items-start gap-6">
                    {/* Image Preview/Placeholder */}
                    <div className="flex-shrink-0">
                      <div className={`w-32 h-32 rounded-lg flex items-center justify-center ${
                        uploadStatus[image.id] ? 'bg-green-50' : 'bg-gray-100'
                      }`}>
                        {uploadStatus[image.id] ? (
                          <CheckCircle className="w-12 h-12 text-green-600" />
                        ) : (
                          <ImageIcon className="w-12 h-12 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Image Details */}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {image.description}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">{image.path}</span>
                      </p>
                      {image.dimensions && (
                        <p className="text-sm text-gray-500 mb-4">{image.dimensions}</p>
                      )}

                      {/* Upload Status */}
                      <div className="flex items-center gap-4">
                        {uploadStatus[image.id] ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-5 h-5 mr-2" />
                            <span className="font-medium">Uploaded successfully</span>
                          </div>
                        ) : (
                          <>
                            <input
                              ref={el => fileInputRefs.current[image.id] = el}
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(image.id, file, image.path);
                                }
                              }}
                              className="hidden"
                            />
                            <button
                              onClick={() => fileInputRefs.current[image.id]?.click()}
                              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                              <Upload className="w-4 h-4" />
                              Choose File
                            </button>
                            <span className="text-sm text-gray-500">No file selected</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* API Instructions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mt-12">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-2">Note: Backend Integration Required</h3>
              <p className="text-yellow-800 mb-3">
                This is a frontend interface. To make uploads work, you'll need to:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-yellow-700">
                <li>Create an API endpoint at <code className="bg-yellow-100 px-1 rounded">/api/upload</code></li>
                <li>Handle multipart form data and save files to <code className="bg-yellow-100 px-1 rounded">/public/images/</code></li>
                <li>Ensure proper file naming and validation</li>
                <li>Update the blog posts to reference the uploaded images</li>
              </ol>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}