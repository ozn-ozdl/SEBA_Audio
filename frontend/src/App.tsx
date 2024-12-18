// import React, { useState, useEffect } from "react";
// import VideoUploader from "./components/VideoUploader";
// import VideoDescription from "./components/VideoDescription";
// import { Video, Play, Pause } from "lucide-react";
// import "./App.css";

// const App: React.FC = () => {
//   const synth = window.speechSynthesis;
//   interface VideoDescriptionItem {
//     startTime: string;
//     endTime: string;
//     description: string;
//     videoUrl: string;
//   }

//   const [videoDescriptions, setVideoDescriptions] = useState<
//     VideoDescriptionItem[]
//   >([]);
//   const [uploadedVideo, setUploadedVideo] = useState<File | null>(null);
//   const [combinedDescriptions, setCombinedDescriptions] = useState("");
//   const [speechActive, setSpeechActive] = useState(false);
//   const [speechUtterance, setSpeechUtterance] =
//     useState<SpeechSynthesisUtterance | null>(null);

//   useEffect(() => {
//     // Collect all descriptions into an array and combine them.
//     const descriptionsArray = videoDescriptions.map((item) => item.description);
//     const combinedText = descriptionsArray.join(" ");
//     setCombinedDescriptions(combinedText);

//     // Log the combined descriptions.
//     console.log(combinedText);
//   }, [videoDescriptions]);

//   const handleProcessVideo = async (videoFile: File, action: string) => {
//     if (!action) {
//       alert("Please select an action");
//       return;
//     }

//     const formData = new FormData();
//     formData.append("action", action);
//     formData.append("video", videoFile);

//     try {
//       const response = await fetch("http://localhost:5000/process-video", {
//         method: "POST",
//         body: formData,
//       });

//       if (response.ok) {
//         const result = await response.json();
//         const processedDescriptions = result.timestamps.map(
//           (timestamp: any, index: number) => ({
//             startTime: timestamp[0],
//             endTime: timestamp[1],
//             description: result.descriptions[index],
//             videoUrl: `http://localhost:5000/scene_files/${result.scene_files[index]}`,
//           })
//         );

//         setUploadedVideo(videoFile);
//         setVideoDescriptions(processedDescriptions);
//       } else {
//         alert("Error processing video");
//       }
//     } catch (error) {
//       alert("Error connecting to backend");
//     }
//   };

//   const handleEncodeVideo = async () => {
//     if (!uploadedVideo || videoDescriptions.length === 0) {
//       alert("Please process a video and ensure descriptions are available.");
//       return;
//     }

//     const descriptions = videoDescriptions.map((item) => item.description);
//     const timestamps = videoDescriptions.map((item) => [
//       item.startTime,
//       item.endTime,
//     ]);

//     const jsonPayload = {
//       descriptions,
//       timestamps,
//       videoFileName: uploadedVideo.name,
//     };

//     try {
//       const encodeResponse = await fetch(
//         "http://localhost:5000/encode-video-with-subtitles",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//           },
//           body: JSON.stringify(jsonPayload),
//         }
//       );

//       if (encodeResponse.ok) {
//         const result = await encodeResponse.json();
//         const downloadUrl = `http://localhost:5000${result.output_video_url}`;

//         // Create a temporary anchor element to trigger the download
//         const link = document.createElement("a");
//         link.href = downloadUrl;
//         link.download = result.output_video_url.split("/").pop();
//         link.click();
//       } else {
//         alert("Error encoding video with subtitles");
//       }
//     } catch (error) {
//       alert("Error connecting to backend");
//     }
//   };

//   const toggleAudioDescription = () => {
//     // If speech is not active, start speaking
//     if (!speechActive) {
//       // const speech = new SpeechSynthesisUtterance(combinedDescriptions);
//       // speech.lang = "en-US";
//       // speech.rate = 1;
//       // speech.pitch = 1;
//       // console.log("set speech")

//       // console.log("speaking")
//       // setSpeechActive(true)
//       // setSpeechUtterance(speech);

//       const speech = new SpeechSynthesisUtterance(combinedDescriptions);

//       speech.lang = "en-US";
//       speech.rate = 1;
//       speech.pitch = 1;

//       synth.speak(speech);

//       console.log("Playing audio description.");
//       console.log("Queued", synth.pending);
//       console.log("Paused ", synth.paused);
//       console.log("Playing ", synth.speaking);
//     } else {
//       // If speech is active, cancel it
//       if (speechUtterance) {
//         synth.pause();
//       }
//       setSpeechActive(false);
//     }
//   };

//   const handleDescriptionChange = (
//     updatedDescriptions: VideoDescriptionItem[]
//   ) => {
//     setVideoDescriptions(updatedDescriptions);
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-700 to-indigo-600 flex flex-col">
//       <header className="bg-white shadow-md">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
//           <h1 className="text-2xl font-bold text-black flex items-center">
//             <Video className="mr-3 text-yellow-400" />
//             Video Description Generator
//           </h1>
//         </div>
//       </header>

//       <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 gap-8">
//         <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6 ">
//           <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
//             Scene Descriptions
//           </h2>
//           <VideoDescription
//             videoDescriptions={videoDescriptions}
//             onDescriptionChange={handleDescriptionChange}
//           />
//         </div>

//         <div className="md:col-span-1">
//           <VideoUploader onProcessVideo={handleProcessVideo} />
//           <div>
//             {videoDescriptions.length > 0 && (
//               <div className="mt-4 flex flex-col items-start gap-2">
//                 <button
//                   onClick={handleEncodeVideo}
//                   className="bg-yellow-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-yellow-500 transition-all"
//                 >
//                   Finalize and Encode Video
//                 </button>
//                 <button
//                   onClick={toggleAudioDescription}
//                   className="bg-green-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-green-500 transition-all flex items-center gap-2"
//                 >
//                   {synth.speaking ? (
//                     <>
//                       <Pause size={20} /> Stop Audio
//                     </>
//                   ) : (
//                     <>
//                       <Play size={20} /> Play Audio
//                     </>
//                   )}
//                 </button>
//               </div>
//             )}
//           </div>
//         </div>
//       </main>

//       <footer className="bg-white shadow-md py-4">
//         <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
//           © 2024 NarrifAI
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default App;


import React, { useState, useEffect } from "react";
import VideoUploader from "./components/VideoUploader";
import VideoDescription from "./components/VideoDescription";
import { Video, Play, Pause } from "lucide-react";
import "./App.css";

const App: React.FC = () => {
  const synth = window.speechSynthesis;
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

  useEffect(() => {
    const descriptionsArray = videoDescriptions.map((item) => item.description);
    const combinedText = descriptionsArray.join(" ");
    setCombinedDescriptions(combinedText);
  }, [videoDescriptions]);

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

  const handleDescriptionChange = (
    updatedDescriptions: VideoDescriptionItem[]
  ) => {
    setVideoDescriptions(updatedDescriptions);
  };

  const resetAppState = () => {
    synth.cancel(); // Stop any active speech
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

      <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 grid md:grid-cols-2 gap-8">
        <div className="md:col-span-1 bg-white rounded-lg shadow-md p-6 ">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 border-b pb-2">
            Scene Descriptions
          </h2>
          <VideoDescription
            videoDescriptions={videoDescriptions}
            onDescriptionChange={handleDescriptionChange}
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
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white shadow-md py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500">
          <button
            onClick={resetAppState}
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
