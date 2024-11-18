import React, { useState } from "react";

const VideoUploader = () => {
  const [videoFile, setVideoFile] = useState("");

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const fileURL = URL.createObjectURL(file);
      setVideoFile(fileURL);
      handleProcessVideo();
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile("");
  };

  const handleProcessVideo = () => {
    //TODO
  };

  return (
    <div className="w-[640px] h-[360px] bg-bg-primary rounded-lg flex items-center justify-center mb-4">
      {!videoFile ? (
        <div className="flex flex-col items-center">
          <label
            htmlFor="video-upload"
            className="cursor-pointer bg-button-primary px-4 py-2 rounded hover:bg-button-secondary"
          >
            Upload Video
          </label>
          <input
            id="video-upload"
            type="file"
            accept="video/*"
            onChange={handleVideoUpload}
            className="hidden"
          />
          <p className="mt-2 text-sm text-text-primary">
            Select a video file to upload.
          </p>
        </div>
      ) : (
        <div className="w-full">
          <video controls className="w-full h-full rounded" src={videoFile}>
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
