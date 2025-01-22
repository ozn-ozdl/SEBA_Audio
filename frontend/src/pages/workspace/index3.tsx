import React, { useState, useEffect } from "react";
import { Video, Play, Pause, Save } from "lucide-react";
import TranscriptionEditor2 from "src/components/Editor2";
import { useLocalStorage } from "@uidotdev/usehooks";
import TranscriptionEditor3 from "src/components/Editor3";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  audioFile?: string;
}

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
  const [videoDescriptionsStorage, setVideoDescriptionsStorage] =
    useLocalStorage<
      {
        name: string;
        data: VideoDescriptionItem[];
        date: string;
      }[]
    >("video_descriptions", []);

  const action = "new_gemini";

  // Update combined descriptions when video descriptions change
  useEffect(() => {
    const descriptionsArray = videoDescriptions.map((item) => item.description);
    const combinedText = descriptionsArray.join(" ");
    setCombinedDescriptions(combinedText);
  }, [videoDescriptions]);

  // Load video descriptions from local storage
  useEffect(() => {
    if (videoDescriptionsStorage) {
      const currentDetail = videoDescriptionsStorage.find(
        (item) => item.name === name
      );
      if (currentDetail) {
        setVideoDescriptions(currentDetail.data);
      }
    }
  }, [videoDescriptionsStorage, name]);

  // Compare timestamps and send only the changed ones
  const compareTimestamps = (
    oldTimestamps: VideoDescriptionItem[],
    newTimestamps: VideoDescriptionItem[]
  ) => {
    const modifiedItems = [];
    for (let i = 0; i < newTimestamps.length; i++) {
      if (
        oldTimestamps[i] &&
        (oldTimestamps[i].startTime !== newTimestamps[i].startTime ||
          oldTimestamps[i].endTime !== newTimestamps[i].endTime)
      ) {
        modifiedItems.push(newTimestamps[i]);
      }
    }
    return modifiedItems;
  };

  const reprocessDescriptions = async (
    modifiedDescriptions: VideoDescriptionItem[]
  ) => {
    try {
      const response = await fetch("http://localhost:5000/reanalyze-video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          video_filename: uploadedVideo?.name,
          timestamps: modifiedDescriptions.map((item) => [
            item.startTime,
            item.endTime,
          ]),
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update state with the newly reprocessed descriptions
        setVideoDescriptions(
          result.data.map((item: any) => ({
            startTime: item.timestamp[0],
            endTime: item.timestamp[1],
            description: item.description,
            videoUrl: `http://localhost:5000/scene_files/${item.scene_id}.mp4`,
            audioFile: item.audio_file,
          }))
        );
      } else {
        alert("Error reprocessing descriptions");
      }
    } catch (error) {
      alert("Error connecting to backend");
    }
  };

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

        const videoDescriptionItems: VideoDescriptionItem[] =
          result.timestamps.map(
            ([startTime, endTime]: [string, string], index: number) => ({
              startTime,
              endTime,
              description:
                result.descriptions[index] || "No description available",
              audioFile: result.audio_files[index] || undefined,
            })
          );

        setVideoDescriptions(videoDescriptionItems);
        console.log("Video Description Items:", videoDescriptionItems);
        // Do something with videoDescriptionItems, e.g., display in UI
      } else {
        alert("Error processing video");
      }
    } catch (error) {
      alert("Error connecting to backend");
    }
  };

  // const handleProcessVideo = async (videoFile: File, action: string) => {
  //   if (!action) {
  //     alert("Please select an action");
  //     return;
  //   }

  //   const formData = new FormData();
  //   formData.append("action", action);
  //   formData.append("video", videoFile);
  //   console.log(formData);
  //   try {
  //     const response = await fetch("http://localhost:5000/process-video", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     if (response.ok) {
  //       const result = await response.json();
  //       const processedDescriptions = result.data.map((item: any) => ({
  //         startTime: item.timestamp[0],
  //         endTime: item.timestamp[1],
  //         description: item.description,
  //         videoUrl: `http://localhost:5000/scene_files/${item.scene_id}.mp4`,
  //         audioFile: item.audio_file,
  //       }));
  //       console.log("processedDescriptions", processedDescriptions);
  //       setVideoDescriptions(processedDescriptions);
  //     } else {
  //       alert("Error processing video");
  //     }
  //   } catch (error) {
  //     alert("Error connecting to backend");
  //   }
  // };

  // console.log(videoDescriptions);
  const handleAnalyzeVideo = async (): Promise<void> => {
    // Placeholder for actual analysis function
    alert("Analyzing video...");
  };

  const handleReanalyzeVideo = async (): Promise<void> => {
    // Placeholder for reanalyzing video
    alert("Reanalyzing video...");
  };

  interface VideoDescriptionItem {
    startTime: string;
    endTime: string;
    description: string;
    audioFile?: string;
  }

  const handleRegenerateAudio = async (): Promise<void> => {
    console.log("Descriptions:", videoDescriptions);
  
    // Filter out descriptions that contain "TALKING"
    const descriptionsToRegenerate = videoDescriptions.filter(item => 
      !item.description.toUpperCase().includes("TALKING")
    );
  
    if (descriptionsToRegenerate.length === 0) {
      console.log("No descriptions need regeneration.");
      return;
    }
  
    try {
      // Send a single request containing all valid descriptions
      const response = await fetch('http://localhost:5000/text-to-speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          descriptionsToRegenerate.map(item => ({
            description: item.description,
            timestamps: [parseFloat(item.startTime), parseFloat(item.endTime)],
            scene_id: item.startTime, // You can use any unique identifier, like `startTime`
          }))
        ),
      });
  
      if (!response.ok) {
        throw new Error('Failed to regenerate audio');
      }
  
      const data = await response.json();
  
      // Loop through the response and update the audio files
      data.audio_files.forEach((audioFileData: { audio_file: string }, index: number) => {
        // Update the audio file path for each description item
        descriptionsToRegenerate[index].audioFile = audioFileData.audio_file;
        console.log(`Updated audio file for description: ${descriptionsToRegenerate[index].description}`);
      });
  
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
        audio.currentTime = 0; // Reset audio to the beginning
      }
      setSpeechActive(false);
    }
  };

  // const handleAudioRequest = async () => {
  //   const formData = new FormData();

  //   try {
  //     // Use the existing `videoDescriptions` object
  //     const descriptionsWithId = videoDescriptions.map((item) => ({
  //       scene_id: item.videoUrl.split("/").pop()?.split(".")[0],
  //       description: item.description,
  //     }));

  //     formData.append("scenes", JSON.stringify(descriptionsWithId));

  //     // Send request to generate audio files
  //     const response = await fetch("http://localhost:5000/generate-audio", {
  //       method: "POST",
  //       body: formData,
  //     });

  //     if (response.ok) {
  //       const result = await response.blob();
  //       // Handle the downloaded audio files (either a zip or a single file)
  //       const link = document.createElement("a");
  //       const audioUrl = URL.createObjectURL(result);

  //       // If the response is a zip file, it will be handled here
  //       if (result.type === "application/zip") {
  //         link.href = audioUrl;
  //         link.download = "audio_files.zip"; // Download as zip if multiple files
  //       } else {
  //         link.href = audioUrl;
  //         link.download = "audio_description.mp3"; // Single file download
  //       }

  //       link.click();
  //     } else {
  //       alert("Error generating audio descriptions");
  //     }
  //   } catch (error) {
  //     alert("Error connecting to backend");
  //   }
  // };

  // const handleEncodeVideo = async () => {
  //   if (!uploadedVideo || videoDescriptions.length === 0) {
  //     alert("Please process a video and ensure descriptions are available.");
  //     return;
  //   }

  //   const descriptions = videoDescriptions.map((item) => item.description);
  //   const timestamps = videoDescriptions.map((item) => [
  //     item.startTime,
  //     item.endTime,
  //   ]);

  //   const jsonPayload = {
  //     video_filename: uploadedVideo.name,
  //     scenes: videoDescriptions.map((item) => ({
  //       scene_id: item.videoUrl.split("/").pop()?.split(".")[0],
  //       description: item.description,
  //       timestamp: [item.startTime, item.endTime],
  //       audio_file: item.audioFile,
  //     })),
  //   };

  //   try {
  //     const encodeResponse = await fetch(
  //       "http://localhost:5000/encode-final-video",
  //       {
  //         method: "POST",
  //         headers: {
  //           "Content-Type": "application/json",
  //         },
  //         body: JSON.stringify(jsonPayload),
  //       }
  //     );

  //     if (encodeResponse.ok) {
  //       const result = await encodeResponse.json();
  //       const downloadUrl = `http://localhost:5000${result.output_video_url}`;

  //       const link = document.createElement("a");
  //       link.href = downloadUrl;
  //       link.download = result.output_video_url.split("/").pop();
  //       link.click();
  //     } else {
  //       alert("Error encoding video with subtitles");
  //     }
  //   } catch (error) {
  //     alert("Error connecting to backend");
  //   }
  // };

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

  //   const resetAppState = () => {
  //     if (audio) {
  //       audio.pause();
  //       audio.currentTime = 0;
  //     }
  //     setSpeechActive(false);
  //     setVideoDescriptions([]);
  //     setUploadedVideo(null);
  //     setCombinedDescriptions("");
  //     setAudio(null);
  //   };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-700 to-indigo-600 flex flex-col">
      <main className="flex-grow h-screen overflow-hidden">
        <TranscriptionEditor3
          videoDescriptions={videoDescriptions}
          onDescriptionChange={setVideoDescriptions}
          uploadedVideo={uploadedVideo}
          onProcessVideo={handleProcessVideo}
          setUploadedVideo={setUploadedVideo}
          handleEncodeVideo={function (): void {
            throw new Error("Function not implemented.");
          }}
          toggleAudioDescription={toggleAudioDescription}
          handleAnalyzeVideo={handleProcessVideo}
          handleReanalyzeVideo={function (): void {
            throw new Error("Function not implemented.");
          }}
          // handleRegenerateAudio={function (): void {
          //   throw new Error("Function not implemented.");
          // }}
          handleRegenerateAudio={handleRegenerateAudio}
        />
        {/* <div className="mt-4 flex flex-col items-start gap-2">
          <button
            onClick={handleSave}
            className="bg-yellow-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-yellow-500 transition-all"
          >
            <Save size={20} /> Save Descriptions
          </button>
          <button
            onClick={toggleAudioDescription}
            className={`${
              speechActive ? "bg-red-500" : "bg-green-400"
            } text-indigo-900 px-6 py-3 rounded-md shadow-md hover:transition-all flex items-center gap-2`}
          >
            {speechActive ? (
              <>
                <Pause size={20} /> Stop Audio
              </>
            ) : (
              <>
                <Play size={20} /> Play Audio
              </>
            )}
          </button>
          <button
            // onClick={handleAudioRequest}
            className="bg-blue-400 text-indigo-900 px-6 py-3 rounded-md shadow-md hover:bg-blue-500 transition-all"
          >
            Generate Audio Files
          </button>
        </div> */}
      </main>
    </div>
  );
};

export default Workspace3;
