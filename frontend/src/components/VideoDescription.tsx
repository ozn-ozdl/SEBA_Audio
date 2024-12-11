import React from "react";
import { Textarea } from "./ui/textarea";

interface VideoDescriptionItem {
  startTime: string;
  endTime: string;
  description: string;
  videoUrl: string;
}

interface Props {
  videoDescriptions: VideoDescriptionItem[];
}

export const VideoDescription: React.FC<Props> = ({ videoDescriptions }) => {
  return (
    <div className="h-[calc(100vh-160px)] overflow-y-auto bg-bg-primary rounded shadow-lg border border-gray-700 p-4">
      {videoDescriptions.length > 0 ? (
        videoDescriptions.map((item, index) => (
          <div
            key={index}
            className="relative flex items-center justify-between py-6 border-b border-gray-600"
          >
            <div className="absolute top-4 bg-bg-secondary text-white text-xs font-bold px-2 py-1 rounded">
              {index + 1}
            </div>

            <div className="w-1/5 text-sm text-text-primary">
              <p>{item.startTime}</p>
              <p>{item.endTime}</p>
            </div>

            <div className="w-3/5 px-4">
              <div className="bg-bg-secondary text-sm text-text-primary rounded border border-gray-700">
                <Textarea
                  className="h-24"
                  placeholder={
                    "Here will be your video description of the certain scene."
                  }
                  value={item.description}
                  id="index"
                ></Textarea>
              </div>
            </div>
            <div className="w-1/5">
              <video
                src={item.videoUrl}
                controls
                className="w-full h-auto rounded"
              ></video>{" "}
            </div>
          </div>
        ))
      ) : (
        //TODO
        <div className="text-center py-4">
          <p className="text-gray-400">No descriptions available.</p>
        </div>
      )}
    </div>
  );
};
