import React from "react";
import { Button } from "../../components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion";

const LandingPage: React.FC = () => {
  const faqs = [
    {
      question: "How does audio description work?",
      answer:
        "Audio description leverages AI to analyze video content, identify key visual elements, and generate descriptive audio tracks. This ensures that visually impaired users can fully understand the context and narrative of a video.",
    },
    {
      question: "What technologies does NarrifAI use for video description?",
      answer:
        "NarrifAI uses advanced technologies like the scene detection framework and the Gemini processing engine for generating highly accurate and context-aware descriptions. Additionally, we integrate Google Text-to-Speech for high-quality audio output.",
    },
    {
      question: "What is the European Accessibility Act?",
      answer:
        "The European Accessibility Act is a directive that requires digital products and services to be accessible to all users, including those with disabilities. This includes providing features like audio descriptions, captions, and other accessibility tools for digital content.",
    },
    {
      question: "What export options are available?",
      answer:
        "NarrifAI supports multiple export options, including MP3 for audio-only files, SRT for subtitles, and fully encoded videos with embedded audio descriptions and subtitles. These options ensure flexibility for various use cases.",
    },
    {
      question: "What happens when there is speech in the video?",
      answer:
        "NarrifAI ensures a seamless listening experience by avoiding overlaps between speech and audio descriptions. Descriptions are only added during pauses or moments without talking, ensuring that the original dialogue remains clear and uninterrupted.",
    },
    {
      question: "Can I preview the generated descriptions before exporting?",
      answer:
        "Yes! You can preview audio descriptions and transcripts within the platform. You also have the flexibility to manually adjust video descriptions and fine-tune timestamps to ensure the final result meets your expectations.",
    },
    {
      question: "Is there a limit on the video length?",
      answer:
        "Currently, NarrifAI supports videos up to 10 minutes in length. For longer videos, we recommend splitting them into smaller parts for processing. We are actively working on optimizing the platform to support longer video inputs in the near future.",
    },
    {
      question: "How accurate are the transcriptions and descriptions?",
      answer:
        "The accuracy of transcriptions and descriptions is highly reliable and depends on the AI model used. While the outputs are generally precise, users have the flexibility to review and adjust the results for complete customization and optimal quality.",
    },
    {
      question: "Can I save my work?",
      answer:
        "Yes, NarrifAI provides a dashboard where all your previous work is saved directly in your browser. This allows you to revisit, review, and manage your projects anytime.",
    },
    {
      question: "What types of videos work best with NarrifAI?",
      answer:
        "NarrifAI works exceptionally well with entertainment videos, especially those where scenes do not change rapidly. Videos with steady visuals and clear audio yield the best results, ensuring accurate and context-aware descriptions.",
    },
    {
      question: "How long does it take to process a video?",
      answer:
        "Processing time depends on the video input, including factors like size, quality, and the number of scenes. Typically, it takes only a few minutes to process a video of under 10 minutes.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="w-full py-6 px-8 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">NarrifAI</h1>
      </header>

      <section className="flex flex-col items-center text-center px-4 py-16 sm:py-24">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl">
          AI-powered audio descriptions for everyone
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mt-6 max-w-2xl">
          Transform your visual content into rich, descriptive audio. Make your
          videos accessible to a broader audience with cutting-edge AI.
        </p>
        <Button
          className="mt-8 px-8 py-4 bg-indigo-600 text-white text-lg rounded-full shadow-md hover:bg-indigo-500 transition"
          onClick={() => (window.location.href = "/login?next=/dashboard")}
        >
          Get Started for Free
        </Button>

      </section>

      <section className="flex flex-col items-center justify-center py-16 px-4 bg-white">
        <h2 className="text-3xl font-semibold text-gray-800 mb-12">
          Turn this...
        </h2>
        <div className="w-full max-w-4xl">
          <video
            controls
            src="/demo/30_seconds_test_video.mp4"
            className="w-full h-auto rounded-lg shadow-lg mb-8"
          ></video>
        </div>
        <h2 className="text-3xl font-semibold text-gray-800 mb-12">
          ...Into this
        </h2>
        <div className="w-full max-w-4xl">
          <img
            src="/demo/visualization.png"
            alt="Audio description visualization"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-12">
          Why Choose NarrifAI?
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m4-16H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">AI-Powered Descriptions</h3>
            <p className="text-gray-600 mt-4">
              Automatically generate high-quality descriptions for your videos.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Seamless Integration</h3>
            <p className="text-gray-600 mt-4">
              Works effortlessly with your existing video platforms.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-6">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                className="w-8 h-8"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m4-16H5a2 2 0 00-2 2v16a2 2 0 002 2h14a2 2 0 002-2V4a2 2 0 00-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold">Enhanced Accessibility</h3>
            <p className="text-gray-600 mt-4">
              Make your content accessible and inclusive for all.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-white">
        <h2 className="text-3xl font-semibold text-center text-gray-800 mb-12">
          Frequently Asked Questions
        </h2>
        <Accordion
          type="single"
          collapsible
          className="space-y-6 max-w-4xl mx-auto"
        >
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-xl font-semibold py-4 flex items-center justify-between">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-lg text-gray-700">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

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

export default LandingPage;
