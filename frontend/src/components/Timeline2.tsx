import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";

interface TimelineVisualizerProps {
  videoDescriptions: VideoDescriptionItem[];
  currentTime: number;
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  onTimeUpdate?: (time: number) => void;
  visualizer?: React.ReactNode;
  isPlaying: boolean;
}

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  audioFile?: string;
}

interface TimelineElement {
  audioFile: any;
  id: number;
  text: string;
  position: number;
  width: number;
  startTime: string;
  endTime: string;
}

interface ContainerElement {
  id: number;
  startPosition: number;
  width: number;
  element: TimelineElement;
}

const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({
  videoDescriptions,
  currentTime,
  onDescriptionChange,
  onTimeUpdate,
  visualizer,
  isPlaying,
}) => {
  const [elements, setElements] = useState<TimelineElement[]>([]);
  const [containers, setContainers] = useState<ContainerElement[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const resizingRef = useRef(false);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const [volume, setVolume] = useState(1); // State to store the volume level

  const timeToPixels = (timeStr: string): number => {
    const [hours = "0", minutes = "0", seconds = "0"] = timeStr.split(":");
    const totalSeconds =
      parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
    return totalSeconds * 100;
  };

  const pixelsToTime = (pixels: number): string => {
    const totalSeconds = pixels / 100;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toFixed(3);
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.padStart(
      6,
      "0"
    )}`;
  };

  // Function to update the volume of all audio elements
  const updateAudioVolume = (newVolume: number) => {
    setVolume(newVolume);
    Object.values(audioRef.current).forEach((audio) => {
      if (audio) {
        audio.volume = newVolume;
      }
    });
  };

  // Add the volume control slider
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    updateAudioVolume(newVolume);
  };

  const updateContainers = (updatedElements: TimelineElement[]) => {
    const sortedElements = [...updatedElements].sort(
      (a, b) => a.position - b.position
    );

    const newContainers = sortedElements.map((element, index) => {
      if (element.text === "TALKING") {
        return {
          id: element.id,
          startPosition: element.position,
          width: element.width,
          element: element,
        };
      }

      const previousElement =
        index > 0 && sortedElements[index - 1].text !== "TALKING"
          ? sortedElements[index - 1]
          : null;

      const containerStart =
        previousElement && previousElement.text !== "TALKING"
          ? previousElement.position + previousElement.width
          : element.position;

      const nextElement =
        index < sortedElements.length - 1 &&
        sortedElements[index + 1].text !== "TALKING"
          ? sortedElements[index + 1]
          : null;

      const containerWidth = nextElement
        ? nextElement.position - containerStart
        : timelineWidth - containerStart;

      return {
        id: element.id,
        startPosition: containerStart,
        width: containerWidth,
        element: element,
      };
    });

    setContainers(newContainers);
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      e.preventDefault();
      timelineRef.current.scrollLeft += e.deltaY;
    }
  };

  // Add new scene functionality
  const addNewScene = () => {
    const currentPosition = currentTime * 100;

    // Create the new scene
    const newSceneElement: TimelineElement = {
      id: 0, // Temporary ID, will be reassigned after sorting
      text: "New Scene",
      position: currentPosition,
      width: 100, // Default width
      startTime: pixelsToTime(currentPosition),
      endTime: pixelsToTime(currentPosition + 100),
      audioFile: undefined,
    };

    setElements((prev) => {
      const updatedElements = [...prev, newSceneElement].sort(
        (a, b) => a.position - b.position
      );

      // Reassign IDs based on new order
      const reassignedElements = updatedElements.map((el, index) => ({
        ...el,
        id: index + 1, // IDs start from 1
      }));

      // Update video descriptions in the correct order
      const updatedDescriptions = reassignedElements.map((el) => ({
        startTime: el.startTime,
        endTime: el.endTime,
        description: el.text,
        videoUrl: "", // Default or placeholder URL
      }));

      onDescriptionChange(updatedDescriptions);

      return reassignedElements;
    });
  };

  // Handle elements and containers based on video descriptions
  useEffect(() => {
    if (videoDescriptions.length > 0) {
      const maxEndTime = Math.max(
        ...videoDescriptions.map((desc) => timeToPixels(desc.endTime))
      );
      setTimelineWidth(maxEndTime);
    } else {
      setTimelineWidth(window.innerWidth);
    }
  }, [videoDescriptions]);

  useEffect(() => {
    const newElements = videoDescriptions.map((desc, index) => ({
      id: index + 1,
      text: desc.description,
      position: timeToPixels(desc.startTime),
      width: timeToPixels(desc.endTime) - timeToPixels(desc.startTime),
      startTime: desc.startTime,
      endTime: desc.endTime,
      audioFile: desc.audioFile || undefined, // Ensure `audioFile` is included
    }));

    setElements(newElements);
    updateContainers(newElements);
  }, [videoDescriptions, timelineWidth]);

  // Handle drag stop to update elements
  const handleDragStop = (elementId: number, newPosition: number) => {
    if (resizingRef.current) return;
    setIsDragging(false);

    const newElements = elements.map((el) => {
      if (el.id === elementId) {
        const newStartTime = pixelsToTime(newPosition);
        const endPosition = newPosition + el.width;
        const newEndTime = pixelsToTime(endPosition);
        return {
          ...el,
          position: newPosition,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }
      return el;
    });

    setElements(newElements);
    updateContainers(newElements);

    const updatedDescriptions = newElements.map((el) => ({
      startTime: el.startTime,
      endTime: el.endTime,
      description: el.text,
      audioFile: el.audioFile,
    }));

    onDescriptionChange(updatedDescriptions);
  };

  // Handle resize for elements
  const handleResize = (elementId: number, delta: number) => {
    if (isDragging) return;

    setElements((prevElements) => {
      const currentElement = prevElements.find((e) => e.id === elementId);
      if (!currentElement) return prevElements;

      const nextElement = [...prevElements]
        .sort((a, b) => a.position - b.position)
        .find((e) => e.position > currentElement.position);

      const maxWidth = nextElement
        ? nextElement.position - currentElement.position
        : timelineWidth - currentElement.position;

      const newWidth = Math.min(
        Math.max(50, currentElement.width + delta),
        maxWidth
      );

      const newElements = prevElements.map((el) => {
        if (el.id === elementId) {
          const newEndTime = pixelsToTime(el.position + newWidth);
          return { ...el, width: newWidth, endTime: newEndTime };
        }
        return el;
      });

      updateContainers(newElements);

      const updatedDescriptions = newElements.map((el) => ({
        startTime: el.startTime,
        endTime: el.endTime,
        description: el.text,
        audioFile: el.audioFile,
      }));

      onDescriptionChange(updatedDescriptions);

      return newElements;
    });
  };

  // const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
  //   if (!timelineRef.current || !onTimeUpdate) return;

  //   const rect = timelineRef.current.getBoundingClientRect();
  //   const scrollLeft = timelineRef.current.scrollLeft;
  //   const x = e.clientX - rect.left + scrollLeft;

  //   const newTime = x / 100;
  //   onTimeUpdate(newTime);
  // };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onTimeUpdate) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;

    const newTime = x / 100;

    // Check if the new time is above a draggable element
    for (const container of containers) {
      const startSeconds = timeToPixels(container.element.startTime) / 100;
      const endSeconds = timeToPixels(container.element.endTime) / 100;

      if (newTime >= startSeconds && newTime < endSeconds) {
        const audio = audioRef.current[container.id];
        if (audio) {
          const audioOffset = newTime - startSeconds;
          if (audioOffset < audio.duration) {
            audio.currentTime = audioOffset;
            console.log(`Audio for ID ${container.id} set to ${audioOffset}`);
          } else {
            console.warn(
              `Audio offset (${audioOffset}) exceeds duration (${audio.duration})`
            );
          }
        }
        break;
      }
    }

    // Update the timeline's current time
    onTimeUpdate(newTime);
  };

  useEffect(() => {
    containers.forEach(({ id, element }) => {
      const audio = audioRef.current[id];
      if (!audio || !element.audioFile) return;

      const startSeconds = timeToPixels(element.startTime) / 100;
      const endSeconds = timeToPixels(element.endTime) / 100;

      if (currentTime >= startSeconds && currentTime < endSeconds) {
        console.log("currentTime", audio.currentTime);
        let audioOffset = currentTime - startSeconds;
        audioOffset = Number(audioOffset.toFixed(6)); // Limit to 6 decimal places
        console.log("audioOffset", audioOffset);
        // audio.currentTime = audioOffset;

        // Rest of the code remains the same
        if (isPlaying && audio.paused) {
          console.log(
            `Playing audio for ID: ${id}, File: ${element.audioFile}`
          );
          audio
            .play()
            .catch((error) => console.error("Audio playback error:", error));
        } else if (!isPlaying && !audio.paused) {
          console.log(
            `Pausing audio for ID: ${id}, File: ${element.audioFile}`
          );
          audio.pause();
        }
      } else {
        audio.pause();
      }
    });
  }, [currentTime, containers, isPlaying]);

  return (
    <div>
      {" "}
      {/* Volume Slider */}
      <div className="absolute top-2 left-0 w-full px-4">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-full"
        />
      </div>
      <div
        className="relative h-40 bg-gray-800 overflow-hidden"
        ref={timelineRef}
        onWheel={handleWheel}
        style={{ cursor: "grab", width: "100%" }}
      >
        <button
          className="absolute z-20 bg-green-600 text-white rounded-full p-2 shadow-lg hover:bg-green-700 transition"
          style={{
            left: `${currentTime * 100 - 16}px`,
            top: "-24px",
          }}
          onClick={addNewScene}
        >
          +
        </button>
        <div
          className="relative h-full"
          style={{ width: `${timelineWidth}px` }}
        >
          <div className="absolute inset-0" onClick={handleTimelineClick} />

          {/* Time markers */}
          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
            {Array.from({ length: Math.ceil(timelineWidth / 100) }).map(
              (_, index) => (
                <div
                  key={index}
                  className="absolute h-full border-l border-gray-500"
                  style={{ left: `${index * 100}px` }}
                >
                  <span className="text-gray-400 text-xs absolute top-1">
                    {pixelsToTime(index * 100)}
                  </span>
                </div>
              )
            )}

            {/* Red bar for current time */}
            <div
              className="absolute h-full w-0.5 bg-red-500 z-10"
              style={{ left: `${currentTime * 100}px` }}
            />
          </div>
          {/* Containers and draggable elements */}
          {containers.map(({ id, startPosition, width, element }) => (
            <div
              key={id}
              className="absolute inset-y-0 my-auto h-16"
              style={{
                left: `${startPosition}px`,
                width: `${width}px`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {element.text === "TALKING" ? (
                // Fixed red translucent container for "TALKING" elements
                <div
                  className="h-16 bg-red-500 bg-opacity-50 border border-red-700 rounded-lg flex items-center justify-center"
                  style={{ width: `${element.width}px` }}
                >
                  <span className="text-white font-bold text-sm">TALKING</span>
                </div>
              ) : (
                // Draggable container for other elements
                <Draggable
                  axis="x"
                  bounds="parent"
                  position={{ x: element.position - startPosition, y: 0 }}
                  onStart={() => setIsDragging(true)}
                  onStop={(_, data) =>
                    handleDragStop(id, data.x + startPosition)
                  }
                  disabled={resizingRef.current}
                >
                  <div
                    className="h-16 bg-gray-700 border border-gray-600 rounded-lg flex items-center cursor-grab"
                    style={{ width: `${element.width}px` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="bg-green-600 text-white text-xs font-bold px-2 py-1">
                      {id}
                    </div>
                    <div className="text-gray-200 text-sm px-2 truncate">
                      {element.text}
                    </div>

                    {/* Hidden Audio Player for Each Element */}
                    <audio
                      ref={(el) => (audioRef.current[id] = el)}
                      src={`http://localhost:5000/${element.audioFile}`}
                      preload="auto"
                    />
                    <div
                      className="timelineSentenceHandle"
                      style={{
                        position: "absolute",
                        width: "9px",
                        height: "100%",
                        left: `${element.width - 9}px`,
                        cursor: "col-resize",
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        resizingRef.current = true;
                        let startX = e.clientX;

                        const onMouseMove = (moveEvent: MouseEvent) => {
                          const delta = moveEvent.clientX - startX;
                          handleResize(id, delta);
                          startX = moveEvent.clientX;
                        };

                        const onMouseUp = () => {
                          resizingRef.current = false;
                          document.removeEventListener(
                            "mousemove",
                            onMouseMove
                          );
                          document.removeEventListener("mouseup", onMouseUp);
                        };

                        document.addEventListener("mousemove", onMouseMove);
                        document.addEventListener("mouseup", onMouseUp);
                      }}
                    >
                      <div
                        className="timelineResizeHandle"
                        style={{
                          textAlign: "center",
                          userSelect: "none",
                        }}
                      >
                        ☰
                      </div>
                    </div>
                  </div>
                </Draggable>
              )}
            </div>
          ))}
        </div>
        {visualizer && (
          <div className="absolute bottom-0 left-0 right-0 bg-black">
            {visualizer}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineVisualizer;
