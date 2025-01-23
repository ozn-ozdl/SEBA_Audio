import React, { useState } from "react";
import faqImage from "./faq.png";

const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: "What do we do?",
      answer: (
        <p>
          NarrifAI processes videos to extract transcripts, create detailed
          descriptions, and turn them into audio. We make it easy to transform
          video content into accessible and engaging experiences.
        </p>
      ),
    },
    {
      question: "How do I get started?",
      answer: (
        <>
          <p>
            Getting started with NarrifAI is simple and straightforward. Follow
            these steps:
          </p>
          <ol className="list-decimal ml-6">
            <li>
              <strong>Upload Your Video:</strong> Go to the video upload section
              and choose the video you want to process.
            </li>
            <li>
              <strong>Choose an Analysis Method:</strong>
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
            </li>
            <li>
              <strong>View Results:</strong> After about 1 minute (depending on
              your selected method), you'll see timestamps and descriptions of
              what’s happening in the video.
            </li>
            <li>
              <strong>Listen to Descriptions:</strong> Use the "Play Audio"
              button to hear the descriptions of the video. You can pause or
              stop the audio anytime.
            </li>
            <li>
              <strong>Download Finalized Video:</strong> Click the "Finalize and
              Encode Video" button to download the video with subtitles
              embedded.
            </li>
          </ol>
          <p>
            With NarrifAI, you can make your video content more accessible and
            engaging in just a few clicks!
          </p>
        </>
      ),
    },
    {
      question: "How does support work?",
      answer: (
        <p>
          We offer 24/7 support to ensure your business runs smoothly at all
          times.
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-600 to-indigo-500 text-gray-100">
      <header className="bg-white shadow-md w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-4xl font-bold text-center text-indigo-900">
            Frequently Asked Questions
          </h1>
        </div>
      </header>
      <main className="flex flex-col md:flex-row items-center justify-center w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 gap-16">
        <div className="flex-shrink-0 w-full md:w-1/3">
          <img
            src={faqImage}
            alt="FAQ Illustration"
            className="w-full h-auto rounded-lg shadow-lg"
          />
        </div>
        <div className="w-full md:w-2/3 space-y-6">
          {faqs.map((faq, index) => (
            <div key={index} className="border-b border-purple-400">
              <button
                className="w-full text-left py-4 text-2xl font-bold flex justify-between items-center text-yellow-400 transition-all duration-300"
                onClick={() => toggleFAQ(index)}
              >
                {faq.question}
                <span className="text-3xl">
                  {openIndex === index ? "-" : "+"}
                </span>
              </button>
              <div
                className={`overflow-hidden transition-all ease-out duration-500 ${
                  openIndex === index
                    ? "max-h-[500px] py-4 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <div className="text-lg text-gray-200">{faq.answer}</div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FAQPage;