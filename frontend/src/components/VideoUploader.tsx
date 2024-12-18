import React, { useState, useEffect } from "react";

interface VideoUploaderProps {
  onProcessVideo: (videoFile: File, action: string) => Promise<void>;
}

const VideoUploader: React.FC<VideoUploaderProps> = ({ onProcessVideo }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [action, setAction] = useState<string>("");
  const [timer, setTimer] = useState<number>(0); // Timer to track elapsed time
  const [isProcessing, setIsProcessing] = useState<boolean>(false); // Flag to track video processing state

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
  };

  const handleSubmit = async () => {
    if (selectedFile && action) {
      alert("Video submitted! This process will take up to a few minutes.");
      setIsProcessing(true);
      console.log("Timer started");
      setTimer(0); // Reset timer when submitting the video

      try {
        await onProcessVideo(selectedFile, action);
        // Stop the timer once processing is complete
        setIsProcessing(false);
        alert("Video processed successfully!");
      } catch (error) {
        setIsProcessing(false); // Stop the timer even if an error occurs
        alert("An error occurred while processing the video.");
      }
    } else {
      alert("Please select a video file and an action.");
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isProcessing) {
      // Start the timer when processing starts
      intervalId = setInterval(() => {
        setTimer((prevTimer) => prevTimer + 1);
      }, 1000); // Update every second
    }

    // Cleanup the interval on component unmount or when processing ends
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isProcessing]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
      {/* File Upload Section */}
      <div className="mb-4">
        <label
          htmlFor="videoFile"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Upload Video
        </label>
        <div className="flex items-center justify-center w-full">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-10 h-10 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 16l4-4m0 0l4-4m-4 4h12"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                {selectedFile
                  ? `Selected: ${selectedFile.name}`
                  : "Click to upload or drag and drop"}
              </p>
              <p className="text-xs text-gray-400">MP4, AVI, MOV (Max 10GB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="video/*"
              onChange={handleFileChange}
            />
          </label>
        </div>
      </div>

      {/* Action Selection Section */}
      <div className="mb-4">
        <label
          htmlFor="action"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          Select Action
        </label>
        <select
          id="action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="" disabled>Choose an Action</option>
          <option value="openAI_image">OpenAI with images</option>
          <option value="gemini_whole_video">Gemini only video</option>
          <option value="gemini_optimized">Gemini optimized</option>
        </select>
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!selectedFile || !action}
        className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition-colors duration-300 disabled:bg-gray-400"
      >
        Process Video
      </button>

      {/* Timer Display */}
      {isProcessing && (
        <div className="mt-4 text-gray-600">
          <p>Processing time: {timer} seconds</p>
        </div>
      )}
    </div>
  );
};

export default VideoUploader;
