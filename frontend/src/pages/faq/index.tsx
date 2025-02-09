import React, { useState } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../../components/ui/accordion";

const FAQPage: React.FC = () => {
  const [search, setSearch] = useState("");

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

  const filteredFaqs = faqs.filter((faq) =>
    faq.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gradient-to-r from-indigo-500 to-purple-500 shadow-md w-full text-white">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h1 className="text-5xl font-bold">Frequently Asked Questions</h1>
          <p className="mt-6 text-xl leading-relaxed">
            Quick answers to questions you may have about NarrifAI. Can't find
            what you're looking for? Check out our{" "}
            <a href="/documentation" className="text-yellow-300 underline">
              full documentation
            </a>
            .
          </p>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search FAQs..."
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-300"
          />
        </div>
        <Accordion type="single" collapsible className="space-y-6">
          {filteredFaqs.map((faq, index) => (
            <AccordionItem key={index} value={`faq-${index}`}>
              <AccordionTrigger className="text-2xl font-semibold py-4 flex items-center gap-2">
                <svg
                  className="w-6 h-6 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 12h14m-7-7v14"
                  />
                </svg>
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-lg leading-relaxed py-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
    </div>
  );
};

export default FAQPage;