import React, { useEffect } from "react";
import { RefreshCw, Settings, Sparkles, Video } from "lucide-react";
import { Button } from "src/components/ui/button";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "./ui/tooltip";
import { VideoDescriptionItem } from "src/types";

interface VideoHeaderProps {
  onEncode: () => void;
  onAnalyze: () => void;
  onReanalyze: () => void;
  onRegenerateAudio: () => void;
  uploadedVideo: File | null;
  videoDescriptions: VideoDescriptionItem[];
}

const buttonStyles = {
  base: "transition-all duration-150 font-medium text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none",
  variants: {
    default:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/30",
    secondary:
      "bg-gray-800 hover:bg-gray-700 text-gray-100 shadow-sm hover:shadow-gray-500/20",
    ghost: "hover:bg-gray-800/50 text-gray-300 hover:text-gray-100",
    outline:
      "border border-gray-600 hover:border-gray-500 bg-gray-900/80 text-gray-300 hover:text-gray-100",
    destructive:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/30",
  },
  sizes: {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  },
};

export const VideoHeader: React.FC<VideoHeaderProps> = ({
  onEncode,
  onAnalyze,
  onReanalyze,
  onRegenerateAudio,
  uploadedVideo,
  videoDescriptions,
}) => {
  let hasNoAudio = videoDescriptions.some((desc) => !desc.audioFile); // Check if any description has audio
  const [isVideoUploaded, setIsVideoUploaded] = React.useState(false);
  let isNotEdited = videoDescriptions.every((desc) => !desc.isEdited); // Check if all descriptions are not edited

  // check on description change if video is not edited
  useEffect(() => {
    if (videoDescriptions.length > 0) {
      isNotEdited = videoDescriptions.every((desc) => !desc.isEdited); // Check if all descriptions are not edited
      hasNoAudio = videoDescriptions.some((desc) => !desc.audioFile); // Check if any description has audio
    }
  }, [videoDescriptions]);

  useEffect(() => {
    if (uploadedVideo) {
      setIsVideoUploaded(true);
    }
  }, [uploadedVideo]);

  return (
    <div className="flex justify-between items-center p-2 bg-gray-800/70 text-white shadow-md backdrop-blur-sm">
      <div className="flex items-center">
        <span className="text-lg text-white font-semibold">
          Transcription Editor
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Analyze Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                className={`${buttonStyles.base} ${buttonStyles.variants.default} ${buttonStyles.sizes.md}`}
                onClick={onAnalyze}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze Video
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-white">
              <p>Analyze video to extract scenes and generate descriptions</p>
            </TooltipContent>
          </Tooltip>
          {/* Regenerate Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                className={`${buttonStyles.base} ${buttonStyles.variants.secondary} ${buttonStyles.sizes.md}`}
                onClick={onReanalyze}
                disabled={!isVideoUploaded} // Disable if no video
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-white">
              <p>Select scenes to regenerate descriptions or audio</p>
            </TooltipContent>
          </Tooltip>
          {/* Encode Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                className={`${buttonStyles.base} ${buttonStyles.variants.default} ${buttonStyles.sizes.md}`}
                onClick={onEncode}
                disabled={!isVideoUploaded || hasNoAudio || isNotEdited} // Disable if no video or no audio or not all descriptions are not edited
              >
                <Video className="w-4 h-4 mr-2" />
                Encode Video
              </Button>
            </TooltipTrigger>
            <TooltipContent className="text-white">
              <p>Combine video, audio, and descriptions into final output</p>
            </TooltipContent>
          </Tooltip>{" "}
        </TooltipProvider>
      </div>
    </div>
  );
};
