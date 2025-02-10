import React from "react";
import leonimg from './leon.jpg'
import ozanimg from './ozan.jpg'
import weijiaimg from './weijia.jpg'
import yagmurimg from './yagmur.jpg'

const TeamPage: React.FC = () => {
  const teamMembers = [
    {
      name: "Leon",
      role: "Fullstack Developer",
      image: leonimg, // 2. 使用导入的图片变量
    },
    {
      name: "Ozan",
      role: "Fullstack Developer",
      image: ozanimg,
    },
    {
      name: "Weijia",
      role: "Fullstack Developer",
      image: weijiaimg,
    },
    {
      name: "Yagmur",
      role: "Fullstack Developer",
      image: yagmurimg,
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
        {/* Team Intro */}
        <section className="flex flex-col items-center text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl mb-6">
            The Team Behind NarrifAI
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl">
            We are a passionate team dedicated to building NarrifAI, a tool that
            transforms video content into accessible and engaging experiences.
          </p>
        </section>

        {/* Team Members */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-lg overflow-hidden text-center"
            >
              {/* Photo */}
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                {member.image ? (
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-gray-400">No Image</span>
                )}
              </div>
              {/* Team Member Name and Role */}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-800">{member.name}</h3>
                <p className="text-gray-600 mt-2">{member.role}</p>
              </div>
            </div>
          ))}
        </section>

        {/* Contact Section */}
        {/* <section className="mt-16 bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
            Contact Us
          </h2>
          <p className="text-lg text-gray-600 text-center mb-8">
            If you have any questions or need further assistance, feel free to
            reach out to us. We're here to help!
          </p>
          <div className="flex justify-center items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-indigo-600 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <a
              href="mailto:support@narrifai.com"
              className="text-indigo-600 hover:text-indigo-500 text-lg"
            >
              support@narrifai.com
            </a>
          </div>
        </section> */}
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

export default TeamPage;