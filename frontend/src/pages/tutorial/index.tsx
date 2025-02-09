import React from "react";
import faqimg from './faq.png';
import dashboardimg from './Dashboard_Create.png';
import editorimg from './Editor.png';
import saveimg from './Save_EncodeVideo.png';
import uploadimg from './Upload_AnalyzeVideo.png';

const TutorialPage: React.FC = () => {
  const steps = [
    {
      title: "Step 1: Create Project",
      description: (
        <p>
          When you click <strong>Get Started for Free</strong> on the home page, 
          you'll be redirected to the <strong>Dashboard</strong>.
          This is your central hub where you'll find the project overview.
          <br />
          <br />
          You can enter a project name in the top right corner and click <strong>Create Project</strong>!
          Once you've created a new project, 
          you'll be shown the workspace page.
        </p>
      ),
    },
    {
      title: "Step 2: Upload Your Video",
      description: (
        <p>
          Go to the video upload section on the right and choose the video you want to process.
          Supported formats include MP4, AVI, and MOV.
        </p>
      ),
    },
    {
      title: "Step 3: Analyze Your Video",
      description: (
        <p>
          Shall we start analyzing your video using <strong>NarrifAI</strong>?
          If yes, let's click the <strong>Analyze Video</strong> button on the top right!
        </p>
      ),
    },
    {
      title: "Step 4: View Results",
      description: (
        <p>
          Depending on the size of the uploaded video, you'll be delighted to see the timestamps 
          and descriptions of what's happening in the video in just a few minutes!
        </p>
      ),
    },
    {
      title: "Step 5: More Tools",
      description: (
        <p>
          Hit the Play icon to check if the generated descriptions match the actual content.
          <br />
          <br />
          You can save your work whenever you want in the bottom right corner.
          <br />
          <br />
          You can also use <strong>Regenerate</strong> and the other tools, such as adding new scenes, 
          to make the work fit your needs.
        </p>
      ),
    },
    {
      title: "Step 6: Download Encoded Video",
      description: (
        <p>
          Click the <strong>Encode Video</strong> button to download the video with
          subtitles embedded. Enjoy your time with it!
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8 flex justify-between items-center ">
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
              <div key={index} className="bg-white p-8 rounded-lg shadow-lg hover:shadow-xl transition-shadow">
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
            <div className="bg-gray-100 h-96 rounded-lg flex flex-col items-center justify-center p-4 hover:shadow-xl transition-shadow">
                <img src={dashboardimg} className="h-full w-full object-contain" />
                <p className="text-gray-700 mt-2 text-center">Step 1: Create Project</p>
              </div>

              <div className="bg-gray-100 h-96 rounded-lg flex flex-col items-center justify-center p-4 hover:shadow-xl transition-shadow">
                <img src={uploadimg} className="h-full object-contain" />
                <p className="text-gray-700 mt-2 text-center">Step 2: Upload Your Video</p>
              </div>

              <div className="bg-gray-100 h-96 rounded-lg flex flex-col items-center justify-center p-4 hover:shadow-xl transition-shadow">
                <img src={editorimg} className="h-full w-full object-contain" />
                <p className="text-gray-700 mt-2 text-center">Step 3-4: View & Edit Video</p>
              </div>

              <div className="bg-gray-100 h-96 rounded-lg flex flex-col items-center justify-center p-4 hover:shadow-xl transition-shadow">
                <img src={saveimg} className="h-full w-full object-contain" />
                <p className="text-gray-700 mt-2 text-center">Step 5-6: Save & Export</p>
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
