import React, { useState, useEffect } from "react";
import TranscriptionEditor from "./components/TranscriptionEditor";
import { Video } from "lucide-react";
import "./App.css";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

const App: React.FC = () => {
  const synth = window.speechSynthesis;

  // State management
  const [videoDescriptions, setVideoDescriptions] = useState<VideoDescriptionItem[]>([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [combinedDescriptions, setCombinedDescriptions] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const [speechUtterance, setSpeechUtterance] = useState<SpeechSynthesisUtterance | null>(null);

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

  const handleDescriptionChange = (
    updatedDescriptions: VideoDescriptionItem[]
  ) => {
    setVideoDescriptions(updatedDescriptions);
  };

  const handleReset = () => {
    synth.cancel();
    setVideoDescriptions([]);
    setUploadedVideo(null);
    setCombinedDescriptions("");
    setSpeechActive(false);
    setSpeechUtterance(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-700 to-indigo-600 flex flex-col">
      <header className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black flex items-center">
            <Video className="mr-3 text-yellow-400" />
            Video Description Generator
          </h1>
        </div>
      </header>

      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-1 gap-8">
        <TranscriptionEditor
          videoDescriptions={videoDescriptions}
          onDescriptionChange={handleDescriptionChange}
          uploadedVideo={uploadedVideo}
          onProcessVideo={handleProcessVideo} // Pass the process video function
          setUploadedVideo={setUploadedVideo} // Pass the setter for uploaded video
        />
      </main>

      <footer className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <button
            onClick={handleReset}
            className="bg-red-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-red-600 transition-all"
          >
            Reset Application
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;