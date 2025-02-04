import { AudioLines, Pencil } from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import { VideoDescriptionItem } from "src/types";

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
  isEdited: boolean; // Added isEdited flag
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

  // useEffect(() => {
  //   const updateContainerSize = () => {
  //     if (timelineRef.current) {
  //       setContainerWidth(timelineRef.current.offsetWidth);
  //     }
  //   };

  //   updateContainerSize();
  //   window.addEventListener("resize", updateContainerSize);
  //   return () => window.removeEventListener("resize", updateContainerSize);
  // }, []);

  useEffect(() => {
    const updateContainerSize = () => {
      if (timelineRef.current) {
        setContainerWidth(timelineRef.current.offsetWidth);
        updateContainers(elements); // Update containers on resize
      }
    };

    updateContainerSize();
    window.addEventListener("resize", updateContainerSize);
    return () => window.removeEventListener("resize", updateContainerSize);
  }, [elements]); // Add elements as a dependency

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

      let prevBoundary = 0;
      for (let i = index - 1; i >= 0; i--) {
        const prevElement = sortedElements[i];
        prevBoundary = prevElement.position + prevElement.width;
        break;
      }

      let nextBoundary = timelineWidth;
      for (let i = index + 1; i < sortedElements.length; i++) {
        const nextElement = sortedElements[i];
        nextBoundary = nextElement.position;
        break;
      }

      const containerStart = Math.min(prevBoundary, element.position);
      const containerWidth = nextBoundary - containerStart;

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

  // const addNewScene = () => {
  //   const currentTimeMs = currentTime * 1000; // Convert currentTime (seconds) to milliseconds
  //   const minWidthPixels = 50; // Minimum width in pixels (500ms)

  //   const newSceneElement: TimelineElement = {
  //     id: 0,
  //     text: "New Scene",
  //     position: currentTimeMs / 10, // Convert ms to pixels (1px = 10ms)
  //     width: minWidthPixels,
  //     startTime: currentTimeMs,
  //     endTime: currentTimeMs + minWidthPixels * 10, // Convert width to duration in ms
  //     audioFile: undefined,
  //   };

  //   setElements((prev) => {
  //     const updatedElements = [...prev, newSceneElement].sort(
  //       (a, b) => a.position - b.position
  //     );

  //     const reassignedElements = updatedElements.map((el, index) => ({
  //       ...el,
  //       id: index + 1,
  //     }));

  //     const updatedDescriptions = reassignedElements.map((el) => ({
  //       startTime: el.startTime,
  //       endTime: el.endTime,
  //       description: el.text,
  //       audioFile: el.audioFile,
  //     }));

  //     onDescriptionChange(updatedDescriptions);
  //     return reassignedElements;
  //   });
  // };

  const addNewScene = () => {
    const currentTimeMs = currentTime * 1000; // Convert to milliseconds
    const currentPosition = currentTimeMs / 10; // Convert to pixels (1px = 10ms)

    // Prevent adding if current time overlaps any existing element
    const hasOverlap = elements.some(
      (el) => currentTimeMs >= el.startTime && currentTimeMs < el.endTime
    );
    if (hasOverlap) return;

    // Find surrounding elements
    const sortedElements = [...elements].sort(
      (a, b) => a.position - b.position
    );

    // Find first element that starts after current position
    const nextElement = sortedElements.find(
      (el) => el.position > currentPosition
    );
    // Find last element that ends before current position
    const previousElements = sortedElements.filter(
      (el) => el.position + el.width <= currentPosition
    );
    const previousElement = previousElements[previousElements.length - 1];

    // Calculate available space
    const previousEnd = previousElement
      ? previousElement.position + previousElement.width
      : 0;
    const nextStart = nextElement ? nextElement.position : timelineWidth;

    // Ensure valid placement and minimum width
    const availableWidth = nextStart - currentPosition;
    if (availableWidth < 50 || currentPosition < previousEnd) return;

    const newSceneElement: TimelineElement = {
      id: 0, // Temporary ID
      text: "New Scene",
      position: currentPosition,
      width: availableWidth, // Fill available space
      startTime: currentTimeMs,
      endTime: currentTimeMs + availableWidth * 10,
      audioFile: undefined,
      isEdited: false, // Default to false
    };

    setElements((prev) => {
      const updatedElements = [...prev, newSceneElement].sort(
        (a, b) => a.position - b.position
      );

      // Reassign sequential IDs
      const reassignedElements = updatedElements.map((el, index) => ({
        ...el,
        id: index + 1,
      }));

      // Update parent component
      onDescriptionChange(
        reassignedElements.map((el) => ({
          startTime: el.startTime,
          endTime: el.endTime,
          description: el.text,
          audioFile: el.audioFile,
          isEdited: false,
        }))
      );

      return reassignedElements;
    });
  };

  // useEffect(() => {
  //   setTimelineWidth(videoduration * 100);
  // }, [videoduration]);

  useEffect(() => {
    if (videoduration) {
      setTimelineWidth(videoduration * 100);
    } else {
      setTimelineWidth(window.innerWidth);
    }

    const handleResize = () => {
      if (!videoduration) {
        setTimelineWidth(window.innerWidth);
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [videoduration]);

  // useEffect(() => {
  //   const newElements = videoDescriptions.map((desc, index) => ({
  //     id: index + 1,
  //     text: desc.description,
  //     position: desc.startTime / 10, // Convert ms to pixels (1px = 10ms)
  //     width: (desc.endTime - desc.startTime) / 10, // Convert duration in ms to pixels
  //     startTime: desc.startTime,
  //     endTime: desc.endTime,
  //     audioFile: desc.audioFile || undefined,
  //   }));

  //   setElements(newElements);
  //   updateContainers(newElements);
  // }, [videoDescriptions, timelineWidth]);

  useEffect(() => {
    const newElements = videoDescriptions.map((desc, index) => ({
      id: index + 1,
      text: desc.description,
      position: desc.startTime / 10,
      width: (desc.endTime - desc.startTime) / 10,
      startTime: desc.startTime,
      endTime: desc.endTime,
      audioFile: desc.audioFile || undefined,
      isEdited: desc.isEdited || false, // Map isEdited from props
    }));

    setElements(newElements);
    updateContainers(newElements);
  }, [videoDescriptions, timelineWidth]);

  const handleDrag = (
    elementId: number,
    DraggableEvent: any,
    startPosition: number
  ) => {
    console.log("DraggableEvent", DraggableEvent);
    if (resizingRef.current) return;
    let newPosition = DraggableEvent.x + startPosition;

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
  };

  const handleDragStop = (
    elementId: number,
    DraggableEvent: any,
    startPosition: number
  ) => {
    if (resizingRef.current) return;
    setIsDragging(false);

    let newPosition = DraggableEvent.x + startPosition;
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
      isEdited: el.isEdited,
    }));

    onDescriptionChange(updatedDescriptions);
  };

  // const handleResize = (
  //   elementId: number,
  //   direction: string,
  //   ref: HTMLElement,
  //   delta: { width: number; height: number },
  //   position: { x: number; y: number }
  // ) => {
  //   const container = containers.find((c) => c.id === elementId);
  //   if (!container) return;
  //   console.log("delta", delta);
  //   console.log("position", position);
  //   // Get actual pixel dimensions from the element
  //   const currentWidth = parseFloat(ref.style.width);
  //   const currentLeft = parseFloat(ref.style.left);
  //   // console.log("currentWidth", currentWidth);
  //   // console.log("currentLeft", position["x"]);

  //   // console.log("console startposition", container.startPosition);
  //   // Convert to timeline-absolute coordinates
  //   const absolutePosition = container.startPosition + position["x"];
  //   const absoluteRight = absolutePosition + currentWidth;

  //   // console.log("console absolutePosition", absolutePosition);

  //   // Find neighboring elements
  //   const sortedElements = [...elements].sort(
  //     (a, b) => a.position - b.position
  //   );
  //   const currentIndex = sortedElements.findIndex((e) => e.id === elementId);

  //   // Calculate boundaries
  //   const prevElement = sortedElements[currentIndex - 1];
  //   const nextElement = sortedElements[currentIndex + 1];

  //   const minPosition = prevElement
  //     ? prevElement.position + prevElement.width
  //     : 0;
  //   const maxPosition = nextElement ? nextElement.position : timelineWidth;

  //   // Calculate new dimensions
  //   let newWidth = currentWidth;
  //   let newPosition = absolutePosition;

  //   if (direction === "right") {
  //     newWidth = Math.min(
  //       Math.max(50, absoluteRight - newPosition),
  //       maxPosition - newPosition
  //     );
  //   } else if (direction === "left") {
  //     newPosition = Math.max(minPosition, absolutePosition);
  //     newWidth = Math.min(
  //       Math.max(50, absoluteRight - newPosition),
  //       maxPosition - newPosition
  //     );
  //   }

  //   // Update elements
  //   const newElements = elements.map((el) =>
  //     el.id === elementId
  //       ? {
  //           ...el,
  //           position: newPosition,
  //           width: newWidth,
  //           startTime: newPosition * 10,
  //           endTime: (newPosition + newWidth) * 10,
  //         }
  //       : el
  //   );

  //   setElements(newElements);
  //   updateContainers(newElements); // Update containers in real-time
  // };

  const handleResize = (
    elementId: number,
    direction: string,
    ref: HTMLElement,
    delta: { width: number; height: number },
    position: { x: number; y: number }
  ) => {
    const container = containers.find((c) => c.id === elementId);
    if (!container) return;

    // Get actual pixel dimensions from the element
    const currentWidth = parseFloat(ref.style.width);
    const currentLeft = parseFloat(ref.style.left);

    // Convert to timeline-absolute coordinates
    const absolutePosition = container.startPosition + position["x"];
    const absoluteRight = absolutePosition + currentWidth;

    // Find neighboring elements
    const sortedElements = [...elements].sort(
      (a, b) => a.position - b.position
    );
    const currentIndex = sortedElements.findIndex((e) => e.id === elementId);

    // Calculate boundaries
    const prevElement = sortedElements[currentIndex - 1];
    const nextElement = sortedElements[currentIndex + 1];

    const minPosition = prevElement
      ? prevElement.position + prevElement.width
      : 0;
    const maxPosition = nextElement ? nextElement.position : timelineWidth;

    // Calculate new dimensions
    let newWidth = currentWidth;
    let newPosition = absolutePosition;

    if (direction === "right") {
      newWidth = Math.min(
        Math.max(50, absoluteRight - newPosition),
        maxPosition - newPosition
      );
    } else if (direction === "left") {
      newPosition = Math.max(minPosition, absolutePosition);
      newWidth = Math.min(
        Math.max(50, absoluteRight - newPosition),
        maxPosition - newPosition
      );
    }

    // Update elements
    const newElements = elements.map((el) =>
      el.id === elementId
        ? {
            ...el,
            position: newPosition,
            width: newWidth,
            startTime: newPosition * 10,
            endTime: (newPosition + newWidth) * 10,
          }
        : el
    );

    setElements(newElements);
    updateContainers(newElements); // Update containers in real-time
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onTimeUpdate) return;

    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;

    const newTime = x / 100; // Convert pixels to seconds

    for (const element of elements) {
      const startSeconds = element.startTime / 1000; // Convert ms to seconds
      const endSeconds = element.endTime / 1000; // Convert ms to seconds

      if (newTime >= startSeconds && newTime < endSeconds) {
        const audio = audioRef.current[element.id];
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

      const elementStartTime = element.startTime / 1000; // Convert ms to seconds
      const elementEndTime = element.endTime / 1000; // Convert ms to seconds
      const audioDuration = audioDurations[element.id] || 0;

      if (currentTime >= elementStartTime && currentTime < elementEndTime) {
        const audioOffset = currentTime - elementStartTime;

        if (audioOffset <= audioDuration) {
          if (isPlaying && audio.paused) {
            audio.currentTime = audioOffset;
            audio
              .play()
              .catch((error) => console.error("Audio playback error:", error));
          } else if (!isPlaying && !audio.paused) {
            audio.pause();
          }
        } else {
          audio.pause();
        }
      } else {
        audio.pause();
      }
    });
  }, [currentTime, elements, isPlaying, audioDurations]);

  const handleAudioMetadata = (id: number, duration: number) => {
    setAudioDurations((prev) => ({ ...prev, [id]: duration }));
  };
  useEffect(() => {
    if (!timelineRef.current) return;
    console.log("currentTime", currentTime);
    const barPosition = currentTime * 100;
    const scrollLeft = timelineRef.current.scrollLeft;
    const visibleStart = scrollLeft;
    const visibleEnd = scrollLeft + containerWidth;

    if (barPosition < visibleStart || barPosition > visibleEnd - 50) {
      timelineRef.current.scrollTo({
        left: barPosition - containerWidth / 2,
        behavior: "smooth",
      });
    }
  }, [currentTime, containerWidth]);

  return (
    <div
      className="relative w-full h-40 overflow-hidden backdrop-blur-sm"
      ref={timelineRef}
      onWheel={handleWheel}
      style={{ cursor: "grab" }}
    >
      {/* Add Scene Button */}
      <button
        className="absolute z-30 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-105"
        style={{
          left: `${currentTime * 100 - 16}px`,
          top: "-24px",
          background: "linear-gradient(to right, #14b8a6, #0f766e)",
        }}
        onClick={addNewScene}
      >
        +
      </button>

      {/* Timeline Container */}
      <div className="relative  h-full" style={{ width: `${timelineWidth}px` }}>
        {/* Clickable Background */}
        <div
          className="absolute inset-0"
          onClick={handleTimelineClick}
          style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
        />

        {/* Time Markers */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {Array.from({ length: Math.ceil(timelineWidth / 100) }).map(
            (_, index) => (
              <div
                key={index}
                className="absolute h-full border-l border-gray-700"
                style={{ left: `${index * 100}px` }}
              >
                <span className="text-xs absolute top-1 text-gray-400">
                  {pixelsToTime(index * 100)}
                </span>
              </div>
            )
          )}

          {/* Current Time Indicator */}
          <div
            className="absolute h-full w-0.5 z-10 bg-teal-400"
            style={{ left: `${currentTime * 100}px` }}
          />
        </div>

        {/* Containers and Draggable Elements */}
        {containers.map(({ id, startPosition, width, element }) => (
          <div
            key={id}
            className="absolute flex items-center h-full"
            style={{
              left: startPosition,
              width: width,
              height: "64px", // Maintain consistent height
              top: "50%", // Center vertically
              transform: "translateY(-50%)", // Adjust for exact vertical centering
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {element.text === "TALKING" ? (
              <div className="h-full w-full bg-opacity-40 bg-red-900 rounded-xl border-1 flex items-center justify-center select-none shadow-md backdrop-blur-sm">
                <span className="font-bold text-sm text-white">TALKING</span>
              </div>
            ) : (
              <Rnd
                position={{ x: element.position - startPosition, y: 0 }}
                size={{ width: element.width, height: 64 }}
                onDrag={(e, d) => handleDrag(id, d, startPosition)}
                onDragStop={(e, d) => handleDragStop(id, d, startPosition)}
                onResize={(e, dir, ref, delta, pos) =>
                  handleResize(id, dir, ref, delta, pos)
                }
                onResizeStop={(e, dir, ref, delta, pos) =>
                  handleResize(id, dir, ref, delta, pos)
                }
                resizeHandleStyles={{
                  left: {
                    left: "2px",
                    width: "6px",
                  },
                  right: {
                    right: "2px",
                    width: "6px",
                  },
                }}
                enableResizing={{
                  left: true,
                  right: true,
                  top: false,
                  bottom: false,
                }}
                dragAxis="x"
                resizeGrid={[1, 1]}
                bounds="parent"
                minWidth={50}
                dragGrid={[0.1, 0.1]}
              >
                <div className="flex items-center h-full w-full relative">
                  {/* Audio Status Icon */}

                  <div
                    className="h-16 rounded-2xl cursor-grab relative select-none shadow-md px-0.5 py-1 w-full"
                    style={{
                      background: "rgba(31, 41, 55, 0.8)",
                      border: "1.5px solid rgba(209, 213, 219, 0.4)",
                    }}
                  >
                    {/* Flex container for bars and text */}
                    <div className="w-full h-full flex items-center gap-1">
                      <div className="h-5 w-[3px] bg-gray-400/50 rounded-full" />

                      <div className="flex-1 h-full truncate rounded-xl border border-gray-400/30 bg-gray-700/50 flex items-center hover:bg-gray-700/60 transition-colors">
                        <div className="text-sm px-2 truncate text-gray-100 font-medium w-full">
                          {element.text}
                          <div
                            className={`absolute top-2 right-9 h-5 w-5 rounded-full ${
                              element.isEdited
                                ? "bg-green-500/20"
                                : "bg-red-500/20" // Translucent background
                            } flex items-center justify-center`}
                          >
                            <Pencil
                              className={`h-3 font-semibold w-3 ${
                                element.isEdited
                                  ? "text-green-500"
                                  : "text-red-500" // Solid color
                              } opacity-100`} // Force full opacity
                            />
                          </div>
                          <div
                            className={`absolute top-2 right-3 h-5 w-5 rounded-full ${
                              element.audioFile
                                ? "bg-green-500/20"
                                : "bg-red-500/20" // Translucent background
                            } flex items-center justify-center`}
                          >
                            <AudioLines
                              className={`h-3 font-semibold w-3 ${
                                element.audioFile
                                  ? "text-green-500"
                                  : "text-red-500" // Solid color
                              } opacity-100`} // Force full opacity
                            />
                          </div>
                        </div>
                      </div>
                      <div className="h-5 w-[3px] bg-gray-400/50 rounded-full" />
                    </div>
                    <audio
                      ref={(el) => {
                        audioRef.current[element.id] = el;
                        if (el && element.audioFile) {
                          el.onloadedmetadata = () => {
                            if (el)
                              handleAudioMetadata(element.id, el.duration);
                          };
                        }
                      }}
                      src={`http://localhost:5000/${element.audioFile}`}
                      preload="auto"
                    />
                  </div>
                </div>
              </Rnd>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
export default TimelineVisualizer;
