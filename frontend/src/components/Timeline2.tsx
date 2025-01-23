import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";

interface TimelineVisualizerProps {
  videoDescriptions: VideoDescriptionItem[];
  currentTime: number;
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  onTimeUpdate?: (time: number) => void;
  visualizer?: React.ReactNode;
  isPlaying: boolean;
  videoduration: number;
  audioVolume: number;
}

interface VideoDescriptionItem {
  startTime: number;
  endTime: number;
  description: string;
  audioFile?: string;
}

interface AudioDurations {
  [key: number]: number;
}

interface TimelineElement {
  audioFile: any;
  id: number;
  text: string;
  position: number;
  width: number;
  startTime: number;
  endTime: number;
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
  videoduration,
  audioVolume,
}) => {
  const [elements, setElements] = useState<TimelineElement[]>([]);
  const [containers, setContainers] = useState<ContainerElement[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const resizingRef = useRef(false);
  const audioRef = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const [volume, setVolume] = useState(1);
  const [scrollPosition, setScrollPosition] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const [audioDurations, setAudioDurations] = useState<AudioDurations>({});

  const pixelsToTime = (pixels: number): string => {
    const totalMs = pixels * 10; // 1 pixel = 10ms
    const hours = Math.floor(totalMs / 3600000);
    const minutes = Math.floor((totalMs % 3600000) / 60000);
    const seconds = Math.floor((totalMs % 60000) / 1000);
    const milliseconds = totalMs % 1000;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds
      .toString()
      .padStart(3, "0")}`;
  };

  useEffect(() => {
    const updateContainerSize = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.offsetWidth);
      }
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, []);

  const updateAudioVolume = (newVolume: number) => {
    setVolume(newVolume);
    Object.values(audioRef.current).forEach((audio) => {
      if (audio) {
        audio.volume = newVolume;
      }
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    updateAudioVolume(newVolume);
  };

  useEffect(() => {
    updateAudioVolume(audioVolume);
  }, [audioVolume]);

  // const updateContainers = (updatedElements: TimelineElement[]) => {
  //   const sortedElements = [...updatedElements].sort(
  //     (a, b) => a.position - b.position
  //   );

  //   const newContainers = sortedElements.map((element, index) => {
  //     if (element.text === "TALKING") {
  //       return {
  //         id: element.id,
  //         startPosition: element.position,
  //         width: element.width,
  //         element: element,
  //       };
  //     }

  //     const previousElement =
  //       index > 0 && sortedElements[index - 1].text !== "TALKING"
  //         ? sortedElements[index - 1]
  //         : null;

  //     const containerStart =
  //       previousElement && previousElement.text !== "TALKING"
  //         ? previousElement.position + previousElement.width
  //         : element.position;

  //     const nextElement =
  //       index < sortedElements.length - 1 &&
  //       sortedElements[index + 1].text !== "TALKING"
  //         ? sortedElements[index + 1]
  //         : null;

  //     const containerWidth = nextElement
  //       ? nextElement.position - containerStart
  //       : timelineWidth - containerStart;

  //     return {
  //       id: element.id,
  //       startPosition: containerStart,
  //       width: containerWidth,
  //       element: element,
  //     };
  //   });

  //   setContainers(newContainers);
  // };

  const updateContainers = (updatedElements: TimelineElement[]) => {
    const sortedElements = [...updatedElements].sort(
      (a, b) => a.position - b.position
    );
  
    const newContainers = sortedElements.map((element, index) => {
      if (element.text === "TALKING") {
        // TALKING elements are fixed and act as boundaries
        return {
          id: element.id,
          startPosition: element.position,
          width: element.width,
          element: element,
        };
      }
  
      // Find the previous boundary (end position of the previous element)
      let prevBoundary = 0; // Default to 0 if no previous element exists
      for (let i = index - 1; i >= 0; i--) {
        const prevElement = sortedElements[i];
        // Use the end position of the previous element as the boundary
        prevBoundary = prevElement.position + prevElement.width;
        break; // Stop after finding the first previous element
      }
  
      // Find the next boundary (start position of the next element)
      let nextBoundary = timelineWidth; // Default to timeline width if no next element exists
      for (let i = index + 1; i < sortedElements.length; i++) {
        const nextElement = sortedElements[i];
        // Use the start position of the next element as the boundary
        nextBoundary = nextElement.position;
        break; // Stop after finding the first next element
      }
  
      // Calculate the container start and width
      const containerStart = Math.min(prevBoundary, element.position); // Ensure the container doesn't overlap with the previous element
      const containerWidth = nextBoundary - containerStart; // Ensure the container doesn't overlap with the next element
  
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

  useEffect(() => {
    elements.forEach((element) => {
      const updatedElement = videoDescriptions.find(
        (desc) => desc.description === element.text
      );
      if (updatedElement && updatedElement.audioFile !== element.audioFile) {
        const audio = audioRef.current[element.id];
        if (audio) {
          audio.src = `http://localhost:5000/${updatedElement.audioFile}`;
          audio.load();
          element.audioFile = updatedElement.audioFile;
        }
      }
    });
  }, [videoDescriptions, elements]);

  const addNewScene = () => {
    const currentPosition = currentTime * 100;

    const newSceneElement: TimelineElement = {
      id: 0,
      text: "New Scene",
      position: currentPosition,
      width: 100,
      startTime: currentTime,
      endTime: currentTime + 1,
      audioFile: undefined,
    };

    setElements((prev) => {
      const updatedElements = [...prev, newSceneElement].sort(
        (a, b) => a.position - b.position
      );

      const reassignedElements = updatedElements.map((el, index) => ({
        ...el,
        id: index + 1,
      }));

      const updatedDescriptions = reassignedElements.map((el) => ({
        startTime: el.startTime,
        endTime: el.endTime,
        description: el.text,
        videoUrl: "",
      }));

      onDescriptionChange(updatedDescriptions);

      return reassignedElements;
    });
  };

  useEffect(() => {
    setTimelineWidth(videoduration * 100);
  }, [videoduration]);

  useEffect(() => {
    const newElements = videoDescriptions.map((desc, index) => ({
      id: index + 1,
      text: desc.description,
      position: desc.startTime / 10, // Convert ms to pixels (1px = 10ms)
      width: (desc.endTime - desc.startTime) / 10, // Convert duration in ms to pixels
      startTime: desc.startTime,
      endTime: desc.endTime,
      audioFile: desc.audioFile || undefined,
    }));

    setElements(newElements);
    updateContainers(newElements);
  }, [videoDescriptions, timelineWidth]);

  const handleDragStop = (elementId: number, newPosition: number) => {
    if (resizingRef.current) return;
    setIsDragging(false);

    const newElements = elements.map((el) => {
      if (el.id === elementId) {
        const newStartTime = newPosition * 10; // Convert pixels to ms
        const endPosition = newPosition + el.width;
        const newEndTime = endPosition * 10; // Convert pixels to ms

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
          const newEndTime = (el.position + newWidth) * 10; // Convert pixels to ms
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

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onTimeUpdate) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;

    const newTime = x / 100;

    for (const container of containers) {
      const startSeconds = container.element.startTime;
      const endSeconds = container.element.endTime;

      if (newTime >= startSeconds && newTime < endSeconds) {
        const audio = audioRef.current[container.id];
        if (audio) {
          const audioOffset = newTime - startSeconds;
          if (audioOffset < audio.duration) {
            audio.currentTime = audioOffset;
          } else {
            console.warn(
              `Audio offset (${audioOffset}) exceeds duration (${audio.duration})`
            );
          }
        }
        break;
      }
    }

    onTimeUpdate(newTime);
  };

  useEffect(() => {
    elements.forEach((element) => {
      const audio = audioRef.current[element.id];
      if (!audio || !element.audioFile) return;

      const elementStartTime = element.startTime;
      const elementEndTime = element.endTime;

      if (currentTime >= elementStartTime && currentTime < elementEndTime) {
        const audioOffset = currentTime - elementStartTime;

        if (audio.paused && isPlaying) {
          audio.currentTime = audioOffset;
          const timeRemaining = Math.min(
            audio.duration - audioOffset,
            elementEndTime - currentTime
          );

          audio
            .play()
            .then(() => {
              setTimeout(() => {
                if (!audio.paused) {
                  audio.pause();
                }
              }, timeRemaining * 1000);
            })
            .catch((error) => console.error("Audio playback error:", error));
        }
      } else if (!audio.paused) {
        audio.pause();
      }
    });
  }, [currentTime, elements, isPlaying]);

  const handleAudioMetadata = (id: number, duration: number) => {
    setAudioDurations((prev) => ({ ...prev, [id]: duration }));
  };

  useEffect(() => {
    if (!timelineRef.current) return;

    const redBarPosition = currentTime * 100;
    const scrollLeft = timelineRef.current.scrollLeft;
    const visibleStart = scrollLeft;
    const visibleEnd = scrollLeft + containerWidth;

    if (redBarPosition < visibleStart || redBarPosition > visibleEnd - 50) {
      timelineRef.current.scrollTo({
        left: redBarPosition - containerWidth / 2,
        behavior: "smooth",
      });
    }
  }, [currentTime, containerWidth]);

  return (
    <div>
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
                    className="h-16 bg-gray-700 border border-gray-600 rounded-lg flex items-center cursor-grab relative"
                    style={{ width: `${element.width}px` }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Add duration bar at the bottom */}
                    {element.audioFile && audioDurations[id] && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500">
                        <div
                          className="h-full bg-green-500"
                          style={{
                            width: `${Math.min(
                              (audioDurations[id] * 100) /
                                (element.width / 100),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    )}
                    <div className="bg-green-600 text-white text-xs font-bold px-2 py-1">
                      {id}
                    </div>
                    <div className="text-gray-200 text-sm px-2 truncate">
                      {element.text}
                    </div>

                    {/* Hidden Audio Player for Each Element */}
                    <audio
                      ref={(el) => {
                        audioRef.current[id] = el;
                        if (el && element.audioFile) {
                          el.onloadedmetadata = () => {
                            if (el) handleAudioMetadata(id, el.duration);
                          };
                        }
                      }}
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
