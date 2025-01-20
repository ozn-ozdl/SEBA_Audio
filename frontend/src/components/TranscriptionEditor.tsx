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
  const animationRef = useRef<number | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Update current subtitle based on video time
  useEffect(() => {
    if (videoDescriptions.length === 0) return;

    const currentTimeInSeconds = currentTime;
    const currentScene = videoDescriptions.find((scene) => {
      const startTime = convertTimestampToSeconds(scene.startTime);
      const endTime = convertTimestampToSeconds(scene.endTime);
      return (
        currentTimeInSeconds >= startTime && currentTimeInSeconds <= endTime
      );
    });

    setCurrentSubtitle(currentScene?.description || "");
  }, [currentTime, videoDescriptions]);

  // Update video file when uploadedVideo changes
  useEffect(() => {
    if (uploadedVideo) {
      const url = URL.createObjectURL(uploadedVideo);
      setVideoFile(url);
    }
  }, [uploadedVideo]);

  // High-precision time update using requestAnimationFrame
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      const updateCurrentTime = () => {
        if (videoRef.current) {
          setCurrentTime(videoRef.current.currentTime);
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
  }, [isPlaying]);

  useEffect(() => {
    if (!audioRef.current) return;
    const context = new AudioContext();
    const source = context.createMediaElementSource(audioRef.current);
    const analyser = context.createAnalyser();

    source.connect(analyser);
    analyser.connect(context.destination);

    setAudioContext(context);
    setAnalyserNode(analyser);
  }, [audioRef]);

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
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVideoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const formData = new FormData();

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

          onDescriptionChange(processedDescriptions);
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
        <div class="p-4">
          <h2 class="text-lg font-semibold">Select Processing Option</h2>
          ${select.outerHTML}
          <div class="mt-4">
            <button id="confirm" class="bg-blue-500 text-white px-4 py-2 rounded">Confirm</button>
            <button id="cancel" class="bg-gray-300 text-black px-4 py-2 rounded">Cancel</button>
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

  const updateSceneText = (sceneStartTime: string, newText: string): void => {
    const updatedDescriptions = videoDescriptions.map((scene) =>
      scene.startTime === sceneStartTime
        ? { ...scene, description: newText }
        : scene
    );
    onDescriptionChange(updatedDescriptions);
  };

  return (
    <div className="max-w-full overflow-hidden bg-gray-50">
      {/* Top Toolbar */}
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
        <div className="flex items-center">
          <button className="mr-2">
            <Settings className="text-white" />
          </button>
          <span className="text-lg font-semibold">Transcription Editor</span>
        </div>
        <div className="flex items-center">
          {isProcessing && <span className="mr-2">Processing video...</span>}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-screen">
        {/* Left Sidebar - Transcription */}
        <div className="w-2/5 p-4 bg-white shadow-md overflow-y-auto">
          <div className="mb-4">
            <span className="font-bold text-xl">Transcription</span>
          </div>

          {/* Buttons Section */}
          <div className="mb-4">
            <button className="mr-2 p-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Download Transcript
            </button>
            <button className="mr-2 p-2 bg-gray-300 text-black rounded hover:bg-gray-400">
              Reset Text
            </button>
            <button className="p-2 bg-green-500 text-white rounded hover:bg-green-600">
              Add Scene
            </button>
          </div>

          <div>
            {videoDescriptions.map((scene, index) => (
              <div
                key={scene.startTime}
                className={`p-2 mb-2 rounded-lg border ${
                  selectedScene === scene.startTime
                    ? "bg-blue-500 text-white"
                    : "hover:bg-gray-200"
                }`}
                onClick={() => setSelectedScene(scene.startTime)}
              >
                <div>
                  {`Scene ${index + 1}: ${scene.startTime} - ${scene.endTime}`}
                </div>
                <textarea
                  className="w-full border border-gray-300 rounded p-1 mt-1"
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
        <div className="w-3/5 p-4 bg-white flex flex-col shadow-md">
          {/* Video Preview */}
          <div className="flex-grow mb-4 relative">
            {videoFile ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full rounded-lg shadow-lg"
                  src={videoFile}
                  onLoadedMetadata={handleLoadedMetadata}
                  controls={false} // Custom controls
                />
                {/* Subtitle Overlay */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg max-w-2xl text-center">
                    <p className="text-white text-lg font-semibold">
                      {currentSubtitle}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <label className="flex items-center cursor-pointer">
                  <Upload className="mr-2" />
                  <span className="text-lg">Upload Video</span>
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

          {/* Timeline Controls and Visualizer */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <button
                className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={togglePlayPause}
              >
                {isPlaying ? (
                  <Pause className="text-black" />
                ) : (
                  <Play className="text-black" />
                )}
              </button>
              <button className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300">
                <SkipBack className="text-black" />
              </button>
              <div className="flex items-center">
                <Clock className="mr-1" />
                <span>
                  {currentTime.toFixed(3)}s / {videoDuration.toFixed(3)}s
                </span>
              </div>
            </div>

            {/* Timeline Visualizer */}
            <TimelineVisualizer
              videoDescriptions={videoDescriptions}
              currentTime={currentTime}
              onDescriptionChange={onDescriptionChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// Utility function to convert timestamp to seconds
const convertTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":");
  const seconds = parseFloat(parts.pop() || "0");
  const minutes = parseInt(parts.pop() || "0", 10);
  const hours = parseInt(parts.pop() || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
};

export default TranscriptionEditor;
