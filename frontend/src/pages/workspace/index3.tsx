import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Video,
  Play,
  Pause,
  Save,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  Upload,
} from "lucide-react";
import TranscriptionEditor3 from "src/components/Editor3";
import { Button } from "src/components/ui/button";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useSearchParams } from "react-router-dom";
import { Input } from "src/components/ui/input";
import { Label } from "src/components/ui/label";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogTrigger,
} from "src/components/ui/dialog";
import {
  Tooltip,
  TooltipProvider,
  TooltipContent,
  TooltipTrigger,
} from "src/components/ui/tooltip";

interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
  isEdited: boolean; // New flag
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

const timestampToMilliseconds = (timestamp: string): number => {
  const [hours, minutes, secondsWithMs] = timestamp.split(":");
  const [seconds, milliseconds] = secondsWithMs.split(".");

  const totalMilliseconds =
    parseInt(hours) * 3600000 +
    parseInt(minutes) * 60000 +
    parseInt(seconds) * 1000 +
    parseInt(milliseconds) * 10;
  console.log("totalMilliseconds:", totalMilliseconds);
  return totalMilliseconds;
};

// Universal timestamp normalization
const normalizeTimestamp = (timestamp: number | string): string => {
  // If already a string timestamp, return as-is
  if (
    typeof timestamp === "string" &&
    /^\d{2}:\d{2}:\d{2}\.\d+$/.test(timestamp)
  ) {
    return timestamp;
  }

  // Convert milliseconds to HH:MM:SS.mmm format
  const totalSeconds = Math.floor(Number(timestamp) / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  const milliseconds = (Number(timestamp) % 1000).toString().padStart(3, "0");

  return `${hours}:${minutes}:${seconds}.${milliseconds}`;
};

interface ProjectData {
  name: string;
  data: VideoDescriptionItem[];
  date: string;
  videoName: string;
  screenshot?: string;
}

interface Workspace3Props {
  projectName: string;
}

const Workspace3: React.FC = () => {
  const [videoDescriptions, setVideoDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [videoName, setVideoName] = useState<string>(""); // New variable for video name
  const [combinedDescriptions, setCombinedDescriptions] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [previousDescriptions, setPreviousDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedScenes, setSelectedScenes] = useState<Set<number>>(new Set());
  const action = "new_gemini";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasFetchedVideo, setHasFetchedVideo] = useState(false);
  const [isSlideInModalOpen, setIsSlideInModalOpen] = useState(true);
  const [searchParams] = useSearchParams();
  const projectName = searchParams.get("name") || "defaultProject";
  const [isSrtModalOpen, setIsSrtModalOpen] = useState(false);
  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<ProjectData[]>("video_descriptions", []);

  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false); // New flag

  const [videoFile, setVideoFile] = useState<File | null>(null);

  const backendBaseUrl = "http://localhost:5000"; // Replace if different

  useEffect(() => {
    // Load data from local storage if available
    if (!hasLoadedInitialData) {
      const storedProject = videoDescriptionsStorage?.find(
        (item) => item.name === projectName
      );

      console.log("storedProject:", storedProject);
      console.log("loading from storage");

      if (storedProject) {
        // Check if the stored data is different from the current state
        if (
          JSON.stringify(storedProject.data) !==
          JSON.stringify(videoDescriptions)
        ) {
          setVideoDescriptions(storedProject.data);
        }
        setVideoName(storedProject.videoName);
        if (!uploadedVideo && !hasFetchedVideo) {
          fetchVideoFile(storedProject.videoName);
          setHasFetchedVideo(true);
        }
      }
      setHasLoadedInitialData(true); // Set the flag to true after loading
    }
  }, [projectName, videoDescriptionsStorage, hasLoadedInitialData]); // Removed uploadedVideo and hasFetchedVideo

  const fetchVideoFile = async (videoName: string) => {
    try {
      // Check if video file already exists
      if (uploadedVideo) {
        console.log("Video file already exists, skipping fetch.");
        return;
      }
      console.log("Video name:", videoName);
      const response = await fetch(
        `http://localhost:5000/get-video?videoName=${videoName}&cacheBust=${Date.now()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );
      if (response.ok) {
        const videoBlob = await response.blob();
        const videoFile = new File([videoBlob], videoName, {
          type: "video/mp4",
        });
        setUploadedVideo(videoFile);
        setVideoName(videoName);
        setVideoFile(videoFile);
        console.log("Video file:", videoFile);
      } else {
        console.error("Failed to fetch video file:", response.status);
        alert("Failed to fetch video file.");
      }
    } catch (error) {
      console.error("Error fetching video file:", error);
      alert("Error fetching video file.");
    }
  };

  const timestampToMilliseconds = (timestamp: string): number => {
    const [time, milliseconds] = timestamp.trim().split(',');
    const [hours, minutes, seconds] = time.split(':');
    
    return (
      parseInt(hours) * 3600000 +
      parseInt(minutes) * 60000 +
      parseInt(seconds) * 1000 +
      parseInt(milliseconds)
    );
  };
  
  const parseSrtFile = (srtText: string): VideoDescriptionItem[] => {
    // Split by double newline to separate entries
    const entries = srtText.trim().split('\n\n');
    
    return entries.map(entry => {
      const lines = entry.split('\n');
      // Skip the index number (first line)
      const timeLine = lines[1];
      // Join remaining lines as description
      const description = lines.slice(2).join(' ').trim();
      
      // Extract timestamps
      const [startTime, endTime] = timeLine.split(' --> ');
      
      return {
        startTime: timestampToMilliseconds(startTime),
        endTime: timestampToMilliseconds(endTime),
        description,
        isEdited: true
      };
    }).filter(item => item.startTime >= 0 && item.endTime > 0 && item.description);
  };
  
  const handleSrtFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
          const srtText = e.target?.result as string;
          const newVideoDescriptionItems = parseSrtFile(srtText);

          // Update the videoDescriptions state
          setVideoDescriptions(newVideoDescriptionItems);
          setIsSrtModalOpen(false); // Close the modal after upload
        };

        reader.onerror = () => {
          alert("Error reading SRT file.");
        };

        reader.readAsText(file);
      }
    },
    [parseSrtFile, setVideoDescriptions, setIsSrtModalOpen]
  );

  const toggleSrtModal = () => {
    setIsSrtModalOpen(!isSrtModalOpen);
  };

  // Add these inside your Workspace3 component
  const handleSelectScene = (sceneStartTime: number) => {
    const newSelection = new Set(selectedScenes);
    newSelection.has(sceneStartTime)
      ? newSelection.delete(sceneStartTime)
      : newSelection.add(sceneStartTime);
    setSelectedScenes(newSelection);
  };

  const handleSelectAllScenes = (select: boolean) => {
    if (select) {
      const allStartTimes = new Set(
        videoDescriptions.map((scene) => scene.startTime)
      );
      setSelectedScenes(allStartTimes);
    } else {
      setSelectedScenes(new Set());
    }
  };

  const reloadPreviousDescriptions = () => {
    if (previousDescriptions.length > 0) {
      setVideoDescriptions([...previousDescriptions]);
      alert("Previous descriptions reloaded successfully!");
    } else {
      alert("No previous descriptions available to reload.");
    }
  };

  // Update combined descriptions when video descriptions change
  useEffect(() => {
    const newCombinedText = videoDescriptions
      .map((item) => item.description)
      .join(" ");
    if (newCombinedText !== combinedDescriptions) {
      setCombinedDescriptions(newCombinedText);
    }
  }, [videoDescriptions]);

  const handleProcessVideo = async (videoFile: File, action: string) => {
    const formData = new FormData();
    formData.append("action", action);
    formData.append("video", videoFile);

    try {
      setIsProcessing(true);
      const response = await fetch("http://localhost:5000/process-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to start processing");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let videoDescriptionItems: VideoDescriptionItem[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Process each chunk of data
        const chunks = decoder.decode(value).split("\n");
        for (const chunk of chunks) {
          if (!chunk) continue;

          try {
            const data = JSON.parse(chunk);

            // Handle progress updates
            if (data.progress !== undefined) {
              setProcessingProgress(data.progress);
              setProcessingMessage(data.message || "");

              if (data.progress === 100 && data.data) {
                // Final processing complete
                videoDescriptionItems = data.data.timestamps.map(
                  ([startTime, endTime]: [number, number], index: number) => ({
                    startTime: startTime,
                    endTime: endTime,
                    description:
                      data.data.descriptions[index] || "No description",
                    audioFile: data.data.audio_files[index] || undefined,
                    isEdited: true,
                  })
                );
              }
            }

            // Handle errors
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error("Error parsing JSON chunk:", e);
          }
        }
      }

      // Update state with final results
      setPreviousDescriptions(videoDescriptionItems);
      setVideoDescriptions(videoDescriptionItems);
      console.log("Video Description Items:", videoDescriptionItems);
    } catch (error) {
      console.error("Processing error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingMessage("");
    }
  };

  const handleReanalyzeVideo = async (
    selectedSceneStartTimes: number[]
  ): Promise<void> => {
    if (!selectedSceneStartTimes.length) {
      alert("No scenes selected for reanalysis");
      return;
    }

    console.log("Selected scenes for reanalysis:", selectedSceneStartTimes);

    // Prepare timestamps with normalization
    const formatTimestamp = (item: VideoDescriptionItem) =>
      `${item.startTime}-${item.endTime}`;

    // Filter the video descriptions based on selected scenes
    const filteredDescriptions = videoDescriptions.filter((scene) =>
      selectedSceneStartTimes.includes(scene.startTime)
    );

    const newTimestamps = filteredDescriptions
      .filter((item) => !item.description.toUpperCase().includes("TALKING"))
      .map(formatTimestamp)
      .join(",");

    const oldData = previousDescriptions
      .filter((item) => !item.description.toUpperCase().includes("TALKING"))
      .map((item) => ({
        start: item.startTime,
        end: item.endTime,
        description: item.description,
      }));

    try {
      const formData = new FormData();
      formData.append("video_name", uploadedVideo?.name || ""); // Ensure you have the video name
      formData.append("old_data", JSON.stringify(oldData));
      formData.append("new_timestamps", newTimestamps);

      const response = await fetch("http://localhost:5000/analyze-timestamps", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();

        const talkingMap = new Map(
          videoDescriptions
            .filter((item) =>
              item.description.toUpperCase().includes("TALKING")
            )
            .map((item) => [`${item.startTime}-${item.endTime}`, item])
        );

        const mergedDescriptions = [
          ...result.descriptions.map((desc: any) => ({
            startTime: desc.start,
            endTime: desc.end,
            description: desc.description,
            audioFile: desc.audioFile,
            isEdited: true, // New items from analysis
          })),
          ...Array.from(talkingMap.values()),
        ].sort((a, b) => a.startTime - b.startTime);

        setVideoDescriptions(mergedDescriptions);
        setPreviousDescriptions(mergedDescriptions);
        alert("Video reanalyzed successfully!");
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Reanalysis error:", error);
      alert("Failed to connect to server");
    }
  };

  const handleRegenerateAudio = async (): Promise<void> => {
    if (selectedScenes.size === 0) {
      alert("Please select scenes to regenerate audio");
      return;
    }

    const selectedSceneData = videoDescriptions
      .filter((scene) => selectedScenes.has(scene.startTime))
      .map((scene) => ({
        start: scene.startTime,
        end: scene.endTime,
        description: scene.description,
      }));

    const payload = {
      video_name: uploadedVideo?.name || "",
      scenes: selectedSceneData,
    };

    try {
      setIsProcessing(true); // Start processing state
      setProcessingProgress(0);
      setProcessingMessage("");

      const response = await fetch("http://localhost:5000/regenerate-audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to regenerate audio");

      const reader = response.body?.getReader(); // Use optional chaining
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let updatedDescriptions = [...videoDescriptions];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunks = decoder.decode(value).split("\n");
        for (const chunk of chunks) {
          if (!chunk) continue;

          try {
            const data = JSON.parse(chunk);

            // Update processing state
            if (data.progress !== undefined) {
              setProcessingProgress(data.progress);
              setProcessingMessage(data.message || "");
            }

            // Update audio files in descriptions
            if (data.audio_files) {
              data.audio_files.forEach(
                (audio: { start: number; end: number; audio_file: string }) => {
                  updatedDescriptions = updatedDescriptions.map((scene) => {
                    if (
                      scene.startTime === audio.start &&
                      scene.endTime === audio.end
                    ) {
                      return {
                        ...scene,
                        audioFile: audio.audio_file,
                        isEdited: true,
                      };
                    }
                    return scene;
                  });
                }
              );
            }
          } catch (e) {
            console.error("Error parsing JSON chunk:", e);
          }
        }
      }

      // Final update to state
      setVideoDescriptions(updatedDescriptions);
      alert("Audio regeneration complete!");
    } catch (error) {
      console.error("Audio regeneration error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsProcessing(false); // End processing state
      setProcessingProgress(0);
      setProcessingMessage("");
    }
  };

  const toggleAudioDescription = async () => {
    if (!speechActive) {
      try {
        const response = await fetch("http://localhost:5000/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: combinedDescriptions }),
        });

        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);

          const newAudio = new Audio(audioUrl);
          setAudio(newAudio);

          newAudio.play();
          setSpeechActive(true);

          newAudio.onended = () => {
            setSpeechActive(false);
            setAudio(null);
          };
        } else {
          alert("Error generating audio description");
        }
      } catch (error) {
        alert("Error connecting to backend");
      }
    } else {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setSpeechActive(false);
    }
  };

  const generateThumbnail = (videoFile: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      video.onloadedmetadata = () => {
        const randomTime = Math.random() * video.duration;
        video.currentTime = randomTime;
      };

      video.onseeked = () => {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL("image/jpeg");
        resolve(dataURL);
      };

      video.onerror = (error) => {
        reject(error);
      };

      video.src = URL.createObjectURL(videoFile);
    });
  };

  const handleSave = async () => {
    if (videoDescriptions.length === 0) {
      alert("Please process a video and ensure descriptions are available.");
      return;
    }

    const currentDate = new Date().toLocaleDateString();

    console.log("Project name", projectName);
    let screenshot = "";
    if (uploadedVideo) {
      try {
        screenshot = await generateThumbnail(uploadedVideo);
      } catch (error) {
        console.error("Error generating thumbnail:", error);
        alert("Failed to generate thumbnail.");
      }
    }

    // Save the video descriptions to local storage
    setVideoDescriptionsStorage([
      ...(videoDescriptionsStorage || []).filter(
        (item) => item.name !== projectName
      ),
      {
        name: projectName,
        data: videoDescriptions,
        date: currentDate,
        videoName: videoName || "",
        screenshot: screenshot,
      },
    ]);

    alert("Your work has been successfully saved!");
  };

  // const handleEncodeVideo = async (videofile: File) => {
  //   if (!videofile) {
  //     alert("Please upload a video before encoding.");
  //     return;
  //   }

  //   const descriptions = videoDescriptions.map((item) => item.description);
  //   // .filter((desc) => desc !== "TALKING");
  //   const timestamps = videoDescriptions.map((item) => [
  //     item.startTime,
  //     item.endTime,
  //   ]);
  //   const audioFiles = videoDescriptions
  //     .map((item) => item.audioFile)
  //     .filter((audioFile) => audioFile); // Extract audio file names
  //   const videoFileName = videofile.name;

  //   console.log("Descriptions:", descriptions);
  //   console.log("Timestamps:", timestamps);
  //   console.log("Audio Files:", audioFiles);
  //   console.log("VideoDesc:", videoDescriptions);

  //   if (descriptions.length === 0) {
  //     alert(
  //       "No valid descriptions to encode. Ensure at least one description is not 'TALKING'."
  //     );
  //     return;
  //   }

  //   try {
  //     const response = await fetch(
  //       "http://localhost:5000/encode-video-with-subtitles",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           descriptions,
  //           timestamps,
  //           audioFiles, // Send audio file names
  //           videoFileName,
  //         }),
  //       }
  //     );

  //     if (response.ok) {
  //       const videoBlob = await response.blob();
  //       const videoUrl = URL.createObjectURL(videoBlob);

  //       const link = document.createElement("a");
  //       link.href = videoUrl;
  //       link.download = `processed_${videoFileName}`;
  //       document.body.appendChild(link);
  //       link.click();
  //       document.body.removeChild(link);

  //       alert("Video successfully encoded and downloaded.");
  //     } else {
  //       const error = await response.json();
  //       alert(`Error encoding video: ${error.error}`);
  //     }
  //   } catch (error) {
  //     console.error("Error encoding video:", error);
  //     alert("Error connecting to the backend.");
  //   }
  // };

  // const handleEncodeVideo = async (videofile: File) => {
  //   if (!videofile) {
  //     alert("Please upload a video before encoding.");
  //     return;
  //   }

  //   const descriptions = videoDescriptions.map((item) => item.description);
  //   const timestamps = videoDescriptions.map((item) => [
  //     item.startTime,
  //     item.endTime,
  //   ]);
  //   const audioFiles = videoDescriptions
  //     .map((item) => item.audioFile)
  //     .filter((audioFile) => audioFile);
  //   const videoFileName = videofile.name;

  //   console.log("Descriptions:", descriptions);
  //   console.log("Timestamps:", timestamps);
  //   console.log("Audio Files:", audioFiles);
  //   console.log("VideoDesc:", videoDescriptions);

  //   if (descriptions.length === 0) {
  //     alert(
  //       "No valid descriptions to encode. Ensure at least one description is not 'TALKING'."
  //     );
  //     return;
  //   }

  //   try {
  //     const response = await fetch(
  //       "http://localhost:5000/encode-video-with-subtitles",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           descriptions,
  //           timestamps,
  //           audioFiles,
  //           videoFileName,
  //         }),
  //       }
  //     );

  //     if (response.ok) {
  //       const data = await response.json();

  //       // Download Video
  //       const videoBlob = new Blob([data.video], { type: "video/mp4" });
  //       const videoUrl = URL.createObjectURL(videoBlob);
  //       const videoLink = document.createElement("a");
  //       videoLink.href = videoUrl;
  //       videoLink.download = `processed_${videoFileName}`;
  //       document.body.appendChild(videoLink);
  //       videoLink.click();
  //       document.body.removeChild(videoLink);

  //       alert("Video successfully encoded and downloaded.");
  //     } else {
  //       const error = await response.json();
  //       alert(`Error encoding video: ${error.error}`);
  //     }
  //   } catch (error) {
  //     console.error("Error encoding video:", error);
  //     alert("Error connecting to the backend.");
  //   }
  // };

  // const handleEncodeVideo = async (videofile: File) => {
  //   if (!videofile) {
  //     alert("Please upload a video before encoding.");
  //     return;
  //   }

  //   const descriptions = videoDescriptions.map((item) => item.description);
  //   const timestamps = videoDescriptions.map((item) => [
  //     item.startTime,
  //     item.endTime,
  //   ]);
  //   const audioFiles = videoDescriptions
  //     .map((item) => item.audioFile)
  //     .filter((audioFile) => audioFile);
  //   const videoFileName = videofile.name;

  //   console.log("Descriptions:", descriptions);
  //   console.log("Timestamps:", timestamps);
  //   console.log("Audio Files:", audioFiles);
  //   console.log("VideoDesc:", videoDescriptions);

  //   if (descriptions.length === 0) {
  //     alert(
  //       "No valid descriptions to encode. Ensure at least one description is not 'TALKING'."
  //     );
  //     return;
  //   }
  //   try {
  //     const response = await fetch(
  //       "http://localhost:5000/encode-video-with-subtitles", // Ensure this is correct
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify({
  //           descriptions,
  //           timestamps,
  //           audioFiles,
  //           videoFileName,
  //         }),
  //       }
  //     );

  //     if (response.ok) {
  //       const data = await response.json();

  //       const downloadVideo = (url) => {
  //         const fullUrl = backendBaseUrl + url;
  //         console.log("Downloading video from:", fullUrl); // Add this line
  //         const link = document.createElement("a");
  //         link.href = fullUrl;
  //         link.setAttribute("download", "processed_video.mp4");
  //         document.body.appendChild(link);
  //         link.click();
  //         document.body.removeChild(link);
  //       };

  //       const downloadSrt = (url) => {
  //         const fullUrl = backendBaseUrl + url; // Construct the full URL
  //         const link = document.createElement("a");
  //         link.href = fullUrl;
  //         link.setAttribute("download", "subtitles.srt");
  //         document.body.appendChild(link);
  //         link.click();
  //         document.body.removeChild(link);
  //       };

  //       downloadVideo(data.video_url);
  //       downloadSrt(data.srt_url);

  //       alert("Video and subtitles processing complete. Downloads started.");
  //     } else {
  //       const error = await response.json();
  //       alert(`Error encoding video: ${error.error}`);
  //     }
  //   } catch (error) {
  //     console.error("Error encoding video:", error);
  //     alert("Error connecting to the backend.");
  //   }
  // };

  const handleEncodeVideo = async (videofile: File) => {
    if (!videofile) {
      alert("Please upload a video before encoding.");
      return;
    }

    const descriptions = videoDescriptions.map((item) => item.description);
    const timestamps = videoDescriptions.map((item) => [
      item.startTime,
      item.endTime,
    ]);
    const audioFiles = videoDescriptions
      .map((item) => item.audioFile)
      .filter((audioFile) => audioFile);
    const videoFileName = videofile.name;

    console.log("Descriptions:", descriptions);
    console.log("Timestamps:", timestamps);
    console.log("Audio Files:", audioFiles);
    console.log("VideoDesc:", videoDescriptions);

    if (descriptions.length === 0) {
      alert(
        "No valid descriptions to encode. Ensure at least one description is not 'TALKING'."
      );
      return;
    }

    try {
      const response = await fetch(
        "http://localhost:5000/encode-video-with-subtitles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            descriptions,
            timestamps,
            audioFiles,
            videoFileName,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const extractFilename = (url: string): string => {
          const parts = url.split("/");
          return parts[parts.length - 1];
        };

        const downloadFile = (url: string, filename: string) => {
          const fullUrl = backendBaseUrl + url;
          console.log("Downloading from:", fullUrl);
          fetch(fullUrl)
            .then((response) => response.blob())
            .then((blob) => {
              const link = document.createElement("a");
              link.href = URL.createObjectURL(blob);
              link.setAttribute("download", filename);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(link.href); // Clean up the URL object
            })
            .catch((error) => {
              console.error("Download error:", error);
              alert(`Error downloading ${filename}`);
            });
        };

        const videoFilename = extractFilename(data.video_url);
        const srtFilename = extractFilename(data.srt_url);
        const talkingSrtFilename = extractFilename(data.talking_srt_url);

        console.log("Video:", videoFilename);
        console.log("SRT:", srtFilename);
        
        
        downloadFile(data.video_url, videoFilename);
        downloadFile(data.srt_url, srtFilename);
        downloadFile(data.talking_srt_url, talkingSrtFilename);
        
        alert("Video and subtitles processing complete. Downloads started.");
      } else {
        const error = await response.json();
        alert(`Error encoding video: ${error.error}`);
      }
    } catch (error) {
      console.error("Error encoding video:", error);
      alert("Error connecting to the backend.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
      setVideoName(file.name); // Set the video name
      console.log("Uploaded Video:", file.name); // Log the file name
    }
  };

  const handleGenerateDescriptions = async (): Promise<void> => {
    if (selectedScenes.size === 0) {
      alert("Please select scenes to generate descriptions");
      return;
    }
    if (!uploadedVideo || !uploadedVideo.name) {
      alert(
        "No video uploaded. Please upload a video before generating descriptions."
      );
      return;
    }
    try {
      // Set processing state to true at the start
      setIsProcessing(true);

      const selectedSceneData = videoDescriptions
        .filter((scene) => selectedScenes.has(scene.startTime))
        .map((scene) => ({
          start: scene.startTime,
          end: scene.endTime,
          current_description: scene.description,
        }));

      const payload = {
        video_name: uploadedVideo.name,
        scenes: selectedSceneData,
      };

      const response = await fetch(
        "http://localhost:5000/regenerate-descriptions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error("Failed to generate descriptions");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let updatedDescriptions = [...videoDescriptions];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunks = decoder.decode(value).split("\n");
        for (const chunk of chunks) {
          if (!chunk) continue;

          try {
            const data = JSON.parse(chunk);

            // Handle progress updates
            if (data.progress !== undefined) {
              setProcessingProgress(data.progress);
              setProcessingMessage(data.message || "");
            }

            // Handle final response with updated descriptions
            if (data.progress === 100 && data.data) {
              console.log(data.data);
              updatedDescriptions = updatedDescriptions.map((scene, index) => ({
                ...scene,
                description: data.data.descriptions[index] || scene.description,
                audioFile: data.data.audio_files[index] || scene.audioFile,
                isEdited: true,
              }));
            }

            // Handle errors
            if (data.error) {
              throw new Error(data.error);
            }
          } catch (e) {
            console.error("Error parsing JSON chunk:", e);
          }
        }
      }

      // Update state with final descriptions
      setVideoDescriptions(updatedDescriptions);
      setPreviousDescriptions(updatedDescriptions);
      alert("Descriptions updated successfully!");
    } catch (error) {
      console.error("Description generation error:", error);
      alert(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      // Always set processing state to false
      setIsProcessing(false);
      setProcessingProgress(0);
      setProcessingMessage("");
    }
  };

  const toggleSlideInModal = () => {
    setIsSlideInModalOpen(!isSlideInModalOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/100 via-purple-700/100 to-indigo-600/100 flex flex-col">
      <main className="flex-grow h-screen overflow-hidden">
        <TranscriptionEditor3
          videoDescriptions={videoDescriptions}
          onDescriptionChange={setVideoDescriptions}
          uploadedVideo={uploadedVideo}
          onProcessVideo={handleProcessVideo}
          setUploadedVideo={setUploadedVideo}
          setVideoName={setVideoName}
          handleEncodeVideo={handleEncodeVideo}
          toggleAudioDescription={toggleAudioDescription}
          handleAnalyzeVideo={handleProcessVideo}
          handleReanalyzeVideo={handleReanalyzeVideo}
          handleRegenerateAudio={handleRegenerateAudio}
          isProcessing={isProcessing}
          processingProgress={processingProgress}
          processingMessage={processingMessage}
          selectedScenes={selectedScenes}
          onSelectScene={handleSelectScene}
          onSelectAll={handleSelectAllScenes}
          onGenerateDescriptions={handleGenerateDescriptions}
          onRegenerateAudio={handleRegenerateAudio}
          videoFile={videoFile}
        />

        {/* SRT Upload Modal */}
        <Dialog open={isSrtModalOpen} onOpenChange={setIsSrtModalOpen}>
          <DialogContent className="bg-gray-900 p-8 rounded-xl shadow-2xl max-w-md w-full border border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-100">
                Upload SRT File
              </DialogTitle>
              <DialogDescription className="text-gray-400 mt-2">
                Upload an SRT file to add subtitles to your video descriptions.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label
                  htmlFor="srt-upload"
                  className="text-right text-gray-300"
                >
                  SRT File:
                </Label>
                <Input
                  type="file"
                  accept=".srt"
                  onChange={handleSrtFileUpload}
                  id="srt-upload"
                  className="col-span-3 text-gray-300"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      variant="outline"
                      className={`${buttonStyles.base} ${buttonStyles.variants.outline} ${buttonStyles.sizes.md}`}
                      onClick={() => setIsSrtModalOpen(false)}
                    >
                      Cancel
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="text-white">
                    <p>Cancel the operation</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Floating Action Buttons */}
        <div
          className={`fixed bottom-4 right-4 flex flex-col items-center transition-transform duration-300 ${
            isSlideInModalOpen
              ? "translate-y-0"
              : "translate-y-[calc(100%-2rem)]"
          }`}
        >
          {/* Chevron Button - Centered Above */}
          <button
            className="bg-gray-800 hover:bg-gray-700 text-gray-100 p-2 rounded-full shadow-lg backdrop-blur-md transition-all duration-300"
            onClick={toggleSlideInModal}
          >
            {isSlideInModalOpen ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>

          {/* Slide-in Modal */}
          <div className="bg-white bg-opacity-90 shadow-xl backdrop-blur-lg p-4 rounded-2xl flex flex-col items-center gap-3 mt-2">
            <Button
              variant="secondary"
              className="p-3 rounded-full shadow-md hover:bg-gray-200 transition"
              onClick={reloadPreviousDescriptions}
            >
              <RefreshCw className="w-6 h-6" />
            </Button>
            <Button
              variant="default"
              className="p-3 rounded-full shadow-md hover:bg-blue-600 transition"
              onClick={handleSave}
            >
              <Save className="w-6 h-6" />
            </Button>
            <Button
              variant="default"
              className="p-3 rounded-full shadow-md hover:bg-blue-600 transition"
              onClick={toggleSrtModal}
            >
              <Upload className="w-6 h-6" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Workspace3;
