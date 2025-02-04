
// ProcessingOverlay.tsx
import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingOverlayProps {
  progress: number;
  message: string;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  progress,
  message,
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50">
    <div className="bg-transparent p-6 rounded-lg shadow-lg max-w-md w-full text-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2
          className="w-12 h-12 text-blue-600 animate-spin"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: 100 - progress,
          }}
        />
        <span className="text-lg font-semibold text-white">{progress}%</span>
        <p className="text-sm text-gray-200">{message || "Processing video..."}</p>
        <p className="text-xs text-gray-400 mt-2">This may take a few moments...</p>
      </div>
    </div>
  </div>
);
