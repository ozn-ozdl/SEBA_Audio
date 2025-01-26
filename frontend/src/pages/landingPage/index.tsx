import React from "react";
import { Button } from "../../components/ui/button";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-600 to-indigo-500 flex flex-col items-center justify-start text-white">
      {/* Hero Section */}
      <section className="w-full h-screen flex flex-col items-center justify-center text-center px-4">
        <h1 className="text-5xl sm:text-6xl font-bold leading-tight mb-6 text-white">
          Empowering Accessibility with{" "}
          <span className="text-yellow-400">AI</span>
        </h1>
        <p className="text-lg sm:text-xl font-light mb-8 max-w-2xl leading-relaxed opacity-80">
          Transform visual content into rich descriptions, making videos
          accessible to all.
        </p>
        <Button
          className="bg-yellow-400 text-indigo-900 px-8 py-4 rounded-lg shadow-lg hover:bg-yellow-500 transition duration-300 text-lg font-semibold"
          onClick={() => (window.location.href = "/dashboard")}
        >
          Get Started
        </Button>
        <Button
          className="bg-white text-indigo-900 px-8 py-4 rounded-lg shadow-lg hover:bg-gray-200 transition duration-300 text-lg font-semibold mt-4"
          onClick={() => (window.location.href = "/faq")}
        >
          Frequently Asked Questions
        </Button>
      </section>

      {/* Demo Section */}
      <section className="w-full bg-indigo-800 py-16 text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-6">
          We turn this ...
        </h2>
        <div className="w-full max-w-3xl mx-auto">
          <video
            controls
            className="w-full h-auto rounded-lg shadow-lg"
            src="/demo/30_seconds_test_video.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
        <br />
        <h2 className="text-3xl sm:text-4xl font-semibold text-white mb-6">
          ... Into this
        </h2>
        <div className="w-full max-w-3xl mx-auto">
          <img
            src="/demo/visualization.png"
            alt="Audio description visualization"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full bg-indigo-900 py-16 px-4 text-white text-center">
        <h2 className="text-3xl sm:text-4xl font-semibold mb-12">
          Why Choose NarrifAI?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="bg-indigo-800 p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              AI-Powered Descriptions
            </h3>
            <p className="text-lg">
              Automatically generate descriptive, high-quality content for your
              videos.
            </p>
          </div>
          <div className="bg-indigo-800 p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">Seamless Integration</h3>
            <p className="text-lg">
              Integrate effortlessly with your existing video platforms for
              smooth deployment.
            </p>
          </div>
          <div className="bg-indigo-800 p-8 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4">
              Enhanced Accessibility
            </h3>
            <p className="text-lg">
              Make your content more inclusive and engaging by adding
              descriptions for all.
            </p>
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <footer className="w-full bg-indigo-800 py-8 text-center text-gray-200">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} NarrifAI. All rights reserved.
        </p>
        <p className="text-sm mt-2">
          <a href="/privacy-policy" className="text-yellow-400 hover:underline">
            Privacy Policy
          </a>{" "}
          |{" "}
          <a
            href="/terms-of-service"
            className="text-yellow-400 hover:underline"
          >
            Terms of Service
          </a>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
