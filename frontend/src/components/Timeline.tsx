import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";

interface TimelineVisualizerProps {
  videoDescriptions: VideoDescriptionItem[];
  currentTime: number;
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  onTimeUpdate?: (time: number) => void; // Optional callback for time updates
  visualizer?: React.ReactNode;
}

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

interface TimelineElement {
  id: number;
  text: string;
  position: number;
  width: number;
  startTime: string;
  endTime: string;
  color: string;
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
}) => {
  const [elements, setElements] = useState<TimelineElement[]>([]);
  const [containers, setContainers] = useState<ContainerElement[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const resizingRef = useRef(false);

  const getRandomColor = () => {
    const colors = [
      "bg-blue-800",
      "bg-green-800",
      "bg-purple-800",
      "bg-pink-800",
      "bg-yellow-800",
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

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

  const updateContainers = (updatedElements: TimelineElement[]) => {
    const sortedElements = [...updatedElements].sort(
      (a, b) => a.position - b.position
    );

    const newContainers = sortedElements.map((element, index) => {
      const containerStart =
        index === 0
          ? 0
          : sortedElements[index - 1].position +
            sortedElements[index - 1].width;

      const containerWidth =
        index === sortedElements.length - 1
          ? timelineWidth - containerStart
          : sortedElements[index + 1].position - containerStart;

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
    if (timelineRef.current) {
      const scrollPosition = currentTime * 100;
      timelineRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [currentTime]);

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
      color: getRandomColor(),
    }));

    setElements(newElements);
    updateContainers(newElements);
  }, [videoDescriptions, timelineWidth]);

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
      videoUrl: videoDescriptions[el.id - 1].videoUrl,
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
        videoUrl: videoDescriptions[el.id - 1].videoUrl,
      }));

      onDescriptionChange(updatedDescriptions);

      return newElements;
    });
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || !onTimeUpdate) return;

    // Get click coordinates relative to the timeline
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const x = e.clientX - rect.left + scrollLeft;

    // Convert to seconds (assumes 100px per second as per your existing scale)
    const newTime = x / 100;

    // Trigger the time update
    onTimeUpdate(newTime);
  };

  return (
    <div
      className="relative h-40 bg-gray-800 overflow-hidden"
      ref={timelineRef}
      onWheel={handleWheel}
      style={{ cursor: "grab", width: "100%" }}
    >
      <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
        {/* Clickable background layer */}
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
          <div
            className="absolute h-full w-0.5 bg-red-500 z-10"
            style={{ left: `${currentTime * 100}px` }}
          />
        </div>

        {/* Containers and draggable elements */}
        {containers.map(({ id, startPosition, width, element }) => (
          <div
            key={id}
            className="absolute inset-y-0 my-auto h-16" // Center vertically and set height
            style={{
              left: `${startPosition}px`,
              width: `${width}px`,
            }}
            onClick={(e) => e.stopPropagation()} // Prevent timeline clicks on containers
          >
            <Draggable
              axis="x"
              bounds="parent"
              position={{ x: element.position - startPosition, y: 0 }} // Align Y to match container
              onStart={() => setIsDragging(true)}
              onStop={(_, data) => handleDragStop(id, data.x + startPosition)}
              disabled={resizingRef.current}
            >
              <div
                className="h-16 bg-gray-700 border border-gray-600 rounded-lg flex items-center cursor-grab"
                style={{ width: `${element.width}px` }}
                onClick={(e) => e.stopPropagation()} // Prevent timeline clicks on draggable elements
              >
                <div className="bg-green-600 text-white text-xs font-bold px-2 py-1">
                  {id}
                </div>
                <div className="text-gray-200 text-sm px-2 truncate">
                  {element.text}
                </div>

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
                      document.removeEventListener("mousemove", onMouseMove);
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
          </div>
        ))}
      </div>
      {visualizer && (
        <div className="absolute bottom-0 left-0 right-0 bg-black">
          {visualizer}
        </div>
      )}
    </div>
  );
};

export default TimelineVisualizer;
