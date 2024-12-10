import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import React, { useState, useRef } from "react";
import { Button } from "./ui/button";

interface VideoUploaderProps {
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onProcessVideo }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [selectedAction, setSelectedAction] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setVideoFile(files[0]);
    }
  };

  /** 
  const handleRemoveVideo = () => {
    setVideoFile("");
  };
  **/

  const handleSubmit = () => {
    if (!videoFile || !selectedAction) {
      alert("Please upload a video and select an action.");
      return;
    }
    alert("Video submitted! This process will take about 2 minutes.");
    onProcessVideo(videoFile, selectedAction);
  };

  return (
    <div className="w-[640px] h-[360px] bg-bg-primary rounded-lg flex items-center justify-center mb-4">
      <input
        ref={inputRef}
        id="video-upload"
        type="file"
        accept="video/*"
        onChange={handleVideoUpload}
        className="hidden"
      />

      {!videoFile ? (
        <div className="flex flex-col items-center">
          <label
            htmlFor="video-upload"
            className="cursor-pointer bg-button-primary px-4 py-2 rounded hover:bg-button-secondary"
          >
            Upload Video
          </label>
          <p className="mt-2 text-sm text-text-primary">
            Select a video file to upload.
          </p>
        </div>
      ) : (
        <div className="w-full bg-bg-secondary">
          <video
            controls
            className="w-full h-full rounded"
            src={URL.createObjectURL(videoFile)}
          >
            Your browser does not support the video tag.
          </video>

          <div className="mt-4 flex justify-between items-center text-text-primary">
            <Select onValueChange={(value) => setSelectedAction(value)}>
              <SelectTrigger className="w-[200px]  bg-button-primary hover:bg-button-secondary">
                <SelectValue placeholder="Select Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openAI_image">OpenAI with images</SelectItem>
                <SelectItem value="gemini_video">OpenAI only video</SelectItem>
                <SelectItem value="gemini_optimized">
                  Gemini optimized
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={handleSubmit}
              className=" text-text-primary px-4 py-2 rounded bg-button-primary hover:bg-button-secondary"
            >
              Submit
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
