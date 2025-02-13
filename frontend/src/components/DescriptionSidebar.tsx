import React from "react";
import { ChevronLeft, CircleX, RefreshCw } from "lucide-react";
import { VideoDescriptionItem } from "src/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Button } from "./ui/button";

interface DescriptionsSidebarProps {
  descriptions: VideoDescriptionItem[];
  selectedScene: number | null;
  onDescriptionChange: (descriptions: VideoDescriptionItem[]) => void;
  onClose: () => void;
  onSceneSelect: (startTime: number) => void;
  onReanalyze: () => void;
  isVideoUploaded: boolean;
}

const buttonStyles = {
  base:
    "transition-all rounded-full duration-150 font-medium text-sm px-4 py-2 " +
    "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 " +
    "disabled:opacity-50 disabled:pointer-events-none",
  variants: {
    default:
      "bg-indigo-600 rounded-full hover:bg-indigo-700 text-white shadow-sm " +
      "hover:shadow-indigo-500/30",
    secondary:
      "bg-gray-800 rounded-full hover:bg-gray-700 text-gray-100 shadow-sm " +
      "hover:shadow-gray-500/20",
    ghost: "hover:bg-gray-800/50 rounded-full text-gray-300 hover:text-gray-100",
    outline:
      "border border-gray-600 rounded-full hover:border-gray-500 bg-gray-900/80 " +
      "text-gray-300 hover:text-gray-100",
    destructive:
      "bg-red-600 rounded-full hover:bg-red-700 text-white shadow-sm " +
      "hover:shadow-red-500/30",
  },
  sizes: {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  },
};
const calculateWPM = (startTime: number, endTime: number, text: string) => {
  const durationInMinutes = (endTime - startTime) / 60000; // Convert ms to min
  const wordCount = text.trim().split(/\s+/).length; // Count words
  return durationInMinutes > 0 ? wordCount / durationInMinutes : 0; // WPM
};

const getColorForWPM = (wpm: number) => {
  const averageWPM = 160; // Slightly faster than average human WPM
  const wpmRange = 40;
  if (wpm > averageWPM + wpmRange) return "text-red-500"; // Very fast
  if (wpm > averageWPM) return "text-yellow-500"; // Fast
  if (wpm < averageWPM) return "text-yellow-500"; // Good
  if (wpm < averageWPM - wpmRange) return "text-red-500"; // Very slow
  return "text-green-500"; // Good
};

export const DescriptionsSidebar: React.FC<DescriptionsSidebarProps> = ({
  descriptions,
  selectedScene,
  onDescriptionChange,
  onClose,
  onSceneSelect,
  onReanalyze,
  isVideoUploaded,
}) => {
  const updateSceneText = (startTime: number, newText: string) => {
    const updatedDescriptions = descriptions.map((scene) =>
      scene.startTime === startTime
        ? { ...scene, description: newText, isEdited: true, audioFile: undefined }
        : scene
    );
    onDescriptionChange(updatedDescriptions);
  };

  const deleteDescription = (startTime: number) => {
    const updatedDescriptions = descriptions.filter(
      (scene) => scene.startTime !== startTime
    );
    onDescriptionChange(updatedDescriptions);
  };

  return (
    <div className="w-[30rem] border-l border-gray-700 overflow-y-auto p-4 bg-gray-900/80 backdrop-blur-lg">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-100">
          Scene Descriptions
        </h2>
        <TooltipProvider>
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
        </TooltipProvider>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors duration-200"
        >
          <CircleX className="w-5 h-5 text-gray-400 hover:text-white" />
        </button>
      </div>

      {/* Scenes List */}
      {descriptions
        .filter((scene) => scene.description !== "TALKING")
        .map((scene) => {
          const wpm = calculateWPM(
            scene.startTime,
            scene.endTime,
            scene.description
          );
          const wpmColor = getColorForWPM(wpm);

          return (
            <div
              key={scene.startTime}
              className={`relative group mb-4 p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                selectedScene === scene.startTime
                  ? "border-blue-500 bg-gradient-to-br from-blue-900/50 to-purple-900/30"
                  : "border-gray-700 hover:border-gray-500 bg-gray-800/40"
              }`}
              onClick={() => onSceneSelect(scene.startTime)}
            >
              {/* Delete Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteDescription(scene.startTime);
                }}
                className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-500/20 rounded-lg"
              >
                <CircleX className="w-4 h-4 text-red-400 hover:text-white" />
              </button>

              {/* Time Range and WPM */}
              <div className="text-xs font-mono text-gray-400 mb-3">
                {`${(scene.startTime / 1000).toFixed(2)}s - ${(
                  scene.endTime / 1000
                ).toFixed(2)}s`}{" "}
                <span className={wpmColor}>{wpm.toFixed(1)} WPM</span>
              </div>

              {/* Text Editor */}
              <textarea
                className={`w-full text-sm font-medium rounded-lg p-2 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                  selectedScene === scene.startTime
                    ? "bg-gray-800/70 text-white border border-gray-600"
                    : "bg-gray-800/40 text-gray-300 border border-transparent"
                }`}
                rows={3}
                value={scene.description}
                placeholder="Describe this scene..."
                onChange={(e) =>
                  updateSceneText(scene.startTime, e.target.value)
                }
              />
            </div>
          );
        })}

      {/* Empty State */}
      {descriptions.length === 0 && (
        <div className="text-center p-6 text-gray-500">
          No scenes added yet.
          <br />
          Click "+" on the timeline to create scenes
        </div>
      )}
    </div>
  );
};
