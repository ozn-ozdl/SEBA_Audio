import React from "react";
import { Button } from "./components/ui/button";

//TODO: change video src to demo video,upload demo video to /public/demo and upload it to the server
const LandingPage: React.FC = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-indigo-900 via-purple-700 to-indigo-600 flex flex-col items-center justify-center text-white animate-fade-in">
      <h1 className="text-6xl font-bold mb-8">
        Narrif<span className="text-yellow-400">AI</span>
      </h1>

      <p className="text-2xl font-light mb-12 text-center max-w-2xl leading-relaxed">
        Empowering accessibility with AI-driven audio descriptions for videos.
      </p>

      <div className="mb-12 w-full max-w-3xl">
        <h2 className="text-3xl font-semibold mb-6 text-center">Demo Video</h2>
        <video
          controls
          className="w-full h-auto rounded-lg shadow-lg"
          src="/demo/30_seconds_test_video.mp4"
        >
          Your browser does not support the video tag.
        </video>
      </div>
      <Button
        className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-lg hover:bg-yellow-500 transition mb-12 text-lg"
        onClick={() => (window.location.href = "/main")}
      >
        Explore Now
      </Button>

      <p className="text-xl font-light text-center max-w-2xl leading-relaxed">
        With our intelligent platform, we narrify your videos by transforming
        visual scenes into rich audio descriptions, making content accessible
        for everyone. Our seamless integration makes it easy to enhance your
        content, ensuring it’s inclusive and impactful for all viewers.
      </p>

      <footer className="absolute bottom-4 text-xs text-gray-300">
        © {new Date().getFullYear()} NarrifAI. All rights reserved.
      </footer>
    </div>
  );
};

export default LandingPage;
