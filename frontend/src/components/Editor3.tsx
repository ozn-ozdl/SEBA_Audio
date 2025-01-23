import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Play, Pause, Settings, Clock, Upload } from "lucide-react";
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
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isEncoding, setIsEncoding] = useState<boolean>(false);
  const [videoVolume, setVideoVolume] = useState<number>(1);
  const [audioVolume, setAudioVolume] = useState<number>(1);

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
    console.log("currentTime:", currentTime);
    console.log("videoDescriptions:", videoDescriptions);
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
        setIsProcessing(true);
        await handleAnalyzeVideo(videoFile, "new_gemini");
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
      } catch (error) {
        alert("Error processing video");
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const reanalyzeVideo = async (): Promise<void> => {
    if (videoFile) {
      try {
        setIsProcessing(true);
        await handleReanalyzeVideo(videoFile.name);
        const url = URL.createObjectURL(videoFile);
        setVideoUrl(url);
      } catch (error) {
        alert("Error reanalyzing video");
      } finally {
        setIsProcessing(false);
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
    <div className="max-w-full overflow-hidden bg-gray-50 h-screen">
      <div className="flex justify-between items-center p-4 bg-gray-800 text-white shadow-md">
        <div className="flex items-center">
          <button className="mr-2">
            <Settings className="text-white" />
          </button>
          <span className="text-lg font-semibold">Transcription Editor</span>
        </div>
        <div className="flex items-center">
          {isProcessing && <span className="mr-2">Processing video...</span>}
          {isEncoding && <span className="mr-2">Encoding video...</span>}
        </div>
      </div>

      <div className="grid grid-cols-10 grid-rows-10 h-full">
        <div className="col-span-5 row-span-7 p-4 bg-white shadow-md overflow-y-auto">
          <div>
            {videoDescriptions
              .filter((scene) => scene.description !== "TALKING")
              .map((scene, index) => (
                <div
                  key={scene.startTime}
                  className={`p-2 mb-2 rounded-lg border ${
                    selectedScene === scene.startTime
                      ? "bg-blue-500 text-black"
                      : "hover:bg-gray-200"
                  }`}
                  onClick={() => setSelectedScene(scene.startTime)}
                >
                  <div>
                    {`Scene ${index + 1}: ${(scene.startTime / 1000).toFixed(
                      3
                    )}s - ${(scene.endTime / 1000).toFixed(3)}s`}
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

        <div className="col-span-5 row-span-7 flex flex-col p-4 bg-white shadow-md">
          <div className="flex-grow mb-4 relative">
            {videoFile ? (
              <>
                <video
                  ref={videoRef}
                  className="w-full rounded-lg shadow-lg"
                  src={videoUrl}
                  onLoadedMetadata={handleLoadedMetadata}
                  controls={false}
                />
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

          <div className="flex items-center mb-2 col-span-6">
            <div>
              {/* Play/Pause button */}
              <div>
                <button
                  className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300 w-full"
                  onClick={togglePlayPause}
                >
                  {isPlaying ? (
                    <Pause className="text-black" />
                  ) : (
                    <Play className="text-black" />
                  )}
                </button>
              </div>

              {/* Video Volume Slider */}
              <div className="flex items-center mr-4">
                <span className="mr-2">Video:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={videoVolume}
                  onChange={(e) => setVideoVolume(parseFloat(e.target.value))}
                  className="w-24"
                />
              </div>

              {/* Audio Volume Slider */}
              <div className="flex items-center mr-4">
                <span className="mr-2">Audio:</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={audioVolume}
                  onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                  className="w-24"
                />
              </div>

              {/* Time display */}
              <div className="flex items-center">
                <Clock className="mr-1" />
                <span>
                  {currentTime.toFixed(3)}s / {videoDuration.toFixed(3)}s
                </span>
              </div>
            </div>
            <div>
              <button
                className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={encodeVideo}
              >
                Encode
              </button>
              <button
                className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={analyzeVideo}
              >
                Analyze
              </button>
              <button
                className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={reanalyzeVideo}
              >
                Reanalyze
              </button>
              <button
                className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
                onClick={handleRegenerateAudio}
              >
                Regenerate Audio
              </button>
              <div className="w-full mb-4">
                <input
                  type="range"
                  min="0"
                  max={videoDuration || 0}
                  step="0.1"
                  value={currentTime}
                  onChange={(e) =>
                    handleTimelineUpdate(parseFloat(e.target.value))
                  }
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-10 row-span-2 p-4 bg-white shadow-md">
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
    </div>
  );
};

// const convertTimestampToSeconds = (timestamp: string): number => {
//   const parts = timestamp.split(":");
//   const seconds = parseFloat(parts.pop() || "0");
//   const minutes = parseInt(parts.pop() || "0", 10);
//   const hours = parseInt(parts.pop() || "0", 10);
//   return hours * 3600 + minutes * 60 + seconds;
// };

const convertTimestampToSeconds = (timestamp: string): number => {
  // Check if the timestamp is in the format hhmmSSss (e.g., 000279 for 00:02.79)
  if (/^\d{6}(\.\d+)?$/.test(timestamp)) {
    const hours = parseInt(timestamp.slice(0, 2), 10);
    const minutes = parseInt(timestamp.slice(2, 4), 10);
    const seconds = parseFloat(timestamp.slice(4)); // Handles fractional seconds

    if (minutes < 0 || minutes >= 60) {
      throw new Error(
        `Invalid minutes value: ${minutes}. Must be between 0 and 59.`
      );
    }
    if (seconds < 0 || seconds >= 60) {
      throw new Error(
        `Invalid seconds value: ${seconds}. Must be between 0 and 59.999.`
      );
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  // Check if the timestamp is in the format HH:MM:SS.sss
  if (/^(\d{1,2}):(\d{1,2}):(\d{1,2}(?:\.\d+)?)$/.test(timestamp)) {
    const parts = timestamp.split(":");
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    const seconds = parseFloat(parts[2]); // Handles fractional seconds

    if (minutes < 0 || minutes >= 60) {
      throw new Error(
        `Invalid minutes value: ${minutes}. Must be between 0 and 59.`
      );
    }
    if (seconds < 0 || seconds >= 60) {
      throw new Error(
        `Invalid seconds value: ${seconds}. Must be between 0 and 59.999.`
      );
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  // If neither format matches, throw an error
  throw new Error(
    `Invalid timestamp format: ${timestamp}. Expected formats: HH:MM:SS.sss or hhmmSSss`
  );
};

export default TranscriptionEditor3;
