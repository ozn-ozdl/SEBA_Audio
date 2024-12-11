import "./App.css";
import VideoUploader from "./components/VideoUploader";
import { VideoDescription } from "./components/VideoDescription";
import { useState } from "react";

//TODO: manuell component distances to automatic ones
function App() {
  const exampleDescriptions = [
    {
      startTime: "00:00:00",
      endTime: "00:00:03",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:03",
      endTime: "00:00:10",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:10",
      endTime: "00:00:15",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:15",
      endTime: "00:00:16",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:16",
      endTime: "00:00:18",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:18",
      endTime: "00:00:22",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:22",
      endTime: "00:00:26",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:26",
      endTime: "00:00:30",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:30",
      endTime: "00:00:33",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:33",
      endTime: "00:00:40",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:40",
      endTime: "00:00:42",
      description: "This is a video description.",
      videoUrl: "",
    },
    {
      startTime: "00:00:42",
      endTime: "00:00:49",
      description: "This is a video description.",
      videoUrl: "",
    },
  ];

  const [videoDescriptions, setVideoDescriptions] =
    useState(exampleDescriptions);

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

        setVideoDescriptions(processedDescriptions);
      } else {
        alert("Error processing video");
      }
    } catch (error) {
      alert("Error connecting to backend");
    }
  };

  return (
    <div className="bg-bg-secondary h-screen flex flex-col overflow-hidden">
      <header className="bg-bg-primary  text-text-primary py-4 px-6 flex justify-center">
        <h1 className="text-lg font-semibold">Video Descriptions</h1>
      </header>

      <div className="flex flex-1">
        <div className="w-2/3 p-4 border-r border-gray-700">
          <div className="bg-bg-secondary text-text-primary py-2 rounded-t-md mb-4">
            <h2 className="text-md font-semibold">Textual Descriptions</h2>
          </div>

          <VideoDescription videoDescriptions={videoDescriptions} />
        </div>

        <div className="w-1/3 p-4 flex flex-col items-center justify-center">
          <VideoUploader onProcessVideo={handleProcessVideo} />
        </div>
      </div>
    </div>
  );
}

export default App;
