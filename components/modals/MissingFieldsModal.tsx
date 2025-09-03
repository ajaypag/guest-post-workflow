'use client';

import React from 'react';
import { Modal } from '../ui/Modal';
import { AlertCircle } from 'lucide-react';

interface MissingFieldsModalProps {
  isOpen: boolean;
  onClose: () => void;
  missingFields: string[];
  onRetry?: () => void;
}

export const MissingFieldsModal = ({ 
  isOpen, 
  onClose, 
  missingFields, 
  onRetry 
}: MissingFieldsModalProps) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Missing Required Fields">
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-gray-700 mb-3">
              The following required fields are missing for publication verification:
            </p>
            
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <ul className="space-y-1">
                {missingFields.map((field, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0" />
                    <span className="text-sm font-medium text-amber-800">{field}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <p className="text-sm text-gray-600">
              Please complete the missing fields in the workflow steps and try verification again.
            </p>
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
          {onRetry && (
            <button
              onClick={() => {
                onClose();
                onRetry();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Retry Verification
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};