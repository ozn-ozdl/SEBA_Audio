import React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "src/components/ui/dialog";
import { Button } from "src/components/ui/button";
import { Checkbox } from "src/components/ui/checkbox";
// import { Label } from "src/components/ui/label";
import { VideoDescriptionItem } from "src/types";
import { Label } from "./ui/label";


interface SceneSelectionModalProps {
  isOpen: boolean;
  scenes: VideoDescriptionItem[];
  selectedScenes: Set<number>;
  onSelectScene: (sceneStartTime: number) => void;
  onSelectAll: (select: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const SceneSelectionModal: React.FC<SceneSelectionModalProps> = ({
  isOpen,
  scenes,
  selectedScenes,
  onSelectScene,
  onSelectAll,
  onConfirm,
  onClose,
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
            size="sm"
            className="text-gray-300 hover:text-gray-100 mb-4"
            onClick={() => onSelectAll(!allSelected)}
          >
            {allSelected ? 'Deselect All' : 'Select All'}
          </Button>

          <div className="divide-y divide-gray-700/50 space-y-4">
            {scenes.map((scene, index) => (
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
                        {`${(scene.startTime / 1000).toFixed(2)}s - ${(scene.endTime / 1000).toFixed(2)}s`}
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
          <Button variant="outline" onClick={onClose} className="text-gray-300 border-gray-600 hover:bg-gray-700/50">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Reanalyze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SceneSelectionModal;