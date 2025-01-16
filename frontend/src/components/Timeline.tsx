import React, { useState } from "react";
import Draggable from "react-draggable";

type TimelineElement = {
  id: number;
  text: string;
  position: number;
  width: number;
};

const TimelineVisualizer: React.FC = () => {
  const [elements, setElements] = useState<TimelineElement[]>([
    { id: 1, text: "Mein Name ist Victor.", position: 100, width: 120 },
    { id: 2, text: "Hallo.", position: 400, width: 80 },
  ]);

  const handleDragStop = (id: number, position: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, position } : el))
    );
  };

  const handleResize = (id: number, delta: number) => {
    setElements((prev) =>
      prev.map((el) =>
        el.id === id
          ? { ...el, width: Math.max(50, el.width + delta) } // Minimum width is 50
          : el
      )
    );
  };

  return (
    <div className="relative w-full h-40 bg-gray-800 overflow-x-scroll">
      {/* Timeline */}
      <div className="relative w-[5000px] h-full">
        {/* Grid */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
          {Array.from({ length: 50 }).map((_, index) => (
            <div
              key={index}
              className="absolute h-full border-l border-gray-500"
              style={{ left: `${index * 100}px` }}
            >
              <span className="text-gray-400 text-xs absolute top-1">
                {`0:00:${index.toString().padStart(2, "0")}`}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Elements */}
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
              <div className="text-gray-200 text-sm px-2">{el.text}</div>

              {/* Resize Handle */}
              <div
                className="timelineSentenceHandle"
                style={{
                  position: "absolute",
                  width: "9px",
                  height: "100%",
                  transition: "all var(--transitionDefault)",
                  zIndex: 10,
                  left: `${el.width - 9}px`,
                  cursor: "col-resize",
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  let startX = e.clientX; // Changed const to let

                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientX - startX;
                    handleResize(el.id, delta);
                    startX = moveEvent.clientX; // Now valid with let
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
    </div>
  );
};

export default TimelineVisualizer;
