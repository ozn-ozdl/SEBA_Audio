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
      question: "What do we do?",
      answer:
        "NarrifAI processes videos to extract transcripts, create detailed descriptions, and turn them into audio.",
    },
    {
      question: "How do I get started?",
      answer:
        "Upload your video, choose an analysis method, and view your results. You can then listen to audio descriptions.",
    },
    {
      question: "How does support work?",
      answer:
        "We offer 24/7 support to ensure your business runs smoothly at all times.",
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
