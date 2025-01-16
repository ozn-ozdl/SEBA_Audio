import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  SkipBack,
  Maximize2,
  Settings,
  Clock,
  Upload,
} from "lucide-react";
import TimelineVisualizer from "./Timeline";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

interface VideoTimelineProps {
  videoDescriptions: VideoDescriptionItem[];
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  uploadedVideo: File | null;
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
  setUploadedVideo: (file: File | null) => void;
}

const TranscriptionEditor: React.FC<VideoTimelineProps> = ({
  videoDescriptions,
  onDescriptionChange,
  uploadedVideo,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggedSceneStartTime, setDraggedSceneStartTime] = useState<
    string | null
  >(null);
  const [initialMouseX, setInitialMouseX] = useState<number>(0);
  const [initialStartTime, setInitialStartTime] = useState<number>(0);

  // Update video file when uploadedVideo changes
  useEffect(() => {
    if (uploadedVideo) {
      const url = URL.createObjectURL(uploadedVideo);
      setVideoFile(url);
    }
  }, [uploadedVideo]);

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const formData = new FormData();

      // Show processing options dialog
      const action = await showProcessingOptions();
      if (!action) {
        setIsProcessing(false);
        return;
      }

      formData.append("action", action);
      formData.append("video", file);

      try {
        const response = await fetch("http://localhost:5000/process-video", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          const processedDescriptions = result.timestamps.map(
            (timestamp: any, index: number) => ({
              startTime: timestamp[0],
              endTime: timestamp[1],
              description: result.descriptions[index],
              videoUrl: `http://localhost:5000/scene_files/${result.scene_files[index]}`,
            })
          );

          // Update video descriptions through the parent component
          onDescriptionChange(processedDescriptions);

          // Create and set video URL
          const url = URL.createObjectURL(file);
          setVideoFile(url);
        } else {
          alert("Error processing video");
        }
      } catch (error) {
        alert("Error connecting to backend");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const showProcessingOptions = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const select = document.createElement("select");
      select.innerHTML = `
        <option value="">Choose an Action</option>
        <option value="openAI_image">OpenAI with images</option>
        <option value="gemini_whole_video">Gemini only video</option>
        <option value="gemini_optimized">Gemini optimized</option>
      `;

      const dialog = document.createElement("dialog");
      dialog.innerHTML = `
        <div style="padding: 20px;">
          <h2>Select Processing Option</h2>
          ${select.outerHTML}
          <div style="margin-top: 20px;">
            <button id="confirm">Confirm</button>
            <button id="cancel">Cancel</button>
          </div>
        </div>
      `;

      document.body.appendChild(dialog);
      dialog.showModal();

      dialog.querySelector("#confirm")?.addEventListener("click", () => {
        const selectedValue = (
          dialog.querySelector("select") as HTMLSelectElement
        ).value;
        dialog.close();
        document.body.removeChild(dialog);
        resolve(selectedValue || null);
      });

      dialog.querySelector("#cancel")?.addEventListener("click", () => {
        dialog.close();
        document.body.removeChild(dialog);
        resolve(null);
      });
    });
  };

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = (): void => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const togglePlayPause = (): void => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  const updateSceneText = (sceneStartTime: string, newText: string): void => {
    const updatedDescriptions = videoDescriptions.map((scene) =>
      scene.startTime === sceneStartTime
        ? { ...scene, description: newText }
        : scene
    );
    onDescriptionChange(updatedDescriptions);
  };

  // Utility function to convert timestamp to seconds
  const convertTimestampToSeconds = (timestamp: string): number => {
    const parts = timestamp.split(":");
    const seconds = parseFloat(parts.pop() || "0"); // Get the last part as seconds
    const minutes = parseInt(parts.pop() || "0", 10); // Get the minutes
    const hours = parseInt(parts.pop() || "0", 10); // Get the hours
    return hours * 3600 + minutes * 60 + seconds; // Convert to total seconds
  };

  // Start dragging
  const handleMouseDown = (
    sceneStartTime: string,
    event: React.MouseEvent<HTMLDivElement>
  ): void => {
    setIsDragging(true);
    setDraggedSceneStartTime(sceneStartTime);
    setInitialMouseX(event.clientX);
    const scene = videoDescriptions.find((s) => s.startTime === sceneStartTime);
    if (scene) {
      setInitialStartTime(convertTimestampToSeconds(scene.startTime));
    }
  };

  // Handle dragging
  const handleMouseMove = (event: MouseEvent): void => {
    if (isDragging && draggedSceneStartTime) {
      const deltaX = event.clientX - initialMouseX;
      const newEndTime = initialStartTime + deltaX / 100; // Convert pixels to seconds
      const updatedDescriptions = videoDescriptions.map((scene) => {
        if (scene.startTime === draggedSceneStartTime) {
          const newEndTimeFormatted = newEndTime.toFixed(3); // Format to 3 decimal places
          return { ...scene, endTime: newEndTimeFormatted };
        }
        return scene;
      });
      onDescriptionChange(updatedDescriptions);
    }
  };

  // Stop dragging
  const handleMouseUp = (): void => {
    setIsDragging(false);
    setDraggedSceneStartTime(null);
  };

  // Add event listeners for mouse move and mouse up
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="h-screen bg-gray-900 text-gray-200 flex flex-col">
      {/* Top Toolbar */}
      <div className="border-b border-gray-700 p-2 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button className="p-1.5 hover:bg-gray-700 rounded">
            <Settings className="w-4 h-4" />
          </button>
          <span className="text-sm">Transcription Editor</span>
        </div>
        <div className="flex items-center space-x-2">
          {isProcessing && (
            <span className="text-sm text-yellow-400">Processing video...</span>
          )}
          <button className="p-1.5 hover:bg-gray-700 rounded">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Left Sidebar - Transcription */}
        <div className="w-96 border-r border-gray-700 flex flex-col">
          <div className="p-2 border-b border-gray-700">
            <span className="text-sm font-medium">Transcription</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {videoDescriptions.map((scene, index) => (
              <div
                key={scene.startTime}
                className={`p-2 mb-2 rounded ${
                  selectedScene === scene.startTime
                    ? "bg-gray-700"
                    : "hover:bg-gray-800"
                }`}
                onClick={() => setSelectedScene(scene.startTime)}
              >
                <div className="text-xs text-gray-400 mb-1">
                  {`Scene ${index + 1}: ${scene.startTime} - ${scene.endTime}`}
                </div>
                <textarea
                  className="w-full bg-transparent border border-gray-600 rounded p-2 text-sm"
                  value={scene.description}
                  onChange={(e) =>
                    updateSceneText(scene.startTime, e.target.value)
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Preview and Timeline Area */}
        <div className="flex-1 flex flex-col">
          {/* Video Preview */}
          <div className="flex-1 bg-gray-800 flex items-center justify-center">
            {videoFile ? (
              <video
                ref={videoRef}
                className="max-h-full max-w-full"
                src={videoFile}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
              />
            ) : (
              <div className="text-center">
                <label className="cursor-pointer hover:bg-gray-700 p-4 rounded flex flex-col items-center">
                  <Upload className="w-8 h-8 mb-2" />
                  <span>Upload Video</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleVideoUpload}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Timeline Controls */}
          <div className="h-64 border-t border-gray-700">
            <div className="p-2 flex items-center space-x-2 border-b border-gray-700">
              <button
                className="p-1.5 hover:bg-gray-700 rounded"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
              <button className="p-1.5 hover:bg-gray-700 rounded">
                <SkipBack className="w-4 h-4" />
              </button>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm">
                  {currentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s
                </span>
              </div>
            </div>

            {/* Timeline */}
            <div className="relative h-48 overflow-x-auto">
              {/* Time markers */}
              <div className="absolute top-0 left-0 right-0 h-8 flex">
                {[...Array(20)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-none w-24 border-r border-gray-700 relative"
                  >
                    <span className="absolute -top-6 left-1 text-xs">{i}s</span>
                  </div>
                ))}
              </div>

              {/* Scenes */}
              <div className="absolute top-8 left-0 right-0 h-20">
                {videoDescriptions.map((scene, index) => (
                  <div
                    key={scene.startTime}
                    className="relative transition-colors duration-300 flex flex-col justify-center bg-gray-800 h-20 rounded-lg overflow-hidden border border-gray-300 mb-1"
                    style={{
                      left: `${
                        convertTimestampToSeconds(scene.startTime) * 100
                      }px`, // Convert to number
                      width: `${
                        (convertTimestampToSeconds(scene.endTime) -
                          convertTimestampToSeconds(scene.startTime)) *
                        100
                      }px`, // Convert to number
                    }}
                    onMouseDown={(e) => handleMouseDown(scene.startTime, e)}
                  >
                    {/* Left Resize Handle */}
                    <div
                      className="absolute w-2 h-full transition-all duration-300 z-10 left-0 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown(scene.startTime, e)}
                    >
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white">☰</span>
                      </div>
                    </div>

                    {/* Right Resize Handle */}
                    <div
                      className="absolute w-2 h-full transition-all duration-300 z-10 right-0 cursor-col-resize"
                      onMouseDown={(e) => handleMouseDown(scene.startTime, e)}
                    >
                      <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                        <span className="text-white">☰</span>
                      </div>
                    </div>

                    {/* Scene Header */}
                    <div className="h-3 bg-teal-500 flex items-center justify-center">
                      <span className="text-white">{`Scene ${index + 1}`}</span>
                    </div>

                    {/* Scene Description */}
                    <div className="m-2 text-sm text-gray-200">
                      {scene.description} {/* Display the full description */}
                    </div>
                  </div>
                ))}
              </div>

              {/* Video Timeline */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-800">
                {videoFile && (
                  <div className="absolute inset-0 bg-gray-600">
                    <div
                      className="absolute bg-gray-400 h-full"
                      style={{
                        width: `${currentTime * 100}px`,
                        maxWidth: `${videoDuration * 100}px`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <TimelineVisualizer />
    </div>
  );
};

// Utility function to convert timestamp to seconds
const convertTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":");
  const seconds = parseFloat(parts.pop() || "0"); // Get the last part as seconds
  const minutes = parseInt(parts.pop() || "0", 10); // Get the minutes
  const hours = parseInt(parts.pop() || "0", 10); // Get the hours
  return hours * 3600 + minutes * 60 + seconds; // Convert to total seconds
};

export default TranscriptionEditor;
