//import faqImage from "./faq.png";
import React from "react";

const TutorialPage: React.FC = () => {
  const steps = [
    {
      title: "Step 1: Upload Your Video",
      description: (
        <p>
          Go to the video upload section and choose the video you want to process.
          Supported formats include MP4, AVI, and MOV.
        </p>
      ),
    },
    {
      title: "Step 2: Choose an Analysis Method",
      description: (
        <>
          <p>
            Select one of the following analysis methods based on your needs:
          </p>
          <ul className="list-disc ml-6">
            <li>
              <strong>OpenAI with Images:</strong> Processes the video using
              OpenAI and image analysis.
            </li>
            <li>
              <strong>Gemini Only Video:</strong> Focuses solely on video
              processing.
            </li>
            <li>
              <strong>Gemini Optimized:</strong> Our recommended method,
              providing the best results with enhanced analysis.
            </li>
          </ul>
        </>
      ),
    },
    {
      title: "Step 3: View Results",
      description: (
        <p>
          Depending on the method you choose and the size of the uploaded video, 
          you'll be delighted to see the timestamps and descriptions of what's happening 
          in the video in just a few minutes!
        </p>
      ),
    },
    {
      title: "Step 4: Listen to Descriptions",
      description: (
        <p>
          Use the "Play Audio" button to hear the descriptions of the video. You
          can pause or stop the audio anytime.
        </p>
      ),
    },
    {
      title: "Step 5: Download Finalized Video",
      description: (
        <p>
          Click the "Finalize and Encode Video" button to download the video with
          subtitles embedded.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-600 to-indigo-500 text-gray-100">
      <header className="bg-white shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-4xl font-bold text-center text-indigo-900">
          Getting Started: How to use NarrifAI
          </h1>
        </div>
      </header>
      <main className="flex flex-col md:flex-row items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 gap-16">
        {/* Left: Texts */}
        <div className="w-full md:w-1/2 space-y-8">
          {steps.map((step, index) => (
            <div key={index} className="space-y-4">
              <h2 className="text-2xl font-bold text-yellow-400">
                {step.title}
              </h2>
              <div className="text-lg text-gray-200">{step.description}</div>
            </div>
          ))}
        </div>

        {/* Right: Screenshots */}
        <div className="w-full md:w-1/2">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">
              Screenshots TBD
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-700 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Screenshot Placeholder 1</p>
              </div>
              <div className="bg-gray-700 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Screenshot Placeholder 2</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TutorialPage;