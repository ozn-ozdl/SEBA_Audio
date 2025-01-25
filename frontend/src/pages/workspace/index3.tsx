import React, { useState, useEffect } from "react";
import { Video, Play, Pause, Save, RefreshCw } from "lucide-react";
import TranscriptionEditor3 from "src/components/Editor3";

interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
}

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
  const synth = window.speechSynthesis;
  const name = new URLSearchParams(window.location.search).get("name")!;

  // State management
  const [videoDescriptions, setVideoDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [combinedDescriptions, setCombinedDescriptions] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [previousDescriptions, setPreviousDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);

  const action = "new_gemini";

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

  // const handleProcessVideo = async (videoFile: File, action: string) => {
  //   const formData = new FormData();
  //   formData.append("action", action);
  //   formData.append("video", videoFile);

  //   try {
  //     const response = await fetch("http://localhost:5000/process-video", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       console.log(result);
  //       const videoDescriptionItems: VideoDescriptionItem[] =
  //         result.timestamps.map(
  //           ([startTime, endTime]: [string, string], index: number) => ({
  //             startTime: timestampToMilliseconds(startTime),
  //             endTime: timestampToMilliseconds(endTime),
  //             description:
  //               result.descriptions[index] || "No description available",
  //             audioFile: result.audio_files[index] || undefined,
  //           })
  //         );
  //       setPreviousDescriptions(videoDescriptionItems);
  //       setVideoDescriptions(videoDescriptionItems);
  //       console.log("Video Description Items:", videoDescriptionItems);
  //     } else {
  //       alert("Error processing video");
  //     }
  //   } catch (error) {
  //     alert("Error connecting to backend");
  //   }
  // };

  const handleProcessVideo = async (videoFile: File, action: string) => {
    const formData = new FormData();
    formData.append("action", action);
    formData.append("video", videoFile);

    try {
      const response = await fetch("http://localhost:5000/process-video", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        console.log(result);
        const videoDescriptionItems: VideoDescriptionItem[] =
          result.timestamps.map(
            ([startTime, endTime]: [number, number], index: number) => ({
              startTime: startTime,
              endTime: endTime,
              description:
                result.descriptions[index] || "No description available",
              audioFile: result.audio_files[index] || undefined,
            })
          );
        setPreviousDescriptions(videoDescriptionItems);
        setVideoDescriptions(videoDescriptionItems);
        console.log("Video Description Items:", videoDescriptionItems);
      } else {
        alert("Error processing video");
      }
    } catch (error) {
      alert("Error connecting to backend");
    }
  };

  const handleReanalyzeVideo = async (videoName: string): Promise<void> => {
    if (!videoName) {
      alert("No video specified");
      return;
    }
    console.log("Descriptions:", videoDescriptions);

    // Prepare timestamps with normalization
    const formatTimestamp = (item: VideoDescriptionItem) =>
      `${normalizeTimestamp(item.startTime)}-${normalizeTimestamp(
        item.endTime
      )}`;

    const oldData = previousDescriptions
      .filter((item) => !item.description.toUpperCase().includes("TALKING"))
      .map((item) => ({
        start: normalizeTimestamp(item.startTime),
        end: normalizeTimestamp(item.endTime),
        description: item.description,
      }));

    const newTimestamps = videoDescriptions
      .filter((item) => !item.description.toUpperCase().includes("TALKING"))
      .map(formatTimestamp)
      .join(",");

    try {
      const formData = new FormData();
      formData.append("video_name", videoName);
      formData.append("old_data", JSON.stringify(oldData));
      formData.append("new_timestamp", newTimestamps);

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
          ...result.descriptions,
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
    const updatedDescriptions = [...videoDescriptions];
    const regenerationIndices: number[] = [];
    const regenerationPayload: any[] = [];

    updatedDescriptions.forEach((item, index) => {
      if (!item.description.toUpperCase().includes("TALKING")) {
        regenerationIndices.push(index);
        regenerationPayload.push({
          description: item.description,
          timestamps: [Number(item.startTime), Number(item.endTime)],
          scene_id: item.startTime,
        });
      }
    });

    if (regenerationPayload.length === 0) {
      console.log("No descriptions need regeneration.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/text-to-speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(regenerationPayload),
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate audio");
      }

      const data = await response.json();

      // Update the original array using stored indices
      data.audio_files.forEach(
        (audioFileData: { audio_file: string }, responseIndex: number) => {
          const originalIndex = regenerationIndices[responseIndex];
          if (
            originalIndex !== undefined &&
            updatedDescriptions[originalIndex]
          ) {
            updatedDescriptions[originalIndex] = {
              ...updatedDescriptions[originalIndex],
              audioFile: audioFileData.audio_file,
            };
            console.log(`Updated audio at index ${originalIndex}`);
          }
        }
      );

      // Update state with the modified copy
      setVideoDescriptions(updatedDescriptions);
    } catch (error) {
      console.error("Error regenerating audio:", error);
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
        />
        {/* Add a reload button */}
        <div className="fixed bottom-4 right-4">
          <button
            onClick={reloadPreviousDescriptions}
            className="-3 bg-blue-600/80 text-white rounded-full shadow-lg hover:bg-blue-700/90 transition-all backdrop-blur-sm"
            title="Reload previous descriptions"
          >
            <RefreshCw className="w-6 h-6" />
          </button>
        </div>
      </main>
    </div>
  );
};

export default Workspace3;
