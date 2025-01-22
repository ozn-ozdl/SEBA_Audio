import React, { useState, useRef, useEffect, ChangeEvent } from "react";
import { Play, Pause, Settings, Clock, Upload } from "lucide-react";
import TimelineVisualizer from "./Timeline2";
import TimelineVisualizer2 from "./Timeline2";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  audioFile?: string;
}

interface VideoTimelineProps {
  videoDescriptions: VideoDescriptionItem[];
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  uploadedVideo: File | null;
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
  setUploadedVideo: (file: File | null) => void;
  handleEncodeVideo: () => void;
  toggleAudioDescription: () => void;
  handleAnalyzeVideo: (videoFile: File, action: string) => Promise<void>;
  handleReanalyzeVideo: () => void;
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
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [currentSubtitle, setCurrentSubtitle] = useState<string>("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  useEffect(() => {
    if (videoDescriptions.length === 0) return;

    // console.log(videoDescriptions);
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

  // const handleVideoUpload = async (
  //   event: React.MouseEvent<HTMLButtonElement>
  // ) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     setIsProcessing(true);
  //     const action = await showProcessingOptions();
  //     if (!action) {
  //       setIsProcessing(false);
  //       return;
  //     }

  //     try {
  //       await handleAnalyzeVideo(file, "new_gemini");
  //       const url = URL.createObjectURL(file);
  //       setVideoFile(url);
  //     } catch (error) {
  //       alert("Error processing video");
  //     } finally {
  //       setIsProcessing(false);
  //     }
  //   }
  // };

  // const handleVideoUpload = async (event: MouseEvent<HTMLButtonElement, MouseEvent>) => {

  // }

  //   const showProcessingOptions = async (): Promise<string | null> => {
  //     return new Promise((resolve) => {
  //       const select = document.createElement("select");
  //       select.innerHTML = `
  //         <option value="">Choose an Action</option>
  //         <option value="openAI_image">OpenAI with images</option>
  //         <option value="gemini_whole_video">Gemini only video</option>
  //         <option value="gemini_optimized">Gemini optimized</option>
  //         <option value="mock">Mock</option>
  //         <option value="new_gemini">New Gemini</option>
  //       `;

  //       const dialog = document.createElement("dialog");
  //       dialog.innerHTML = `
  //         <div class="p-4">
  //           <h2 class="text-lg font-semibold">Select Processing Option</h2>
  //           ${select.outerHTML}
  //           <div class="mt-4">
  //             <button id="confirm" class="bg-blue-500 text-white px-4 py-2 rounded">Confirm</button>
  //             <button id="cancel" class="bg-gray-300 text-black px-4 py-2 rounded">Cancel</button>
  //           </div>
  //         </div>
  //       `;

  //       document.body.appendChild(dialog);
  //       dialog.showModal();

  //       dialog.querySelector("#confirm")?.addEventListener("click", () => {
  //         const selectedValue = (
  //           dialog.querySelector("select") as HTMLSelectElement
  //         ).value;
  //         dialog.close();
  //         document.body.removeChild(dialog);
  //         resolve(selectedValue || null);
  //       });

  //       dialog.querySelector("#cancel")?.addEventListener("click", () => {
  //         dialog.close();
  //         document.body.removeChild(dialog);
  //         resolve(null);
  //       });
  //     });
  //   };

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

  // const handleVideoUpload = async (
  //   event: React.MouseEvent<HTMLButtonElement>
  // ) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     setIsProcessing(true);
  //     const action = await showProcessingOptions();
  //     if (!action) {
  //       setIsProcessing(false);
  //       return;
  //     }

  //     try {
  //       await handleAnalyzeVideo(file, "new_gemini");
  //       const url = URL.createObjectURL(file);
  //       setVideoFile(url);
  //     } catch (error) {
  //       alert("Error processing video");
  //     } finally {
  //       setIsProcessing(false);
  //     }
  //   }
  // };

  // const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (file) {
  //     setIsProcessing(true);
  //     const action = await showProcessingOptions();
  //     if (!action) {
  //       setIsProcessing(false);
  //       return;
  //     }

  //     try {
  //       await handleAnalyzeVideo(file, "new_gemini");
  //       const url = URL.createObjectURL(file);
  //       setVideoFile(url);
  //     } catch (error) {
  //       alert("Error processing video");
  //     } finally {
  //       setIsProcessing(false);
  //     }
  //   }
  // };

  const handleVideoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoUrl(URL.createObjectURL(file));
      setVideoFile(file);
    }
  };

  // function analyzeVideo(
  //   event: MouseEvent<HTMLButtonElement, MouseEvent>
  // ): void {
  //   throw new Error("Function not implemented.");
  // }

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
        </div>
      </div>

      <div className="grid grid-cols-10 grid-rows-10 h-full">
        <div className="col-span-5 row-span-7 p-4 bg-white shadow-md overflow-y-auto">
          <div className="mb-4">
            <span className="font-bold text-xl">Transcription</span>
          </div>
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
                    {`Scene ${index + 1}: ${scene.startTime} - ${
                      scene.endTime
                    }`}
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
            <button
              className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={handleEncodeVideo}
            >
              Encode Video
            </button>
            <button
              className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={analyzeVideo}
            >
              Analyze Video
            </button>
            <button
              className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={handleReanalyzeVideo}
            >
              Reanalyze Video
            </button>
            <button
              className="mr-2 p-2 bg-gray-200 rounded hover:bg-gray-300"
              onClick={handleRegenerateAudio}
            >
              Regenerate Audio
            </button>
          </div>
        </div>

        <div className="col-span-10 row-span-2 p-4 bg-white shadow-md">
          <TimelineVisualizer2
            videoDescriptions={videoDescriptions}
            currentTime={currentTime}
            onDescriptionChange={onDescriptionChange}
            onTimeUpdate={handleTimelineUpdate}
            visualizer={<div></div>}
            isPlaying={isPlaying}  
          />
        </div>
      </div>
    </div>
  );
};

const convertTimestampToSeconds = (timestamp: string): number => {
  const parts = timestamp.split(":");
  const seconds = parseFloat(parts.pop() || "0");
  const minutes = parseInt(parts.pop() || "0", 10);
  const hours = parseInt(parts.pop() || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
};

export default TranscriptionEditor3;
