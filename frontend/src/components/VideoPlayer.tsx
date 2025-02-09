import React, { useEffect, useRef } from "react";
import { Upload } from "lucide-react";

interface VideoPlayerProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
  videoFile: File | null;
  currentSubtitle: string;
  onLoadedMetadata: () => void;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isProcessing: boolean;
  onTimeUpdate: (currentTime: number) => void;
  isPlaying: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  videoUrl,
  videoFile,
  currentSubtitle,
  onLoadedMetadata,
  onUpload,
  isProcessing,
  onTimeUpdate,
  isPlaying,
}) => {
  const animationRef = useRef<number | null>(null);
  const prevVideoUrl = useRef<string | null>(null); // Ref to store previous videoUrl

  useEffect(() => {
    if (isPlaying && videoRef.current) {
      const updateCurrentTime = () => {
        if (videoRef.current) {
          onTimeUpdate(videoRef.current.currentTime);
          animationRef.current = requestAnimationFrame(updateCurrentTime);
        }
      };
      animationRef.current = requestAnimationFrame(updateCurrentTime);
    } else {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, onTimeUpdate, videoRef]);

  useEffect(() => {
    // Clean up the previous video URL
    if (prevVideoUrl.current && prevVideoUrl.current !== videoUrl) {
      URL.revokeObjectURL(prevVideoUrl.current);
    }
    prevVideoUrl.current = videoUrl;

    return () => {
      // Clean up when the component unmounts
      if (prevVideoUrl.current) {
        URL.revokeObjectURL(prevVideoUrl.current);
      }
    };
  }, [videoUrl]);

  return (
    <div className="flex-1 relative">
      {videoFile ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoUrl}
            onLoadedMetadata={onLoadedMetadata}
            controls={false}
            key={videoUrl} // Add the key prop
          />
          <div className="absolute bottom-8 left-0 right-0 flex justify-center">
            <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg max-w-2xl text-center">
              <p className="text-white text-lg font-semibold">{currentSubtitle}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <label className="flex items-center cursor-pointer">
            <Upload className="w-5 h-5 mr-2" />
            <span className="text-lg text-white">Upload Video</span>
            <input
              type="file"
              className="hidden"
              accept="video/*"
              onChange={onUpload}
              disabled={isProcessing}
            />
          </label>
        </div>
      )}
    </div>
  );
};
