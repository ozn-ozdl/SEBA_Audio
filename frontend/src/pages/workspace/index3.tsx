import React, { useState, useEffect } from "react";
import { Video, Play, Pause, Save, RefreshCw } from "lucide-react";
import TranscriptionEditor3 from "src/components/Editor3";
import { Button } from "src/components/ui/button";

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

  // const handleRegenerateAudio = async (): Promise<void> => {
  //   const updatedDescriptions = [...videoDescriptions];
  //   const regenerationIndices: number[] = [];
  //   const regenerationPayload: any[] = [];

  //   updatedDescriptions.forEach((item, index) => {
  //     if (!item.description.toUpperCase().includes("TALKING")) {
  //       regenerationIndices.push(index);
  //       regenerationPayload.push({
  //         description: item.description,
  //         timestamps: [Number(item.startTime), Number(item.endTime)],
  //         scene_id: item.startTime,
  //       });
  //     }
  //   });

  //   if (regenerationPayload.length === 0) {
  //     console.log("No descriptions need regeneration.");
  //     return;
  //   }

  //   try {
  //     const response = await fetch("http://localhost:5000/text-to-speech", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(regenerationPayload),
  //     });

  //     if (!response.ok) {
  //       throw new Error("Failed to regenerate audio");
  //     }

  //     const data = await response.json();

  //     // Update the original array using stored indices
  //     data.audio_files.forEach(
  //       (audioFileData: { audio_file: string }, responseIndex: number) => {
  //         const originalIndex = regenerationIndices[responseIndex];
  //         if (
  //           originalIndex !== undefined &&
  //           updatedDescriptions[originalIndex]
  //         ) {
  //           updatedDescriptions[originalIndex] = {
  //             ...updatedDescriptions[originalIndex],
  //             audioFile: audioFileData.audio_file,
  //           };
  //           console.log(`Updated audio at index ${originalIndex}`);
  //         }
  //       }
  //     );

  //     // Update state with the modified copy
  //     setVideoDescriptions(updatedDescriptions);
  //   } catch (error) {
  //     console.error("Error regenerating audio:", error);
  //   }
  // };

  // const handleRegenerateAudio = async (): Promise<void> => {
  //   const updatedDescriptions = [...videoDescriptions];
  //   const regenerationIndices: number[] = [];
  //   const regenerationPayload: any[] = [];

  //   updatedDescriptions.forEach((item, index) => {
  //     // Only process selected scenes that aren't TALKING
  //     if (
  //       selectedScenes.has(item.startTime) &&
  //       !item.description.toUpperCase().includes("TALKING")
  //     ) {
  //       regenerationIndices.push(index);
  //       regenerationPayload.push({
  //         description: item.description,
  //         timestamps: [Number(item.startTime), Number(item.endTime)],
  //         scene_id: item.startTime,
  //       });
  //     }
  //   });

  //   if (regenerationPayload.length === 0) {
  //     console.log("No selected scenes need audio regeneration.");
  //     return;
  //   }

  //   try {
  //     const response = await fetch("http://localhost:5000/text-to-speech", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(regenerationPayload),
  //     });

  //     if (!response.ok) throw new Error("Failed to regenerate audio");

  //     const data = await response.json();
  //     data.audio_files.forEach(
  //       (audioFileData: { audio_file: string }, responseIndex: number) => {
  //         const originalIndex = regenerationIndices[responseIndex];
  //         if (
  //           originalIndex !== undefined &&
  //           updatedDescriptions[originalIndex]
  //         ) {
  //           updatedDescriptions[originalIndex] = {
  //             ...updatedDescriptions[originalIndex],
  //             audioFile: audioFileData.audio_file,
  //           };
  //         }
  //       }
  //     );

  //     setVideoDescriptions(updatedDescriptions);
  //   } catch (error) {
  //     console.error("Audio regeneration error:", error);
  //   }
  // };

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

  const handleSave = async () => {
    if (videoDescriptions.length === 0) {
      alert("Please process a video and ensure descriptions are available.");
      return;
    }

    alert("Your work has been successfully saved!");
  };

  const handleEncodeVideo = async (videofile: File) => {
    if (!videofile) {
      alert("Please upload a video before encoding.");
      return;
    }

    const descriptions = videoDescriptions.map((item) => item.description);
    // .filter((desc) => desc !== "TALKING");
    const timestamps = videoDescriptions.map((item) => [
      item.startTime,
      item.endTime,
    ]);
    const audioFiles = videoDescriptions
      .map((item) => item.audioFile)
      .filter((audioFile) => audioFile); // Extract audio file names
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
            audioFiles, // Send audio file names
            videoFileName,
          }),
        }
      );

      if (response.ok) {
        const videoBlob = await response.blob();
        const videoUrl = URL.createObjectURL(videoBlob);

        const link = document.createElement("a");
        link.href = videoUrl;
        link.download = `processed_${videoFileName}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        alert("Video successfully encoded and downloaded.");
      } else {
        const error = await response.json();
        alert(`Error encoding video: ${error.error}`);
      }
    } catch (error) {
      console.error("Error encoding video:", error);
      alert("Error connecting to the backend.");
    }
  };

  const BackgroundSVG = () => (
    <svg
      className="absolute inset-0 w-full h-full z-0"
      viewBox="0 0 1440 900"
      preserveAspectRatio="none"
    >
      {/* Base gradient */}
      <defs>
        <linearGradient id="mainGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            style={{ stopColor: "#4f46e5", stopOpacity: 0.2 }}
          />
          <stop
            offset="50%"
            style={{ stopColor: "#7c3aed", stopOpacity: 0.15 }}
          />
          <stop
            offset="100%"
            style={{ stopColor: "#4338ca", stopOpacity: 0.25 }}
          />
        </linearGradient>

        {/* Random blob shapes */}
        <filter id="noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves="4"
          />
          <feDisplacementMap in="SourceGraphic" scale="20" />
        </filter>
      </defs>

      {/* Background rectangle */}
      <rect width="100%" height="100%" fill="url(#mainGradient)" />

      {/* Color blobs */}
      <path
        d="M200 150 Q 300 50 400 150 T 600 150 T 800 50 T 1000 150 T 1200 50"
        fill="#6366f1"
        opacity="0.1"
        filter="url(#noise)"
      />

      <circle cx="80%" cy="30%" r="120" fill="#8b5cf6" opacity="0.08" />
      <ellipse
        cx="20%"
        cy="70%"
        rx="180"
        ry="120"
        fill="#a855f7"
        opacity="0.12"
      />
      <rect
        x="60%"
        y="60%"
        width="300"
        height="200"
        fill="#7c3aed"
        opacity="0.1"
        transform="rotate(45)"
      />
    </svg>
  );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedVideo(file);
      setVideoName(file.name); // Set the video name
      console.log("Uploaded Video:", file.name); // Log the file name
    }
  };

  // const handleGenerateDescriptions = async (): Promise<void> => {
  //   if (selectedScenes.size === 0) {
  //     alert("Please select scenes to generate descriptions");
  //     return;
  //   }

  //   // Ensure uploadedVideo is not null and has a name
  //   if (!uploadedVideo || !uploadedVideo.name) {
  //     alert("No video uploaded. Please upload a video before generating descriptions.");
  //     return;
  //   }

  //   try {
  //     const selectedSceneData = videoDescriptions
  //       .filter((scene) => selectedScenes.has(scene.startTime))
  //       .map((scene) => ({
  //         start: scene.startTime,
  //         end: scene.endTime,
  //         current_description: scene.description,
  //       }));

  //     const payload = {
  //       video_name: uploadedVideo.name, // Ensure this is set correctly
  //       scenes: selectedSceneData,
  //     };

  //     console.log("Payload being sent:", payload); // Log the payload

  //     const response = await fetch("http://localhost:5000/regenerate-descriptions", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(payload),
  //     });

  //     if (!response.ok) throw new Error("Failed to generate descriptions");

  //     const newDescriptions = await response.json();
  //     const updatedDescriptions = videoDescriptions.map((scene) => {
  //       const newScene = newDescriptions.descriptions.find(
  //         (n) => n.start === scene.startTime && n.end === scene.endTime
  //       );
  //       return newScene ? { ...scene, ...newScene, isEdited: true } : scene;
  //     });

  //     setVideoDescriptions(updatedDescriptions);
  //     setPreviousDescriptions(updatedDescriptions);
  //     alert("Descriptions updated successfully!");
  //   } catch (error) {
  //     console.error("Description generation error:", error);
  //     alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
  //   }
  // };

  // const handleGenerateDescriptions = async (): Promise<void> => {
  //   if (selectedScenes.size === 0) {
  //     alert("Please select scenes to generate descriptions");
  //     return;
  //   }

  //   if (!uploadedVideo || !uploadedVideo.name) {
  //     alert(
  //       "No video uploaded. Please upload a video before generating descriptions."
  //     );
  //     return;
  //   }

  //   try {
  //     const selectedSceneData = videoDescriptions
  //       .filter((scene) => selectedScenes.has(scene.startTime))
  //       .map((scene) => ({
  //         start: scene.startTime,
  //         end: scene.endTime,
  //         current_description: scene.description,
  //       }));

  //     const payload = {
  //       video_name: uploadedVideo.name,
  //       scenes: selectedSceneData,
  //     };

  //     console.log("Payload being sent:", payload);

  //     const response = await fetch(
  //       "http://localhost:5000/regenerate-descriptions",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(payload),
  //       }
  //     );

  //     if (!response.ok || !response.body) {
  //       throw new Error("Failed to generate descriptions");
  //     }

  //     const reader = response.body.getReader();
  //     const decoder = new TextDecoder();
  //     let updatedDescriptions = [...videoDescriptions];

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunks = decoder.decode(value).split("\n");
  //       for (const chunk of chunks) {
  //         if (!chunk) continue;

  //         try {
  //           const data = JSON.parse(chunk);

  //           // Handle progress updates
  //           if (data.progress !== undefined) {
  //             setProcessingProgress(data.progress);
  //             setProcessingMessage(data.message || "");
  //           }

  //           // Handle final response with updated descriptions
  //           if (data.progress === 100 && data.data) {
  //             updatedDescriptions = updatedDescriptions.map((scene) => {
  //               const newScene = data.data.descriptions.find(
  //                 (n: any) =>
  //                   n.start === scene.startTime && n.end === scene.endTime
  //               );
  //               return newScene
  //                 ? { ...scene, ...newScene, isEdited: true }
  //                 : scene;
  //             });
  //           }

  //           // Handle errors
  //           if (data.error) {
  //             throw new Error(data.error);
  //           }
  //         } catch (e) {
  //           console.error("Error parsing JSON chunk:", e);
  //         }
  //       }
  //     }

  //     // Update state with final descriptions
  //     setVideoDescriptions(updatedDescriptions);
  //     setPreviousDescriptions(updatedDescriptions);
  //     alert("Descriptions updated successfully!");
  //   } catch (error) {
  //     console.error("Description generation error:", error);
  //     alert(
  //       `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  //     );
  //   } finally {
  //     setProcessingProgress(0);
  //     setProcessingMessage("");
  //   }
  // };

  // const handleGenerateDescriptions = async (): Promise<void> => {
  //   if (selectedScenes.size === 0) {
  //     alert("Please select scenes to generate descriptions");
  //     return;
  //   }

  //   if (!uploadedVideo || !uploadedVideo.name) {
  //     alert(
  //       "No video uploaded. Please upload a video before generating descriptions."
  //     );
  //     return;
  //   }

  //   try {
  //     const selectedSceneData = videoDescriptions
  //       .filter((scene) => selectedScenes.has(scene.startTime))
  //       .map((scene) => ({
  //         start: scene.startTime,
  //         end: scene.endTime,
  //         current_description: scene.description,
  //       }));

  //     const payload = {
  //       video_name: uploadedVideo.name,
  //       scenes: selectedSceneData,
  //     };

  //     console.log("Payload being sent:", payload);

  //     const response = await fetch(
  //       "http://localhost:5000/regenerate-descriptions",
  //       {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify(payload),
  //       }
  //     );

  //     if (!response.ok || !response.body) {
  //       throw new Error("Failed to generate descriptions");
  //     }

  //     const reader = response.body.getReader();
  //     const decoder = new TextDecoder();
  //     let updatedDescriptions = [...videoDescriptions];

  //     while (true) {
  //       const { done, value } = await reader.read();
  //       if (done) break;

  //       const chunks = decoder.decode(value).split("\n");
  //       for (const chunk of chunks) {
  //         if (!chunk) continue;

  //         try {
  //           const data = JSON.parse(chunk);

  //           // Handle progress updates
  //           if (data.progress !== undefined) {
  //             setProcessingProgress(data.progress);
  //             setProcessingMessage(data.message || "");
  //           }

  //           // Handle final response with updated descriptions
  //           if (data.progress === 100 && data.data) {
  //             updatedDescriptions = updatedDescriptions.map((scene) => {
  //               const newScene = data.data.descriptions.find(
  //                 (n: any) =>
  //                   n.start === scene.startTime && n.end === scene.endTime
  //               );
  //               return newScene
  //                 ? {
  //                     ...scene,
  //                     description: newScene.description,
  //                     isEdited: true,
  //                   }
  //                 : scene;
  //             });
  //           }

  //           // Handle errors
  //           if (data.error) {
  //             throw new Error(data.error);
  //           }
  //         } catch (e) {
  //           console.error("Error parsing JSON chunk:", e);
  //         }
  //       }
  //     }

  //     // Update state with final descriptions
  //     setVideoDescriptions(updatedDescriptions);
  //     setPreviousDescriptions(updatedDescriptions);
  //     alert("Descriptions updated successfully!");
  //   } catch (error) {
  //     console.error("Description generation error:", error);
  //     alert(
  //       `Error: ${error instanceof Error ? error.message : "Unknown error"}`
  //     );
  //   } finally {
  //     setProcessingProgress(0);
  //     setProcessingMessage("");
  //   }
  // };

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
              console.log(data.data)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900/100 via-purple-700/100 to-indigo-600/100 flex flex-col">
      <main className="flex-grow h-screen overflow-hidden">
        <TranscriptionEditor3
          videoDescriptions={videoDescriptions}
          onDescriptionChange={setVideoDescriptions}
          uploadedVideo={uploadedVideo}
          onProcessVideo={handleProcessVideo}
          setUploadedVideo={setUploadedVideo}
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
        />
        {/* Add a reload button */}
        <div className="fixed bottom-4 right-4">
          <Button
            variant="secondary"
            className={`${buttonStyles.base} ${buttonStyles.variants.secondary} p-3 rounded-full shadow-lg backdrop-blur-sm`}
            onClick={reloadPreviousDescriptions}
          >
            <RefreshCw className="w-6 h-6" />
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Workspace3;
