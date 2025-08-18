'use client';

import { useState } from 'react';
import { Play, Video, X } from 'lucide-react';

interface ProposalVideoEmbedProps {
  videoUrl: string;
  title?: string;
  message?: string;
}

export default function ProposalVideoEmbed({ videoUrl, title, message }: ProposalVideoEmbedProps) {
  const [showVideo, setShowVideo] = useState(false);
  const [error, setError] = useState(false);

  // Parse video URL to determine platform and get embed URL
  const getEmbedUrl = (url: string): { embedUrl: string; platform: string } | null => {
    try {
      // YouTube
      const youtubeMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
      if (youtubeMatch) {
        return {
          embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1&rel=0`,
          platform: 'YouTube'
        };
      }

      // Vimeo
      const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return {
          embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
          platform: 'Vimeo'
        };
      }

      // Loom
      const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
      if (loomMatch) {
        return {
          embedUrl: `https://www.loom.com/embed/${loomMatch[1]}?autoplay=true`,
          platform: 'Loom'
        };
      }

      // Wistia
      const wistiaMatch = url.match(/wistia\.com\/medias\/([a-zA-Z0-9]+)/);
      if (wistiaMatch) {
        return {
          embedUrl: `https://fast.wistia.net/embed/iframe/${wistiaMatch[1]}`,
          platform: 'Wistia'
        };
      }

      // Direct video file (mp4, webm, etc)
      if (url.match(/\.(mp4|webm|ogg)$/i)) {
        return {
          embedUrl: url,
          platform: 'Direct'
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  const embedInfo = getEmbedUrl(videoUrl);

  if (!embedInfo) {
    return null; // Don't show anything if URL is invalid
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 mb-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 flex items-center">
            <Video className="w-5 h-5 mr-2 text-blue-600" />
            {title || 'Personal Message from Our Team'}
          </h3>
          {message && (
            <p className="text-gray-600 mt-2 text-sm leading-relaxed">
              {message}
            </p>
          )}
        </div>
      </div>

      {/* Video Container */}
      {!showVideo ? (
        <div 
          className="relative bg-black rounded-lg overflow-hidden cursor-pointer group"
          onClick={() => setShowVideo(true)}
          style={{ paddingBottom: '56.25%' }} // 16:9 aspect ratio
        >
          {/* Thumbnail/Placeholder */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-white ml-1" />
              </div>
              <p className="text-white font-medium text-lg">
                Click to watch your personalized overview
              </p>
              <p className="text-white/80 text-sm mt-1">
                {embedInfo.platform} Video
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Close button */}
          <button
            onClick={() => setShowVideo(false)}
            className="absolute -top-10 right-0 z-10 bg-white rounded-full p-1 shadow-lg hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* Video iframe */}
          <div 
            className="relative bg-black rounded-lg overflow-hidden"
            style={{ paddingBottom: '56.25%' }} // 16:9 aspect ratio
          >
            {embedInfo.platform === 'Direct' ? (
              <video
                className="absolute inset-0 w-full h-full"
                controls
                autoPlay
                onError={() => setError(true)}
              >
                <source src={embedInfo.embedUrl} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <iframe
                className="absolute inset-0 w-full h-full"
                src={embedInfo.embedUrl}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                onError={() => setError(true)}
              />
            )}
            
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                <p className="text-white">Unable to load video</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}