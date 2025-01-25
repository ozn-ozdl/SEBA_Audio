import React, { useState, useEffect, useRef } from "react";
import { Rnd } from "react-rnd";
import "./custom_styles/timeline.css";

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
  //   const currentPosition = currentTime * 100;

  //   const newSceneElement: TimelineElement = {
  //     id: 0,
  //     text: "New Scene",
  //     position: currentPosition,
  //     width: 100,
  //     startTime: currentTime,
  //     endTime: currentTime + 10000,
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
  //       videoUrl: "",
  //     }));

  //     onDescriptionChange(updatedDescriptions);

  //     return reassignedElements;
  //   });
  // };

  const addNewScene = () => { 
    const currentTimeMs = currentTime * 1000; // Convert currentTime (seconds) to milliseconds
    const minWidthPixels = 50; // Minimum width in pixels (500ms)
  
    const newSceneElement: TimelineElement = {
      id: 0,
      text: "New Scene",
      position: currentTimeMs / 10, // Convert ms to pixels (1px = 10ms)
      width: minWidthPixels,
      startTime: currentTimeMs,
      endTime: currentTimeMs + (minWidthPixels * 10), // Convert width to duration in ms
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
        audioFile: el.audioFile,
      }));
  
      onDescriptionChange(updatedDescriptions);
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

  const handleDrag = (elementId: number, DraggableEvent: any, startPosition: number) => {
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

  const handleDragStop = (elementId: number, DraggableEvent: any, startPosition: number) => {
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
    }));

    onDescriptionChange(updatedDescriptions);
  };

  const handleResize = (
    elementId: number,
    direction: string,
    ref: HTMLElement,
    delta: { width: number; height: number },
    position: { x: number; y: number }
  ) => {
    const container = containers.find((c) => c.id === elementId);
    if (!container) return;
    console.log("delta", delta);
    console.log("position", position);
    // Get actual pixel dimensions from the element
    const currentWidth = parseFloat(ref.style.width);
    const currentLeft = parseFloat(ref.style.left);
    // console.log("currentWidth", currentWidth);
    // console.log("currentLeft", position["x"]);

    // console.log("console startposition", container.startPosition);
    // Convert to timeline-absolute coordinates
    const absolutePosition = container.startPosition + position["x"];
    const absoluteRight = absolutePosition + currentWidth;

    // console.log("console absolutePosition", absolutePosition);

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

  // const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
  //   if (!timelineRef.current || !onTimeUpdate) return;

  //   const rect = timelineRef.current.getBoundingClientRect();
  //   const scrollLeft = timelineRef.current.scrollLeft;
  //   const x = e.clientX - rect.left + scrollLeft;

  //   const newTime = x / 100;

  //   for (const container of containers) {
  //     const startSeconds = container.element.startTime;
  //     const endSeconds = container.element.endTime;

  //     if (newTime >= startSeconds && newTime < endSeconds) {
  //       const audio = audioRef.current[container.id];
  //       if (audio) {
  //         const audioOffset = newTime - startSeconds;
  //         if (audioOffset < audio.duration) {
  //           audio.currentTime = audioOffset;
  //         } else {
  //           console.warn(
  //             `Audio offset (${audioOffset}) exceeds duration (${audio.duration})`
  //           );
  //         }
  //       }
  //       break;
  //     }
  //   }

  //   onTimeUpdate(newTime);
  // };

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

  // // Audio Playback handling
  // useEffect(() => {
  //   elements.forEach((element) => {
  //     const audio = audioRef.current[element.id];
  //     if (!audio || !element.audioFile) return;

  //     const elementStartTime = element.startTime;
  //     const elementEndTime = element.endTime;
  //     console.log(`comparison : ${currentTime} >= ${elementStartTime} && ${currentTime} < ${elementEndTime}`);

  //     if (currentTime >= elementStartTime && currentTime < elementEndTime) {
  //       const audioOffset = currentTime - elementStartTime;

  //       if (audio.paused && isPlaying) {
  //         audio.currentTime = audioOffset;
  //         const timeRemaining = Math.min(
  //           audio.duration - audioOffset,
  //           elementEndTime - currentTime
  //         );

  //         audio
  //           .play()
  //           .then(() => {
  //             setTimeout(() => {
  //               if (!audio.paused) {
  //                 audio.pause();
  //               }
  //             }, timeRemaining * 1000);
  //           })
  //           .catch((error) => console.error("Audio playback error:", error));
  //       }
  //     } else if (!audio.paused) {
  //       audio.pause();
  //     }
  //   });
  // }, [currentTime, elements, isPlaying]);

  // useEffect(() => {
  //   elements.forEach((element) => {
  //     const audio = audioRef.current[element.id];
  //     if (!audio || !element.audioFile) return;

  //     const elementStartTime = element.startTime / 1000; // Convert ms to seconds
  //     const elementEndTime = element.endTime / 1000; // Convert ms to seconds

  //     if (currentTime >= elementStartTime && currentTime < elementEndTime) {
  //       const audioOffset = currentTime - elementStartTime;

  //       if (isPlaying && audio.paused) {
  //         audio.currentTime = audioOffset;
  //         audio
  //           .play()
  //           .catch((error) => console.error("Audio playback error:", error));
  //       } else if (!isPlaying && !audio.paused) {
  //         audio.pause();
  //       }
  //     } else {
  //       audio.pause();
  //     }
  //   });
  // }, [currentTime, elements, isPlaying]);

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
    <div
      className="relative w-full h-40 overflow-hidden backdrop-blur-sm"
      ref={timelineRef}
      onWheel={handleWheel}
      style={{ cursor: "grab" }}
    >
      {/* Add Scene Button */}
      <button
        className="absolute z-20 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-105"
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
              height: '64px', // Maintain consistent height
              top: '50%', // Center vertically
              transform: 'translateY(-50%)', // Adjust for exact vertical centering
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {element.text === "TALKING" ? (
              <div
                className="h-full w-full bg-opacity-40 bg-red-900 rounded-xl border-1 flex items-center justify-center select-none shadow-md backdrop-blur-sm"

              >
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
                <div className="flex items-center h-full w-full">
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
                        </div>
                      </div>
                      <div className="h-5 w-[3px] bg-gray-400/50 rounded-full" />
                    </div>
                    {/* Audio Duration Bar */}
                    {/* {element.audioFile && audioDurations[id] && (
                      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red rounded-b-lg">
                        <div
                          className="h-full bg-teal-400/80 rounded-b-lg"
                          style={{
                            width: `${Math.min(
                              (audioDurations[id] * 100) / (element.width / 100),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    )} */}
  
                    <audio
                      ref={(el) => {
                        audioRef.current[element.id] = el;
                        if (el && element.audioFile) {
                          el.onloadedmetadata = () => {
                            if (el) handleAudioMetadata(element.id, el.duration);
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
}
  // return (
  //   <div
  //     className="relative w-full h-40 overflow-hidden backdrop-blur-sm"
  //     ref={timelineRef}
  //     onWheel={handleWheel}
  //     style={{ cursor: "grab" }}
  //   >
  //     {/* Add Scene Button */}
  //     <button
  //       className="absolute z-20 text-white rounded-full p-3 shadow-lg transition-transform transform hover:scale-105"
  //       style={{
  //         left: `${currentTime * 100 - 16}px`,
  //         top: "-24px",
  //         background: "linear-gradient(to right, #14b8a6, #0f766e)", // Teal gradient
  //       }}
  //       onClick={addNewScene}
  //     >
  //       +
  //     </button>

  //     {/* Timeline Container */}
  //     <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
  //       {/* Clickable Background */}
  //       <div
  //         className="absolute inset-0"
  //         onClick={handleTimelineClick}
  //         style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }}
  //       />

  //       {/* Time Markers */}
  //       <div className="absolute top-0 left-0 w-full h-full pointer-events-none ">
  //         {Array.from({ length: Math.ceil(timelineWidth / 100) }).map(
  //           (_, index) => (
  //             <div
  //               key={index}
  //               className="absolute h-full border-l border-gray-700"
  //               style={{ left: `${index * 100}px` }}
  //             >
  //               <span className="text-xs absolute top-1 text-gray-400">
  //                 {pixelsToTime(index * 100)}
  //               </span>
  //             </div>
  //           )
  //         )}

  //         {/* Current Time Indicator */}
  //         <div
  //           className="absolute h-full w-0.5 z-10 bg-teal-400"
  //           style={{
  //             left: `${currentTime * 100}px`,
  //           }}
  //         />
  //       </div>

  //       {/* Containers and Draggable Elements */}
  //       {containers.map(({ id, startPosition, width, element }) => (
  //         <div
  //           key={id}
  //           className="absolute inset-y-0 my-auto h-64px"
  //           style={{
  //             left: `${startPosition}px`,
  //             width: `${width}px`,
  //           }}
  //           onClick={(e) => e.stopPropagation()}
  //         >
  //           {element.text === "TALKING" ? (
  //             // Fixed "TALKING" Container
  //             <div
  //               className="h-16 bg-opacity-75 rounded-xl flex items-center justify-center select-none shadow-md backdrop-blur-sm"
  //               style={{
  //                 width: `${element.width}px`,
  //                 background:
  //                   "linear-gradient(to right, #ef4444/90, #b91c1c/90)", // Red gradient
  //               }}
  //             >
  //               <span className="font-bold text-sm text-white">TALKING</span>
  //             </div>
  //           ) : (
              // Draggable and Resizable Container
              // <Rnd
              //   position={{ x: element.position - startPosition, y: 0 }}
              //   size={{ width: element.width, height: 64 }}
              //   onDrag={(e, d) => handleDrag(id, d.x + startPosition)}
              //   onDragStop={(e, d) => handleDragStop(id, d.x + startPosition)}
              //   onResize={(e, dir, ref, delta, pos) =>
              //     handleResize(id, dir, ref, delta, pos)
              //   }
              //   onResizeStop={(e, dir, ref, delta, pos) =>
              //     handleResize(id, dir, ref, delta, pos)
              //   }
              //   enableResizing={{
              //     left: true,
              //     right: true,
              //     top: false,
              //     bottom: false,
              //   }}
              //   resizeGrid={[1, 1]}
              //   bounds="parent"
              //   minWidth={50}
              // >
              //   <div
              //     className="h-16 border rounded-xl flex items-center cursor-grab relative select-none shadow-md"
              //     style={{
              //       width: `${element.width}px`,
              //       background: "", // Purple gradient
              //       borderColor: "",
              //     }}
              //     onClick={(e) => e.stopPropagation()}
              //   >
              //     {/* Resize Zones */}
              //     <div className="" />
              //     <div className="" />

              //     {/* ID Ribbon */}
              //     {/* <div className="absolute top-0 left-0 right-0 text-white text-xs font-bold px-2 py-1 rounded-t-xl text-left bg-purple-700">
              //       {id}
              //     </div> */}

              //     {/* Audio Duration Bar */}
              //     {element.audioFile && audioDurations[id] && (
              //       <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600">
              //         <div
              //           className="h-full bg-teal-400"
              //           style={{
              //             width: `${Math.min(
              //               (audioDurations[id] * 100) / (element.width / 100),
              //               100
              //             )}%`,
              //           }}
              //         />
              //       </div>
              //     )}

              //     {/* Element Text */}
              //     <div className="truncate bg-white h-full p">
              //       <div className="text-sm px-2 truncate text-white">
              //         {element.text}
              //       </div>
              //     </div>

              //     {/* Hidden Audio Player */}
              //     <audio
              //       ref={(el) => {
              //         audioRef.current[element.id] = el;
              //         if (el && element.audioFile) {
              //           el.onloadedmetadata = () => {
              //             if (el) handleAudioMetadata(element.id, el.duration);
              //           };
              //         }
              //       }}
              //       src={`http://localhost:5000/${element.audioFile}`}
              //       preload="auto"
              //     />
              //   </div>
              // </Rnd>
//               <Rnd
//                 position={{ x: element.position - startPosition, y: 0 }}
//                 size={{ width: element.width, height: 64 }}
//                 onDrag={(e, d) => handleDrag(id, d, startPosition)}
//                 onDragStop={(e, d) => handleDragStop(id, d, startPosition)}
//                 onResize={(e, dir, ref, delta, pos) =>
//                   handleResize(id, dir, ref, delta, pos)
//                 }
//                 onResizeStop={(e, dir, ref, delta, pos) =>
//                   handleResize(id, dir, ref, delta, pos)
//                 }
//                 enableResizing={{
//                   left: true,
//                   right: true,
//                   top: false,
//                   bottom: false,
//                 }}
//                 dragAxis="x"
//                 resizeGrid={[1, 1]}
//                 bounds="parent"
//                 minWidth={50}
//                 dragGrid={[0.1, 0.1]}
//               >
//                 <div className="flex items-center">
//                   <div
//                     className="h-16 rounded-2xl cursor-grab relative select-none shadow-md px-0.5 py-1"
//                     style={{
//                       width: `${element.width}px`,
//                       background: "rgba(31, 41, 55, 0.8)", // Dark gray with opacity
//                       border: "1.5px solid rgba(209, 213, 219, 0.4)", // Light gray border
//                     }}
//                     onClick={(e) => e.stopPropagation()}
//                   >
//                     {/* Flex container for bars and text */}
//                     <div className="w-full h-full flex items-center gap-1">
//                       {/* Left Bar */}
//                       <div className="h-5 w-[3px] bg-gray-400/50 rounded-full" />

//                       {/* Inner text container */}
//                       <div
//                         className="flex-1 h-full truncate rounded-xl border border-gray-400/30 bg-gray-700/50 
//                   flex items-center hover:bg-gray-700/60 transition-colors"
//                       >
//                         {/* Text Element */}
//                         <div className="text-sm px-2 truncate text-gray-100 font-medium w-full">
//                           {element.text}
//                         </div>
//                       </div>

//                       {/* Right Bar */}
//                       <div className="h-5 w-[3px] bg-gray-400/50 rounded-full" />
//                     </div>

//                     {/* Audio Duration Bar */}
//                     {element.audioFile && audioDurations[id] && (
//                       <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-red rounded-b-lg">
//                         <div
//                           className="h-full bg-teal-400/80 rounded-b-lg"
//                           style={{
//                             width: `${Math.min(
//                               (audioDurations[id] * 100) /
//                                 (element.width / 100),
//                               100
//                             )}%`,
//                           }}
//                         />
//                       </div>
//                     )}

//                     {/* Hidden Audio Player */}
//                     <audio
//                       ref={(el) => {
//                         audioRef.current[element.id] = el;
//                         if (el && element.audioFile) {
//                           el.onloadedmetadata = () => {
//                             if (el)
//                               handleAudioMetadata(element.id, el.duration);
//                           };
//                         }
//                       }}
//                       src={`http://localhost:5000/${element.audioFile}`}
//                       preload="auto"
//                     />
//                   </div>
//                 </div>
//               </Rnd>
//             )}
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

export default TimelineVisualizer;
