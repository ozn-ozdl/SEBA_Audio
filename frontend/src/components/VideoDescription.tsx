import { produce } from "immer";
import React, { useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
 
interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}
 
interface Props {
  videoDescriptions: VideoDescriptionItem[];
  setVideoDescriptions: React.Dispatch<
    React.SetStateAction<VideoDescriptionItem[]>
  >;
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  name: string;
}
 
const VideoDescription: React.FC<Props> = ({
  videoDescriptions,
  setVideoDescriptions,
  onDescriptionChange,
  name,
}) => {
  const [editableDescriptions, setEditableDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);
  const [playingIndex, setPlayingIndex] = useState<number | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
 
  useEffect(() => {
    setEditableDescriptions(videoDescriptions);
  }, [videoDescriptions]);
 
  const handleDescriptionChange = (index: number, newDescription: string) => {
    const updatedDescriptions = [...editableDescriptions];
    updatedDescriptions[index].description = newDescription;
    setEditableDescriptions(updatedDescriptions);
 
    onDescriptionChange(updatedDescriptions);
    setVideoDescriptions(
      produce((draft) => {
        draft[index].description = newDescription;
      })
    );
  };
 
  const toggleAudio = async (index: number, description: string) => {
    if (playingIndex === index && audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      setPlayingIndex(null);
    } else {
      try {
        const sceneName = `Project ${name} - Scene ${index + 1} - ${videoDescriptions[index].startTime} to ${videoDescriptions[index].endTime}`;
        
        const response = await fetch("http://localhost:5000/text-to-speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: description,
            scene_name: sceneName,
          }),
        });
 
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const newAudio = new Audio(audioUrl);
  
          setAudio(newAudio);
          setPlayingIndex(index);
 
          newAudio.play();
          newAudio.onended = () => {
            setPlayingIndex(null);
            setAudio(null);
          };
        } else {
          alert("Error generating audio");
        }
      } catch (error) {
        alert("Error connecting to backend");
      }
    }
  };

  const toggleAudioWithSpeed = async (index: number, description: string) => {
    if (playingIndex === index && audio) {
      audio.pause();
      audio.currentTime = 0;
      setAudio(null);
      setPlayingIndex(null);
    } else {
      try {
        const sceneName = `SpeedAudio Project ${name} - Scene ${index + 1} - ${videoDescriptions[index].startTime} to ${videoDescriptions[index].endTime}`;
        
        const timestamps = [
          videoDescriptions[index].startTime,
          videoDescriptions[index].endTime,
        ];

        console.log("Request Payload:", {
          text: description,
          scene_name: sceneName,
          timestamps,
        });
  
        const response = await fetch("http://localhost:5000/text-to-speech-speed", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: description,
            scene_name: sceneName,
            timestamps,
          }),
        });
  
        if (response.ok) {
          const audioBlob = await response.blob();
          const audioUrl = URL.createObjectURL(audioBlob);
          const newAudio = new Audio(audioUrl);
  
          setAudio(newAudio);
          setPlayingIndex(index);
  
          newAudio.play();
          newAudio.onended = () => {
            setPlayingIndex(null);
            setAudio(null);
          };
        } else {
          alert("Error generating audio");
        }
      } catch (error) {
        alert("Error connecting to backend");
      }
    }
  };
  
  return (
    <div className="space-y-4">
      {videoDescriptions.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No descriptions available. Process a video to get started.
        </p>
      ) : (
        <ul className="space-y-4">
          {videoDescriptions.map((item, index) => (
            <li
              key={index}
              className="border bg-gray-100 p-4 rounded-lg shadow-sm"
            >
              <p className="font-semibold">
                Scene {index + 1}: {item.startTime} - {item.endTime}
              </p>
              <textarea
                value={item.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="w-full mt-2 p-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />
 
              <div className="flex justify-between items-center mt-2">
                <a
                  href={item.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline text-sm"
                >
                  View Scene
                </a>
                <button
                  onClick={() => toggleAudioWithSpeed(index, item.description)}
                  className={`${
                    playingIndex === index
                      ? "bg-red-500 text-white"
                      : "bg-green-500 text-white"
                  } px-4 py-2 rounded-md flex items-center space-x-2`}
                >
                  {playingIndex === index ? (
                    <>
                      <Pause size={16} /> <span>Stop Audio</span>
                    </>
                  ) : (
                    <>
                      <Play size={16} /> <span>Play Audio</span>
                    </>
                  )}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
 
export default VideoDescription;
