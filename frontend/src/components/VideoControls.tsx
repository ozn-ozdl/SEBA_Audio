// VideoControls.tsx
import React from 'react';
import { Play, Pause, Volume, Speech } from 'lucide-react';

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  videoDuration: number;
  videoVolume: number;
  audioVolume: number;
  onPlayPause: () => void;
  onTimeUpdate: (time: number) => void;
  onVideoVolumeChange: (volume: number) => void;
  onAudioVolumeChange: (volume: number) => void;
}

export const VideoControls: React.FC<VideoControlsProps> = ({
  isPlaying,
  currentTime,
  videoDuration,
  videoVolume,
  audioVolume,
  onPlayPause,
  onTimeUpdate,
  onVideoVolumeChange,
  onAudioVolumeChange,
}) => (
  <div className="p-2 bg-gray-800/70 flex items-center justify-between backdrop-blur-sm">
    <button
      className="p-3 bg-gray-200 rounded-full hover:bg-gray-300"
      onClick={onPlayPause}
    >
      {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
    </button>
    <input
      type="range"
      min="0"
      max={videoDuration || 0}
      step="0.1"
      value={currentTime}
      onChange={(e) => onTimeUpdate(parseFloat(e.target.value))}
      className="flex-1 mx-4"
    />
    <div className="flex items-center">
      <Volume className="w-5 h-5 text-gray-600" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={videoVolume}
        onChange={(e) => onVideoVolumeChange(parseFloat(e.target.value))}
        className="w-24 ml-2"
      />
    </div>
    <div className="flex items-center">
      <Speech className="w-5 h-5 text-gray-600" />
      <input
        type="range"
        min="0"
        max="1"
        step="0.1"
        value={audioVolume}
        onChange={(e) => onAudioVolumeChange(parseFloat(e.target.value))}
        className="w-24 ml-2"
      />
    </div>
  </div>
);
