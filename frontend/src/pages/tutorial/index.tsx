import React from "react";
import faqimg from './faq.png'

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
          you'll be delighted to see the timestamps and descriptions of what's
          happening in the video in just a few minutes!
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
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">NarrifAI</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-16">
        {/* Tutorial Intro */}
        <section className="flex flex-col items-center text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl mb-6">
            Getting Started: How to Use NarrifAI
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl">
            Follow these simple steps to transform your videos into accessible
            and engaging content with NarrifAI.
          </p>
        </section>

        {/* Tutorial Steps */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-7xl mx-auto">
          {/* Left: Steps */}
          <div className="space-y-8">
            {steps.map((step, index) => (
              <div key={index} className="bg-white p-8 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-indigo-600 mb-4">
                  {step.title}
                </h2>
                <div className="text-lg text-gray-700">{step.description}</div>
              </div>
            ))}
          </div>

          {/* Right: Screenshots */}
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h3 className="text-2xl font-bold text-indigo-600 mb-6">
              Screenshots
            </h3>
            <div className="space-y-6">
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                  <img src={faqimg} className="h-full object-cover w-full"/>
              </div>
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Screenshot Placeholder 2</p>
              </div>
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Screenshot Placeholder 3</p>
              </div>
              <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">Screenshot Placeholder 4</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 py-8 text-center text-gray-200">
        <p>&copy; {new Date().getFullYear()} NarrifAI. All rights reserved.</p>
        <p className="mt-2">
          <a href="/privacy-policy" className="text-indigo-400 hover:underline">
            Privacy Policy
          </a>{" "}
          |{" "}
          <a
            href="/terms-of-service"
            className="text-indigo-400 hover:underline"
          >
            Terms of Service
          </a>
        </p>
      </footer>
    </div>
  );
};

export default TutorialPage;