import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Checkbox } from "src/components/ui/checkbox";
import { VideoDescriptionItem } from "src/types";
import { Label } from "./ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { on } from "events";

interface SceneSelectionModalProps {
  isOpen: boolean;
  scenes: VideoDescriptionItem[];
  selectedScenes: Set<number>;
  onGenerateDescriptions: () => void;
  onRegenerateAudio: () => void;
  onSelectScene: (sceneStartTime: number) => void;
  onSelectAll: (select: boolean) => void;
  onClose: () => void;
}

const buttonStyles = {
  base: "transition-all duration-150 font-medium rounded-lg text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none",
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

const SceneSelectionModal: React.FC<SceneSelectionModalProps> = ({
  isOpen,
  scenes,
  selectedScenes,
  onSelectScene,
  onSelectAll,
  onClose,
  onGenerateDescriptions,
  onRegenerateAudio,
}) => {
  const allSelected = selectedScenes.size === scenes.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-gray-100">
            Select Scenes to Reanalyze
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            Choose scenes from the list below
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-1">
          <Button
            variant="ghost"
            className={`${buttonStyles.base} ${buttonStyles.variants.ghost} ${buttonStyles.sizes.sm}`}
            onClick={() => onSelectAll(!allSelected)}
          >
            {allSelected ? "Deselect All" : "Select All"}
          </Button>

          {/* Add maxHeight and overflow-y to make the list scrollable */}
          <div
            className="divide-y divide-gray-700/50 space-y-4"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            {scenes
              .filter((scene) => scene.description !== "TALKING")
              .map((scene, index) => (
                <div key={scene.startTime} className="group relative">
                  <div className="flex items-start space-x-3 py-3 hover:bg-gray-800/50 rounded-lg px-3 transition-colors">
                    <Checkbox
                      id={`scene-${scene.startTime}`}
                      checked={selectedScenes.has(scene.startTime)}
                      onCheckedChange={() => onSelectScene(scene.startTime)}
                      className="h-5 w-5 text-indigo-400 border-gray-500 data-[state=checked]:border-indigo-400 mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline space-x-2">
                        <Label
                          htmlFor={`scene-${scene.startTime}`}
                          className="font-mono text-sm text-indigo-300"
                        >
                          {`${(scene.startTime / 1000).toFixed(2)}s - ${(
                            scene.endTime / 1000
                          ).toFixed(2)}s`}
                        </Label>
                      </div>
                      <p className="text-gray-300 text-base mt-1 line-clamp-2 hover:line-clamp-none transition-all">
                        {scene.description}
                      </p>
                    </div>
                  </div>

                  {index < scenes.length - 1 && (
                    <div className="absolute -bottom-2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-600/30 to-transparent" />
                  )}
                </div>
              ))}
          </div>
        </div>
        <DialogFooter className="mt-6">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  className={`${buttonStyles.base} ${buttonStyles.variants.outline} ${buttonStyles.sizes.md}`}
                  onClick={onClose}
                >
                  Cancel
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-white">
                <p>Cancel the operation</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="default"
                  className={`${buttonStyles.base} ${buttonStyles.variants.default} ${buttonStyles.sizes.md}`}
                  onClick={onGenerateDescriptions}
                >
                  Descriptions
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-white">
                <p>Regenerate descriptions from selected timestamps</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="default"
                  className={`${buttonStyles.base} ${buttonStyles.variants.default} ${buttonStyles.sizes.md}`}
                  onClick={onRegenerateAudio}
                >
                  Audio
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-white">
                <p>
                  Regenerate Audio files from selected timestamps and
                  descriptions
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SceneSelectionModal;
