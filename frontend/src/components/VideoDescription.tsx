import React, { useState, useEffect } from "react";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

interface Props {
  videoDescriptions: VideoDescriptionItem[];
  onDescriptionChange: (updatedDescriptions: VideoDescriptionItem[]) => void;
}

const VideoDescription: React.FC<Props> = ({
  videoDescriptions,
  onDescriptionChange,
}) => {
  const [editableDescriptions, setEditableDescriptions] = useState<
    VideoDescriptionItem[]
  >([]);

  useEffect(() => {
    // Set the editable descriptions to the videoDescriptions passed in as props
    setEditableDescriptions(videoDescriptions);
  }, [videoDescriptions]);

  const handleDescriptionChange = (index: number, newDescription: string) => {
    const updatedDescriptions = [...editableDescriptions];
    updatedDescriptions[index].description = newDescription;
    setEditableDescriptions(updatedDescriptions);

    // Pass the updated descriptions back to the parent component
    onDescriptionChange(updatedDescriptions);
  };

  return (
    <div className="space-y-4">
      {editableDescriptions.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No descriptions available. Process a video to get started.
        </p>
      ) : (
        <ul className="space-y-4">
          {editableDescriptions.map((item, index) => (
            <li
              key={index}
              className="border bg-gray-100 p-4 rounded-lg shadow-sm"
            >
              <p className="font-semibold">
                Scene {index + 1}: {item.startTime} - {item.endTime}
              </p>

              {/* Editable description field */}
              <textarea
                value={item.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="w-full mt-2 p-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
              />

              <a
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm mt-2 inline-block"
              >
                View Scene
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default VideoDescription;
