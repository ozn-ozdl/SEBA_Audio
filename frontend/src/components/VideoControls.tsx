import React from "react";
import {
  Play,
  Pause,
  Volume,
  VolumeOff,
  Volume1,
  Volume2,
  MessageSquareMore,
  MessageSquareOff,
} from "lucide-react";

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
}) => {
  const toggleVideoMute = () => {
    onVideoVolumeChange(videoVolume > 0 ? 0 : 1);
  };

  const toggleAudioMute = () => {
    onAudioVolumeChange(audioVolume > 0 ? 0 : 1);
  };

  const getVolumeIcon = (volume: number) => {
    if (volume === 0) return <VolumeOff className="w-5 h-5 text-gray-600" />;
    if (volume < 0.33) return <Volume className="w-5 h-5 text-gray-600" />;
    if (volume < 0.66) return <Volume1 className="w-5 h-5 text-gray-600" />;
    return <Volume2 className="w-5 h-5 text-gray-600" />;
  };

  return (
    <div className="p-2 bg-gray-800/70 flex items-center justify-between backdrop-blur-sm space-x-5">
      <button
        className="p-3 bg-gray-200 rounded-full hover:bg-gray-300"
        onClick={onPlayPause}
      >
        {isPlaying ? (
          <Pause className="w-6 h-6" />
        ) : (
          <Play className="w-6 h-6" />
        )}
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
        <button onClick={toggleVideoMute} className="p-2">
          {getVolumeIcon(videoVolume)}{" "}
        </button>
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
        <button onClick={toggleAudioMute} className="p-2">
          {audioVolume > 0 ? (
            <MessageSquareMore className="w-5 h-5 text-gray-600" />
          ) : (
            <MessageSquareOff className="w-5 h-5 text-gray-600" />
          )}
        </button>
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
};
