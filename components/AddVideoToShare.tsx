'use client';

import { useState } from 'react';
import { Video, Plus, Check, X } from 'lucide-react';

interface AddVideoToShareProps {
  shareToken: string;
  existingVideoUrl?: string;
  existingMessage?: string;
  onVideoAdded?: () => void;
}

export default function AddVideoToShare({ 
  shareToken, 
  existingVideoUrl = '',
  existingMessage = '',
  onVideoAdded
}: AddVideoToShareProps) {
  const [showForm, setShowForm] = useState(false);
  const [videoUrl, setVideoUrl] = useState(existingVideoUrl);
  const [message, setMessage] = useState(existingMessage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const response = await fetch(`/api/orders/share/${shareToken}/video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoUrl, message })
      });

      if (!response.ok) {
        throw new Error('Failed to add video');
      }

      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setShowForm(false);
      }, 2000);
      
      onVideoAdded?.();
    } catch (error) {
      console.error('Error adding video:', error);
    } finally {
      setSaving(false);
    }
  };

  if (!showForm && !existingVideoUrl) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="inline-flex items-center px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
      >
        <Plus className="w-4 h-4 mr-1" />
        Add Video Presentation
      </button>
    );
  }

  if (!showForm && existingVideoUrl) {
    return (
      <div className="inline-flex items-center gap-2">
        <span className="text-sm text-green-600 flex items-center">
          <Video className="w-4 h-4 mr-1" />
          Video added
        </span>
        <button
          onClick={() => setShowForm(true)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-900 flex items-center">
          <Video className="w-4 h-4 mr-1.5 text-blue-600" />
          Add Video Presentation
        </h4>
        <button
          onClick={() => setShowForm(false)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Video URL
          </label>
          <input
            type="url"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=... or https://loom.com/share/..."
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Message (Optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Add a note to go with your video..."
            rows={2}
            className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={!videoUrl || saving}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center"
          >
            {saved ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                Saved!
              </>
            ) : saving ? (
              'Saving...'
            ) : (
              'Add Video'
            )}
          </button>
          <button
            onClick={() => setShowForm(false)}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}