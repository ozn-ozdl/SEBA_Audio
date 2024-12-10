import React, { useEffect, useState } from "react";
import { Textarea } from "./ui/textarea";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

interface Props {
  videoDescriptions: VideoDescriptionItem[];
}

export const VideoDescription: React.FC<Props> = ({ videoDescriptions }) => {
  const [combinedDescriptions, setCombinedDescriptions] = useState("");

  useEffect(() => {
    // Collect all descriptions into an array and combine them.
    const descriptionsArray = videoDescriptions.map((item) => item.description);
    const combinedText = descriptionsArray.join(" ");
    setCombinedDescriptions(combinedText);

    // Log the combined descriptions.
    console.log(combinedText);
  }, [videoDescriptions]);

  const handleAudioDescriptionClick = () => {
    if (!combinedDescriptions) {
      console.error("No text to convert to speech.");
      return;
    }
  
    const speech = new SpeechSynthesisUtterance(combinedDescriptions);
  
    speech.lang = "en-US";
    speech.rate = 1; 
    speech.pitch = 1; 

    speechSynthesis.speak(speech);
  
    console.log("Playing audio description.");
  };

  // const handleAudioDescriptionClick = async () => {
  //   try {
  //     const response = await fetch("http://localhost:5000/text_to_speech", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({ text: combinedDescriptions }),
  //     });
  
  //     if (!response.ok) {
  //       throw new Error("Failed to generate audio description");
  //     }
  
  //     // Create a blob from the response
  //     const blob = await response.blob();
  
  //     // Generate a URL for the blob
  //     const audioUrl = URL.createObjectURL(blob);
  
  //     // Play the audio
  //     const audio = new Audio(audioUrl);
  //     audio.play();
  
  //     console.log("Audio description played successfully");
  //   } catch (error) {
  //     console.error("Error playing audio description:", error);
  //   }
  // };
  
  return (
    <div className="h-[calc(100vh-160px)] overflow-y-auto bg-bg-primary rounded shadow-lg border border-gray-700 p-4">
      {videoDescriptions.length > 0 ? (
        videoDescriptions.map((item, index) => (
          <div
            key={index}
            className="relative flex items-center justify-between py-6 border-b border-gray-600"
          >
            <div className="absolute top-4 bg-bg-secondary text-white text-xs font-bold px-2 py-1 rounded">
              {index + 1}
            </div>

            <div className="w-1/5 text-sm text-text-primary">
              <p>{item.startTime}</p>
              <p>{item.endTime}</p>
            </div>

            <div className="w-3/5 px-4">
              <div className="bg-bg-secondary text-sm text-text-primary rounded border border-gray-700">
                <Textarea
                  className="h-24"
                  placeholder={
                    "Here will be your video description of the certain scene."
                  }
                  value={item.description}
                  id="index"
                ></Textarea>
              </div>
            </div>
            <div className="w-1/5">
              <video
                src={item.videoUrl}
                controls
                className="w-full h-auto rounded"
              ></video>{" "}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-400">No descriptions available.</p>
        </div>
      )}
      <div className="text-center mt-4">
      {videoDescriptions.every(
          (item) => item.description !== "This is a video description."
        ) && (
        <button
          onClick={handleAudioDescriptionClick}
          className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Audio Description
        </button>
        )}
      </div>
    </div>
  );
};