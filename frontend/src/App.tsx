import React, { useState, useEffect } from "react";
import { Video } from "lucide-react";
import "./App.css";
import TranscriptionEditor2 from "./components/Editor2";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

const App: React.FC = () => {
  const synth = window.speechSynthesis;

  // State management
  const [videoDescriptions, setVideoDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [combinedDescriptions, setCombinedDescriptions] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Update combined descriptions when video descriptions change
  useEffect(() => {
    const descriptionsArray = videoDescriptions.map((item) => item.description);
    const combinedText = descriptionsArray.join(" ");
    setCombinedDescriptions(combinedText);
  }, [videoDescriptions]);

  // Video processing function
  const handleProcessVideo = async (videoFile: File, action: string) => {
    if (!action) {
      alert("Please select an action");
      return;
    }

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
        const processedDescriptions = result.timestamps.map(
          (timestamp: any, index: number) => ({
            startTime: timestamp[0],
            endTime: timestamp[1],
            description: result.descriptions[index],
            videoUrl: `http://localhost:5000/scene_files/${result.scene_files[index]}`,
          })
        );

        setUploadedVideo(videoFile);
        setVideoDescriptions(processedDescriptions);
      } else {
        alert("Error processing video");
      }
    } catch (error) {
      alert("Error connecting to backend");
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
        audio.currentTime = 0; // Reset audio to the beginning
      }
      setSpeechActive(false);
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

  const handleDescriptionChange = (
    updatedDescriptions: VideoDescriptionItem[]
  ) => {
    setVideoDescriptions(updatedDescriptions);
  };

  const resetAppState = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setSpeechActive(false);
    setVideoDescriptions([]);
    setUploadedVideo(null);
    setCombinedDescriptions("");
    setAudio(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-700 to-indigo-600 flex flex-col">
      <main className="flex-grow h-screen overflow-hidden">
        <TranscriptionEditor2
          videoDescriptions={videoDescriptions}
          onDescriptionChange={handleDescriptionChange}
          uploadedVideo={uploadedVideo}
          onProcessVideo={handleProcessVideo} // Pass the process video function
          setUploadedVideo={setUploadedVideo} // Pass the setter for uploaded video
          handleEncodeVideo={handleEncodeVideo}
          toggleAudioDescription={toggleAudioDescription}
        />
      </main>
    </div>
  );
};

export default App;
