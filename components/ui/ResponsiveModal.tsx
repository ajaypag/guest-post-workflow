'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '6xl' | 'full';
  fullScreenOnMobile?: boolean;
  showCloseButton?: boolean;
  preventScroll?: boolean;
}

const maxWidthClasses = {
  sm: 'sm:max-w-sm',
  md: 'sm:max-w-md',
  lg: 'sm:max-w-lg',
  xl: 'sm:max-w-xl',
  '2xl': 'sm:max-w-2xl',
  '4xl': 'sm:max-w-4xl',
  '6xl': 'sm:max-w-6xl',
  full: 'sm:max-w-full'
};

export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  maxWidth = 'lg',
  fullScreenOnMobile = true,
  showCloseButton = true,
  preventScroll = true
}: ResponsiveModalProps) {
  // Prevent body scroll when modal is open
  useEffect(() => {
    if (preventScroll && isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen, preventScroll]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal Container */}
      <div className={`flex min-h-full ${fullScreenOnMobile ? 'items-end sm:items-center' : 'items-center'} justify-center p-0 sm:p-4`}>
        {/* Modal Content */}
        <div className={`
          relative transform transition-all w-full
          ${fullScreenOnMobile ? 'h-full sm:h-auto' : ''}
          ${fullScreenOnMobile ? 'rounded-t-xl sm:rounded-xl' : 'rounded-xl'}
          ${maxWidthClasses[maxWidth]}
          bg-white shadow-xl
          ${className}
        `}>
          {/* Header */}
          <div className={`
            flex items-center justify-between 
            px-4 sm:px-6 py-4 sm:py-5 
            border-b border-gray-200
            ${fullScreenOnMobile ? 'sticky top-0 bg-white z-10' : ''}
          `}>
            <h2 id="modal-title" className="text-lg sm:text-xl font-semibold text-gray-900">
              {title}
            </h2>
            {showCloseButton && (
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center p-2 sm:p-2.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          {/* Body */}
          <div className={`
            px-4 sm:px-6 py-4 sm:py-6
            ${fullScreenOnMobile ? 'min-h-[50vh] sm:min-h-0' : ''}
            ${fullScreenOnMobile ? 'max-h-[calc(100vh-8rem)] sm:max-h-[calc(90vh-8rem)]' : 'max-h-[calc(90vh-8rem)]'}
            overflow-y-auto
          `}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}