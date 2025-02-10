import React, { useEffect, useState } from "react";
import { Download, RefreshCw, Settings, Sparkles, Video } from "lucide-react";
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
  base: "transition-all duration-150 rounded-full font-medium text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none",
  variants: {
    default:
      "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm hover:shadow-indigo-500/30 rounded-full",
    secondary:
      "bg-gray-800 hover:bg-gray-700 text-gray-100 shadow-sm hover:shadow-gray-500/20 rounded-full",
    ghost: "hover:bg-gray-800/50 text-gray-300 hover:text-gray-100 rounded-full",
    outline:
      "border border-gray-600 hover:border-gray-500 bg-gray-900/80 text-gray-300 hover:text-gray-100 rounded-full",
    destructive:
      "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-red-500/30 rounded-full",
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
  videoDescriptions: initialVideoDescriptions, // Rename for clarity
}) => {
  const [videoDescriptions, setVideoDescriptions] = useState<VideoDescriptionItem[]>(initialVideoDescriptions); // State for filtered descriptions
  let hasNoAudio = videoDescriptions.some((desc) => !desc.audioFile);
  const [isVideoUploaded, setIsVideoUploaded] = useState(false);
  let isNotEdited = videoDescriptions.every((desc) => !desc.isEdited);

  useEffect(() => {
    // Filter out "TALKING" scenes when initialVideoDescriptions changes
    const filteredDescriptions = initialVideoDescriptions.filter(
      (desc) => !desc.description.toUpperCase().includes("TALKING")
    );
    setVideoDescriptions(filteredDescriptions);
  }, [initialVideoDescriptions]); // Crucial: Add initialVideoDescriptions as a dependency


  useEffect(() => {
    if (videoDescriptions.length > 0) {
      isNotEdited = videoDescriptions.every((desc: { isEdited: boolean; }) => !desc.isEdited);
      hasNoAudio = videoDescriptions.some((desc) => !desc.audioFile);
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
          {/* <Tooltip>
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
          </Tooltip> */}
          {/* Encode Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="default"
                className={`${buttonStyles.base} ${buttonStyles.variants.default} ${buttonStyles.sizes.md}`}
                onClick={onEncode}
                disabled={!isVideoUploaded || hasNoAudio || isNotEdited} // Disable if no video or no audio or not all descriptions are not edited
              >
                <Download className="w-4 h-4 mr-2" />
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
