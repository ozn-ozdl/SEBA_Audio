import { useState, useEffect } from "react";
import VideoUploader from "../../components/VideoUploader";
import VideoDescription from "../../components/VideoDescription";
import {
  Video,
  Play,
  Pause,
  FileOutput,
  FileAudio2,
  Save,
  LayoutDashboard,
  Power,
} from "lucide-react";
import { useLocalStorage } from "@uidotdev/usehooks";

export function WorkSpace() {
  const synth = window.speechSynthesis;
  const name = new URLSearchParams(window.location.search).get("name")!;

  interface VideoDescriptionItem {
    startTime: string;
    endTime: string;
    description: string;
    videoUrl: string;
  }

  const [videoDescriptions, setVideoDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
  const [combinedDescriptions, setCombinedDescriptions] = useState("");
  const [speechActive, setSpeechActive] = useState(false);
  const [speechUtterance, setSpeechUtterance] =
    useState<SpeechSynthesisUtterance | null>(null);
  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<
      { name: string; data: VideoDescriptionItem[]; date: String }[]
    >(`video_descriptions`, []);

  useEffect(() => {
    const descriptionsArray = videoDescriptions.map((item) => item.description);
    const combinedText = descriptionsArray.join(" ");
    setCombinedDescriptions(combinedText);
    console.log(222);
  }, [videoDescriptions]);

  useEffect(() => {
    if (videoDescriptionsStorage) {
      const currentDetail = videoDescriptionsStorage.find(
        (item) => item.name === name
      );

      if (currentDetail) {
        setVideoDescriptions(currentDetail.data);
      }
    }
    console.log(333);
  }, [videoDescriptionsStorage, name]);

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
            const result: {
                descriptions: string[];
                message: string;
                scene_files: string[];
                timestamps: [string, string][];
                request_id: string; 
            } = await response.json();

            const processedDescriptions = result.timestamps.map(
                (timestamp: any, index: number) => ({
                    startTime: timestamp[0],
                    endTime: timestamp[1],
                    description: result.descriptions[index],
                    // 修改 URL 构造方式
                    videoUrl: `http://localhost:5000/scene_files/${result.request_id}/${result.scene_files[index]}`,
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

  const toggleAudioDescription = () => {
    if (!speechActive) {
      const speech = new SpeechSynthesisUtterance(combinedDescriptions);
      speech.lang = "en-US";

      synth.speak(speech);
      setSpeechActive(true);
      setSpeechUtterance(speech);
    } else {
      synth.cancel();
      setSpeechActive(false);
    }
  };

  const resetAppState = () => {
    synth.cancel();
    setVideoDescriptions([]);
    setUploadedVideo(null);
    setCombinedDescriptions("");
    setSpeechActive(false);
    setSpeechUtterance(null);
  };

  const handleExportSRT = async () => {
    if (videoDescriptions.length === 0) {
      alert("Please process a video and ensure descriptions are available.");
      return;
    }

    const srtPayload = videoDescriptions
      .map((item, index) => {
        return `${index + 1}\n${item.startTime} --> ${item.endTime}\n${
          item.description
        }\n\n`;
      })
      .join("");

    const blob = new Blob([srtPayload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `${name}_video_descriptions.srt`;
    link.click();
  };

  const handleSave = async () => {
    if (videoDescriptions.length === 0) {
      alert("Please process a video and ensure descriptions are available.");
      return;
    }

    if (videoDescriptionsStorage.length === 0) {
      setVideoDescriptionsStorage([
        {
          data: videoDescriptions,
          name,
          date: new Date().toLocaleDateString(),
        },
      ]);
      return;
    }

    const newStorage = videoDescriptionsStorage.filter(
      (item) => item.name !== name
    );

    setVideoDescriptionsStorage([
      ...newStorage,
      {
        data: videoDescriptions,
        name,
        date: new Date().toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      },
    ]);
    alert("Your work has been successfully saved!");
  };

  const handleExportMP3 = async () => {
    try {
      const response = await fetch("http://localhost:5001/text_to_speech", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: combinedDescriptions }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        // Create a download link and trigger the download
        const link = document.createElement("a");
        link.href = url;
        link.download = "output.mp3"; // Customize the file name if needed
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        alert("Failed to generate MP3 file. Please try again.");
      }
    } catch (error) {
      console.error("Error exporting MP3:", error);
      alert("An error occurred while exporting MP3.");
    }
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

      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 gap-8">
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6 ">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Scene Descriptions
            <span className="bg-slate-200 px-4 py-1 ml-4 rounded-full">
              {name}
            </span>
          </h2>
          <VideoDescription
            videoDescriptions={videoDescriptions}
            setVideoDescriptions={setVideoDescriptions}
            onDescriptionChange={(updatedDescriptions) => {
              setVideoDescriptions(updatedDescriptions);
            }}
          />
        </div>

        <div className="md:col-span-1">
          <VideoUploader onProcessVideo={handleProcessVideo} />
          <div>
            {videoDescriptions.length > 0 && (
              <div className="mt-4 flex flex-col items-start gap-2">
                <button
                  onClick={handleEncodeVideo}
                  className="bg-yellow-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-yellow-500 transition-all"
                >
                  Finalize and Encode Video
                </button>

                <button
                  onClick={toggleAudioDescription}
                  className="bg-green-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-green-500 transition-all flex items-center gap-2"
                >
                  {synth.speaking ? (
                    <>
                      <Pause size={20} /> Stop Audio
                    </>
                  ) : (
                    <>
                      <Play size={20} /> Play Audio
                    </>
                  )}
                </button>

                <div className="flex gap-4">
                  <button
                    className="bg-green-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-green-500 transition-all flex items-center gap-2"
                    onClick={handleExportMP3}
                  >
                    <FileAudio2 size={20} /> Export MP3 file
                  </button>

                  <button
                    className="bg-green-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-green-500 transition-all flex items-center gap-2"
                    onClick={handleExportSRT}
                  >
                    <FileOutput size={20} /> Export SRT file
                  </button>
                </div>

                <button
                  className="bg-blue-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-blue-500 transition-all flex items-center gap-2"
                  onClick={handleSave}
                >
                  <Save size={20} /> Save
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <button
            className="bg-red-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-red-600 transition-all"
            onClick={() => (window.location.href = "/dashboard")}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>

          <button
            onClick={resetAppState}
            className="bg-red-500 text-white px-6 py-3 rounded-md shadow-md hover:bg-red-600 transition-all"
          >
            <Power size={20} /> Reset Application
          </button>
        </div>
      </footer>
    </div>
  );
}
