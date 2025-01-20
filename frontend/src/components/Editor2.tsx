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
import { AudioVisualizer } from "react-audio-visualize";
import AudioExtractionVisualizer from "./AudioExtractionVizualizer";

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
  handleEncodeVideo: () => void;
  toggleAudioDescription: () => void;
}

const TranscriptionEditor2: React.FC<VideoTimelineProps> = ({
  videoDescriptions,
  onDescriptionChange,
  uploadedVideo,
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoFile, setVideoFile] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
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

  // Update video file and create audio blob when uploadedVideo changes
  useEffect(() => {
    if (uploadedVideo) {
      const url = URL.createObjectURL(uploadedVideo);
      setVideoFile(url);
      // extractAudio(uploadedVideo); // Extract audio from the uploaded video
    }
  }, [uploadedVideo]);

  const extractAudio = async (videoFile: File) => {
    // Use type assertion to access webkitAudioContext
    const audioContext = new (window.AudioContext ||
      (window as any).AudioContext)();
    const arrayBuffer = await videoFile.arrayBuffer();

    audioContext.decodeAudioData(
      arrayBuffer,
      (audioData) => {
        // Create a new audio buffer source
        const source = audioContext.createBufferSource();
        source.buffer = audioData;

        // Create a MediaStreamDestination to get the audio stream
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.start(0);

        // Create a new audio blob from the MediaStream
        const mediaStream = destination.stream;
        const recorder = new MediaRecorder(mediaStream);
        const audioChunks: Blob[] = [];

        recorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
          setAudioBlob(audioBlob); // Set the audio blob
          console.log("Audio blob created:", audioBlob);
        };

        recorder.start();
        source.onended = () => {
          recorder.stop();
        };
      },
      (error) => {
        console.error("Error decoding audio data:", error);
      }
    );
  };

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
          extractAudio(file); // Extract audio from the uploaded video
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

  const handleEncodeVideo = async () => {
    if (!uploadedVideo || videoDescriptions.length === 0) {
      alert("Please process a video and ensure descriptions are available.");
      return;
    }

    const descriptions = videoDescriptions.map((item) => item.description);
    const timestamps = videoDescriptions.map((item) => [
      item.startTime,
      item.endTime,
    ]);

    const jsonPayload = {
      descriptions,
      timestamps,
      videoFileName: uploadedVideo.name,
    };

    try {
      const encodeResponse = await fetch(
        "http://localhost:5000/encode-video-with-subtitles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(jsonPayload),
        }
      );

      if (encodeResponse.ok) {
        const result = await encodeResponse.json();
        const downloadUrl = `http://localhost:5000${result.output_video_url}`;

        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = result.output_video_url.split("/").pop();
        link.click();
      } else {
        alert("Error encoding video with subtitles");
      }
    } catch (error) {
      alert("Error connecting to backend");
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

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(10, 1fr)`,
    gridTemplateRows: `repeat(10, 1fr)`,
    gap: "0.5rem",
    height: "100vh",
  };

  // return(
  //   <div>
  //     <AudioExtractionVisualizer />
  //   </div>
  // )

  return (
    <div className="max-w-full overflow-hidden bg-gray-50 h-screen">
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
      <div className="grid grid-cols-10 grid-rows-10 h-full">
        {/* Left Sidebar - Transcription */}
        <div className="col-span-5 row-span-7 p-4 bg-white shadow-md overflow-y-auto">
          <div className="mb-4">
            <span className="font-bold text-xl">Transcription</span>
          </div>
          <div>
            {videoDescriptions.map((scene, index) => (
              <div
                key={scene.startTime}
                className={`p-2 mb-2 rounded-lg border ${
                  selectedScene === scene.startTime
                    ? "bg-blue-500 text-black" // Selected state
                    : "hover:bg-gray-200" // Default hover state
                }`}
                onClick={() => setSelectedScene(scene.startTime)} // Set selected scene on click
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

        {/* Video Preview Area */}
        <div className="col-span-5 row-span-7 flex flex-col p-4 bg-white shadow-md">
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

          {/* Play/Pause Button Row */}
          <div className="flex items-center mb-2 col-span-6">
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
            <div className="flex items-center">
              <Clock className="mr-1" />
              <span>
                {currentTime.toFixed(3)}s / {videoDuration.toFixed(3)}s
              </span>
            </div>
            <button className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300" onClick={handleEncodeVideo}>Encode Video</button>
          </div>
        </div>

        {/* Timeline Visualizer with AudioVisualizer */}
        <div className="col-span-10 row-span-2 p-4 bg-white shadow-md">
          <TimelineVisualizer
            videoDescriptions={videoDescriptions}
            currentTime={currentTime}
            onDescriptionChange={onDescriptionChange}
            visualizer={<div></div>}
          />
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

export default TranscriptionEditor2;
