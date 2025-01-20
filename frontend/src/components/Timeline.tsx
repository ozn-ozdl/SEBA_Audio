import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";

interface TimelineVisualizerProps {
  videoDescriptions: VideoDescriptionItem[];
  currentTime: number;
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
  visualizer?: React.ReactNode; // New prop for the visualizer
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
}

const TimelineVisualizer: React.FC<TimelineVisualizerProps> = ({
  videoDescriptions,
  currentTime,
  onDescriptionChange,
  visualizer,
}) => {
  const [elements, setElements] = useState<TimelineElement[]>([]);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [timelineWidth, setTimelineWidth] = useState<number>(0);

  // Millisecond-based time-to-pixels conversion (100 pixels = 1 second)
  const timeToPixels = (timeStr: string): number => {
    const [hours = "0", minutes = "0", seconds = "0"] = timeStr.split(":");
    const totalSeconds =
      parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds); // Millisecond precision
    return totalSeconds * 100; // 100 pixels per second
  };

  // Millisecond-based pixels-to-time conversion
  const pixelsToTime = (pixels: number): string => {
    const totalSeconds = pixels / 100;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = (totalSeconds % 60).toFixed(3); // Millisecond precision
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.padStart(
      6,
      "0"
    )}`;
  };

  useEffect(() => {
    const newElements = videoDescriptions.map((desc, index) => ({
      id: index + 1,
      text: desc.description,
      position: timeToPixels(desc.startTime),
      width: timeToPixels(desc.endTime) - timeToPixels(desc.startTime),
      startTime: desc.startTime,
      endTime: desc.endTime,
    }));
    setElements(newElements);
  }, [videoDescriptions]);

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
    if (timelineRef.current) {
      const scrollPosition = currentTime * 100; // 100 pixels per second
      timelineRef.current.scrollTo({
        left: scrollPosition,
        behavior: "smooth",
      });
    }
  }, [currentTime]);

  const handleDragStop = (id: number, position: number) => {
    const newElements = elements.map((el) => {
      if (el.id === id) {
        const newStartTime = pixelsToTime(position);
        const endPosition = position + el.width;
        const newEndTime = pixelsToTime(endPosition);
        return {
          ...el,
          position,
          startTime: newStartTime,
          endTime: newEndTime,
        };
      }
      return el;
    });
    setElements(newElements);

    const updatedDescriptions = newElements.map((el) => ({
      startTime: el.startTime,
      endTime: el.endTime,
      description: el.text,
      videoUrl: videoDescriptions[el.id - 1].videoUrl,
    }));
    onDescriptionChange(updatedDescriptions);
  };

  // const handleResize = (id: number, delta: number) => {
  //   setElements((prevElements) =>
  //     prevElements.map((el) => {
  //       if (el.id === id) {
  //         const newWidth = Math.max(50, el.width + delta);
  //         const newEndTime = pixelsToTime(el.position + newWidth);
  //         return { ...el, width: newWidth, endTime: newEndTime };
  //       }
  //       return el;
  //     })
  //   );
  // };

  const handleResize = (id: number, delta: number) => {
    setElements((prevElements) => {
      const newElements = prevElements.map((el) => {
        if (el.id === id) {
          const newWidth = Math.max(50, el.width + delta);
          const newEndTime = pixelsToTime(el.position + newWidth);
          return { ...el, width: newWidth, endTime: newEndTime };
        }
        return el;
      });

      // Update the descriptions based on the new elements
      const updatedDescriptions = newElements.map((el) => ({
        startTime: el.startTime,
        endTime: el.endTime,
        description: el.text,
        videoUrl: videoDescriptions[el.id - 1].videoUrl,
      }));

      // Call the onDescriptionChange with the updated descriptions
      onDescriptionChange(updatedDescriptions);

      return newElements; // Return the new elements for state update
    });
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (timelineRef.current) {
      e.preventDefault(); // Prevent page scrolling
      timelineRef.current.scrollLeft += e.deltaY; // Scroll horizontally
    }
  };

  return (
    <div
      className="relative h-40 bg-gray-800 overflow-hidden"
      ref={timelineRef}
      onWheel={handleWheel}
      style={{ cursor: "grab", width: "100%" }}
    >
      <div className="relative h-full" style={{ width: `${timelineWidth}px` }}>
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

        {elements.map((el) => (
          <Draggable
            key={el.id}
            axis="x"
            bounds="parent"
            defaultPosition={{ x: el.position, y: 40 }}
            onStop={(_, data) => handleDragStop(el.id, data.x)}
          >
            <div
              className="absolute h-16 bg-gray-700 border border-gray-600 rounded-lg flex items-center cursor-grab"
              style={{ width: `${el.width}px` }}
            >
              <div className="bg-green-600 text-white text-xs font-bold px-2 py-1">
                {el.id}
              </div>
              <div className="text-gray-200 text-sm px-2 truncate">
                {el.text}
              </div>

              <div
                className="timelineSentenceHandle"
                style={{
                  position: "absolute",
                  width: "9px",
                  height: "100%",
                  left: `${el.width - 9}px`,
                  cursor: "col-resize",
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  let startX = e.clientX;

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientX - startX;
                    handleResize(el.id, delta);
                    startX = moveEvent.clientX;
                  };

                  const onMouseUp = () => {
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
        ))}
      </div>
      {/* Visualizer */}
      {visualizer && (
        <div className="absolute bottom-0 left-0 right-0 bg-black">
          {visualizer}
        </div>
      )}
    </div>
  );
};

export default TimelineVisualizer;
