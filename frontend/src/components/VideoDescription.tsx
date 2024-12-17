// import React, { useEffect, useState } from "react";

// interface VideoDescriptionItem {
//   startTime: string;
//   endTime: string;
//   description: string;
//   videoUrl: string;
// }

// interface Props {
//   videoDescriptions: VideoDescriptionItem[];
// }

// const VideoDescription: React.FC<Props> = ({ videoDescriptions }) => {
//   const [combinedDescriptions, setCombinedDescriptions] = useState("");

//   useEffect(() => {
//     // Combine all descriptions into one string.
//     const combinedText = videoDescriptions.map((item) => item.description).join(" ");
//     setCombinedDescriptions(combinedText);
//     console.log("Combined Descriptions:", combinedText);
//   }, [videoDescriptions]);

//   const handleAudioDescriptionClick = () => {
//     if (!combinedDescriptions) {
//       console.error("No text to convert to speech.");
//       alert("No descriptions available for audio.");
//       return;
//     }

//     // Simulate audio description functionality here.
//     alert("Playing audio description...");
//     // Additional logic for audio generation can be integrated.
//   };

//   return (
//     <div className="space-y-4">
//       {videoDescriptions.length === 0 ? (
//         <p className="text-gray-500 text-sm">No descriptions available. Process a video to get started.</p>
//       ) : (
//         <ul className="space-y-2">
//           {videoDescriptions.map((item, index) => (
//             <li key={index} className="border p-4 rounded-md">
//               <p className="font-semibold">
//                 Scene {index + 1}: {item.startTime} - {item.endTime}
//               </p>
//               <p className="text-gray-700">{item.description}</p>
//               <a
//                 href={item.videoUrl}
//                 target="_blank"
//                 rel="noopener noreferrer"
//                 className="text-blue-500 hover:underline text-sm"
//               >
//                 View Scene
//               </a>
//             </li>
//           ))}
//         </ul>
//       )}

//       {videoDescriptions.length > 0 && (
//         <div className="text-center">
//           <button
//             onClick={handleAudioDescriptionClick}
//             className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
//           >
//             Play Audio Description
//           </button>
//         </div>
//       )}
//     </div>
//   );
// };

// export default VideoDescription;


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

const VideoDescription: React.FC<Props> = ({ videoDescriptions, onDescriptionChange }) => {
  const [editableDescriptions, setEditableDescriptions] = useState<VideoDescriptionItem[]>([]);

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
        <p className="text-gray-500 text-sm">No descriptions available. Process a video to get started.</p>
      ) : (
        <ul className="space-y-2">
          {editableDescriptions.map((item, index) => (
            <li key={index} className="border p-4 rounded-md">
              <p className="font-semibold">
                Scene {index + 1}: {item.startTime} - {item.endTime}
              </p>

              {/* Editable description field */}
              <textarea
                value={item.description}
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                className="w-full mt-2 p-2 border rounded-md"
                rows={4}
              />

              <a
                href={item.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline text-sm"
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
