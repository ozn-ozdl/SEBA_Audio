
import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from 'src/components/ui/button';

interface VideoHeaderProps {
  onEncode: () => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onRegenerateAudio: () => void;
}

export const VideoHeader: React.FC<VideoHeaderProps> = ({
  onEncode,
  onAnalyze,
  onReanalyze,
  onRegenerateAudio,
}) => (
  <div className="flex justify-between items-center p-2 bg-gray-800/70 text-white shadow-md backdrop-blur-sm">
    <div className="flex items-center">
      <Button className="mr-2">
        <Settings className="w-5 h-5 text-white" />
      </Button>
      <span className="text-lg text-white font-semibold">Transcription Editor</span>
    </div>

    <div className="flex items-center gap-2">
      <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={onEncode}>
        Encode
      </Button>
      <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={onAnalyze}>
        Analyze
      </Button>
      <div className="border-2 border-gray-200 flex gap-2">
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={onReanalyze}>
          Reanalyze
        </Button>
        <Button className="bg-indigo-600 hover:bg-indigo-500" onClick={onRegenerateAudio}>
          Regenerate Audio
        </Button>
      </div>
    </div>
  </div>
);