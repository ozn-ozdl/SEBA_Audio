import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import {
  Play,
  Pause,
  Settings,
  Clock,
  Upload,
  Volume,
  ChevronRight,
  ChevronLeft,
  Speech,
  Loader2,
} from "lucide-react";
import TimelineVisualizer from "./Timeline2";
import TimelineVisualizer2 from "./Timeline2";

interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
}

interface VideoTimelineProps {
  videoDescriptions: VideoDescriptionItem[];
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  uploadedVideo: File | null;
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
  setUploadedVideo: (file: File | null) => void;
  handleEncodeVideo: (videofile: File) => void;
  toggleAudioDescription: () => void;
  handleAnalyzeVideo: (videoFile: File, action: string) => Promise<void>;
  handleReanalyzeVideo: (videoFile: string) => Promise<void>;
  handleRegenerateAudio: () => void;
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;
}

const TranscriptionEditor3: React.FC<VideoTimelineProps> = ({
  videoDescriptions,
  onDescriptionChange,
  uploadedVideo,
  onProcessVideo,
  setUploadedVideo,
  handleEncodeVideo,
  toggleAudioDescription,
  handleRegenerateAudio,
  handleReanalyzeVideo,
  handleAnalyzeVideo,
  isProcessing,
  processingProgress,
  processingMessage,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  // const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [isDescriptionsVisible, setIsDescriptionsVisible] =
    useState<boolean>(true);

  // Add these effects to update media volumes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = videoVolume;
    }
  }, [videoVolume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = audioVolume;
    }
  }, [audioVolume]);

  useEffect(() => {
    const currentTimeInSeconds = currentTime;
    const currentScene = videoDescriptions.find(
      (scene) =>
        currentTimeInSeconds >= scene.startTime / 1000 &&
        currentTimeInSeconds <= scene.endTime / 1000
    );
    setCurrentSubtitle(currentScene?.description || "");
  }, [currentTime, videoDescriptions]);

  useEffect(() => {
    if (uploadedVideo) {
      const url = URL.createObjectURL(uploadedVideo);
      setVideoUrl(url);
    }
  }, [uploadedVideo]);

  const handleTimelineUpdate = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

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

  const handleTimeUpdate = (): void => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const updateSceneText = (sceneStartTime: number, newText: string): void => {
    const updatedDescriptions = videoDescriptions.map((scene) =>
      scene.startTime === sceneStartTime
        ? { ...scene, description: newText }
        : scene
    );
    onDescriptionChange(updatedDescriptions);
  };

  const deleteDescription = (startTime: number): void => {
    const updatedDescriptions = videoDescriptions.filter(
      (scene) => scene.startTime !== startTime
    );
    onDescriptionChange(updatedDescriptions);
  };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setVideoFile(file);
    }
  };

  const analyzeVideo = async (): Promise<void> => {
    if (videoFile) {
      try {
        // setIsProcessing(true);
        await handleAnalyzeVideo(videoFile, "new_gemini");
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
      } catch (error) {
        alert("Error processing video");
      } finally {
        // setIsProcessing(false);
      }
    }
  };

  const reanalyzeVideo = async (): Promise<void> => {
    if (videoFile) {
      try {
        // setIsProcessing(true);
        await handleReanalyzeVideo(videoFile.name);
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
      } catch (error) {
        alert("Error reanalyzing video");
      } finally {
        // setIsProcessing(false);
      }
    }
  };

  const encodeVideo = async (): Promise<void> => {
    if (videoFile) {
      try {
        setIsEncoding(true);
        handleEncodeVideo(videoFile);
      } catch (error) {
        alert("Error encoding video");
      } finally {
        setIsEncoding(false);
      }
    }
  };

  return (
    <div className="max-w-full overflow-hidden bg-gray-700/70 backdrop-blur-sm h-screen flex flex-col">
      {isProcessing && (
        <div className="fixed inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm z-50">
          <div className="bg-transparent p-6 rounded-lg shadow-lg max-w-md w-full text-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2
                className="w-12 h-12 text-blue-600 animate-spin"
                style={{
                  strokeDasharray: 100,
                  strokeDashoffset: 100 - processingProgress,
                }}
              />
              <span className="text-lg font-semibold text-white">
                {processingProgress}%
              </span>
              <p className="text-sm text-gray-200">
                {processingMessage || "Processing video..."}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                This may take a few moments...
              </p>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex justify-between items-center p-2 bg-gray-800/70 text-white shadow-md backdrop-blur-sm">
        <div className="flex items-center">
          <button className="mr-2">
            <Settings className="w-5 h-5 text-white" />
          </button>
          <span className="text-lg  text-white font-semibold">
            Transcription Editor
          </span>
        </div>

        <div className="flex items-center">
          <button
            className="mr-2 p-1 border-2 border-gray-200/50 rounded hover:bg-gray-500/60 hover:text-white"
            onClick={encodeVideo}
          >
            Encode
          </button>
          <button
            className="mr-2 p-1 border-2 border-gray-200/50 rounded hover:bg-gray-500/60 hover:text-white"
            onClick={analyzeVideo}
          >
            Analyze
          </button>
          <div>
            <div className="flex items-center">Regenerate</div>
            <div className="flex items-center border-2 border-gray-200">  
              <button
                className="mr-2 p-1 border-2 border-gray-200/50 rounded hover:bg-gray-500/60 hover:text-white"
                onClick={reanalyzeVideo}
              >
                Reanalyze
              </button>
              <button
                className="mr-2 p-1 border-2 border-gray-200/50 rounded hover:bg-gray-500/60 hover:text-white"
                onClick={handleRegenerateAudio}
              >
                Regenerate Audio
              </button>
            </div>
          </div>
          <div className="flex items-center">
            {/* {isProcessing && <span className="mr-2">Processing video...</span>} */}
            {isEncoding && <span className="mr-2">Encoding video...</span>}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Collapsible Descriptions Sidebar */}
        {isDescriptionsVisible && (
          <div className="w-1/3 border-r overflow-y-auto p-1 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg text-white font-semibold">
                Description Editor
              </h2>
              <button
                onClick={() => setIsDescriptionsVisible(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {videoDescriptions
              .filter((scene) => scene.description !== "TALKING")
              .map((scene, index) => (
                <div
                  key={scene.startTime}
                  className={`relative p-1 mb-2 rounded-2xl border ${
                    selectedScene === scene.startTime
                      ? "bg-transparent"
                      : "hover:bg-gray-100/40"
                  }`}
                  onClick={() => setSelectedScene(scene.startTime)}
                >
                  {/* Delete button positioned top-right */}
                  <button
                    className="absolute top-1 right-2 w-4 h-4 flex items-center text-xs border border-red-500 justify-center rounded-full bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent the div's onClick from firing
                      deleteDescription(scene.startTime);
                    }}
                  >
                    ✕
                  </button>

                  <div className="flex flex-col">
                    <div className="text-xs text-gray-100 mb-1">
                      {`${(scene.startTime / 1000).toFixed(2)}s - ${(
                        scene.endTime / 1000
                      ).toFixed(2)}s`}
                    </div>
                    <textarea
                      className="w-full border-1 border-gray-200 bg-gray-500/50 text-white font-medium rounded-xl p-2 text-sm"
                      rows={3}
                      value={scene.description}
                      onChange={(e) =>
                        updateSceneText(scene.startTime, e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Video and Controls */}
        <div className="flex-1 flex flex-col">
          {/* Button to get descriptions back */}
          {!isDescriptionsVisible && (
            <button
              onClick={() => setIsDescriptionsVisible(true)}
              className="absolute left-0 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-2 rounded-r-lg shadow-lg z-10"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Video Container */}
          <div className="flex-1 relative">
            {videoFile ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <video
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  controls={false}
                />

                {/* Subtitle Overlay */}
                <div className="absolute bottom-8 left-0 right-0 flex justify-center">
                  <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg max-w-2xl text-center">
                    <p className="text-white text-lg font-semibold">
                      {currentSubtitle}
                    </p>
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
                    onChange={handleVideoUpload}
                    disabled={isProcessing}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Video Controls */}
          <div className="p-2 bg-gray-800/70 flex items-center justify-between backdrop-blur-sm">
            {/* Play Controls */}
            <button
              className="p-3 bg-gray-200 rounded-full hover:bg-gray-300"
              onClick={togglePlayPause}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </button>
            {/* Timeline */}
            <input
              type="range"
              min="0"
              max={videoDuration || 0}
              step="0.1"
              value={currentTime}
              onChange={(e) => handleTimelineUpdate(parseFloat(e.target.value))}
              className="flex-1 mx-4"
            />
            {/* Video Volume */}
            <div className="flex items-center">
              <Volume className="w-5 h-5 text-gray-600" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={videoVolume}
                onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                className="w-24 ml-2"
              />
            </div>
            <div className="flex items-center">
              <Speech className="w-5 h-5 text-gray-600" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                className="w-24 ml-2"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Visualizer */}
      <div className="">
        <TimelineVisualizer2
          videoDescriptions={videoDescriptions}
          currentTime={currentTime} // Convert to milliseconds
          onDescriptionChange={onDescriptionChange}
          onTimeUpdate={(ms) => handleTimelineUpdate(ms)} // Convert to seconds
          visualizer={<div></div>}
          isPlaying={isPlaying}
          videoduration={videoDuration}
          audioVolume={audioVolume}
        />
      </div>
    </div>
  );
};

export default TranscriptionEditor3;
