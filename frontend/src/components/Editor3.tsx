import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Settings,
  Upload,
  Volume,
  ChevronRight,
  ChevronLeft,
  Speech,
  Loader2,
} from "lucide-react";
import { Button } from "src/components/ui/button";
import TimelineVisualizer2 from "./Timeline2";
import SceneSelectionModal from "./SceneSelectionModal";
import { VideoHeader } from "./VideoHeader";
import { VideoPlayer } from "./VideoPlayer";
import { VideoControls } from "./VideoControls";

import { ProcessingOverlay } from "./ProcessingOverlay";
import { DescriptionsSidebar } from "./DescriptionSidebar";
import { VideoDescriptionItem } from "src/types";

// interface VideoDescriptionItem {
//   startTime: number;
//   endTime: number;
//   description: string;
//   audioFile?: string;
// }

interface VideoTimelineProps {
  videoDescriptions: VideoDescriptionItem[];
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  uploadedVideo: File | null;
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
  setUploadedVideo: (file: File | null) => void;
  handleEncodeVideo: (videofile: File) => void;
  toggleAudioDescription: () => void;
  handleAnalyzeVideo: (videoFile: File, action: string) => Promise<void>;
  handleReanalyzeVideo: (selectedSceneStartTimes: number[]) => Promise<void>;
  handleRegenerateAudio: () => void;
  selectedScenes: Set<number>;
  onSelectScene: (sceneStartTime: number) => void;
  onSelectAll: (select: boolean) => void;
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;
  onGenerateDescriptions: () => void;
  onRegenerateAudio: () => void;
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

export const TranscriptionEditor: React.FC<VideoTimelineProps> = ({
  videoDescriptions,
  onDescriptionChange,
  uploadedVideo,
  handleEncodeVideo,
  handleRegenerateAudio,
  handleReanalyzeVideo,
  handleAnalyzeVideo,
  selectedScenes,
  onSelectAll,
  onSelectScene,
  isProcessing,
  processingProgress,
  processingMessage,
  onGenerateDescriptions,
  onRegenerateAudio,
}) => {
  const [state, setState] = useState({
    isPlaying: false,
    currentTime: 0,
    videoDuration: 0,
    videoVolume: 1,
    audioVolume: 1,
    videoUrl: "",
    selectedScene: null as number | null,
    currentSubtitle: "",
    selectedScenes: new Set<number>(),
    isDescriptionsVisible: true,
    isModalOpen: false,
    videoFile: null as File | null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const animationRef = useRef<number | null>(null);

  const updateState = (newState: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  useEffect(() => {
    if (uploadedVideo) {
      const url = URL.createObjectURL(uploadedVideo);
      updateState({ videoUrl: url });
    }
  }, [uploadedVideo]);

  useEffect(() => {
    const scene = videoDescriptions.find(
      (scene) =>
        state.currentTime >= scene.startTime / 1000 &&
        state.currentTime <= scene.endTime / 1000
    );
    updateState({ currentSubtitle: scene?.description || "" });
  }, [state.currentTime, videoDescriptions]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = state.videoVolume;
  }, [state.videoVolume]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = state.audioVolume;
  }, [state.audioVolume]);

  const handleTimelineUpdate = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      updateState({ currentTime: newTime });
    }
  };

  const handleCurrentTimeUpdate = (currentTime: number) => {
    updateState({ currentTime }); // Update currentTime from VideoPlayer
  };

  const togglePlayPause = () => {
    if (videoRef.current) {
      state.isPlaying ? videoRef.current.pause() : videoRef.current.play();
      if (audioRef.current) {
        state.isPlaying ? audioRef.current.pause() : audioRef.current.play();
      }
      updateState({ isPlaying: !state.isPlaying });
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      updateState({
        videoUrl: URL.createObjectURL(file),
        videoFile: file,
      });
    }
  };

  const analyzeVideo = async () => {
    if (state.videoFile) {
      try {
        await handleAnalyzeVideo(state.videoFile, "new_gemini");
      } catch (error) {
        alert("Error processing video");
      }
    }
  };

  const handleModalConfirm = async () => {
    const scenesToReanalyze = Array.from(state.selectedScenes);
    await handleReanalyzeVideo(scenesToReanalyze);
    updateState({ isModalOpen: false });
  };
  function onReanalyze(): void {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="max-w-full overflow-hidden bg-gray-700/70 backdrop-blur-sm h-screen flex flex-col">
      {isProcessing && (
        <ProcessingOverlay
          progress={processingProgress}
          message={processingMessage}
        />
      )}

      <SceneSelectionModal
        isOpen={state.isModalOpen}
        scenes={videoDescriptions}
        selectedScenes={selectedScenes} // From props
        onSelectScene={onSelectScene} // From props
        onSelectAll={onSelectAll} // From props
        onConfirm={onReanalyze} // From props
        onGenerateDescriptions={onGenerateDescriptions}
        onRegenerateAudio={onRegenerateAudio}
        onClose={() => updateState({ isModalOpen: false })}
      />

      {/* <VideoHeader
        onEncode={() => state.videoFile && handleEncodeVideo(state.videoFile)}
        onAnalyze={analyzeVideo}
        onReanalyze={() => updateState({ isModalOpen: true })}
        onRegenerateAudio={handleRegenerateAudio}
      /> */}

      <VideoHeader
        uploadedVideo={state.videoFile}
        onEncode={() => state.videoFile && handleEncodeVideo(state.videoFile)}
        onAnalyze={analyzeVideo}
        onReanalyze={() => updateState({ isModalOpen: true })}
        onRegenerateAudio={handleRegenerateAudio}
        videoDescriptions={videoDescriptions}
      />

      <div className="flex flex-1 overflow-hidden">
        {state.isDescriptionsVisible && (
          <DescriptionsSidebar
            descriptions={videoDescriptions}
            selectedScene={state.selectedScene}
            onDescriptionChange={onDescriptionChange}
            onClose={() => updateState({ isDescriptionsVisible: false })}
            onSceneSelect={(startTime) =>
              updateState({ selectedScene: startTime })
            }
          />
        )}

        <div className="flex-1 flex flex-col">
          {!state.isDescriptionsVisible && (
            <Button
              onClick={() => updateState({ isDescriptionsVisible: true })}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-r-lg shadow-lg z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          )}

          <VideoPlayer
            videoRef={videoRef}
            videoUrl={state.videoUrl}
            videoFile={state.videoFile}
            currentSubtitle={state.currentSubtitle}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                updateState({ videoDuration: videoRef.current.duration });
              }
            }}
            onUpload={handleVideoUpload}
            isProcessing={isProcessing}
            onTimeUpdate={handleCurrentTimeUpdate} // Pass the time update handler
            isPlaying={state.isPlaying} // Pass the isPlaying state
          />

          <VideoControls
            isPlaying={state.isPlaying}
            currentTime={state.currentTime}
            videoDuration={state.videoDuration}
            videoVolume={state.videoVolume}
            audioVolume={state.audioVolume}
            onPlayPause={togglePlayPause}
            onTimeUpdate={handleTimelineUpdate}
            onVideoVolumeChange={(vol) => updateState({ videoVolume: vol })}
            onAudioVolumeChange={(vol) => updateState({ audioVolume: vol })}
          />
        </div>
      </div>

      <TimelineVisualizer2
        videoDescriptions={videoDescriptions}
        currentTime={state.currentTime}
        onDescriptionChange={onDescriptionChange}
        onTimeUpdate={handleTimelineUpdate}
        visualizer={<div />}
        isPlaying={state.isPlaying}
        videoduration={state.videoDuration}
        audioVolume={state.audioVolume}
      />
    </div>
  );
};

export default TranscriptionEditor;
