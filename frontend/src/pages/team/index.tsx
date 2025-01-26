import React from 'react';

const Team = () => {
  const teamMembers = [
    {
      name: 'Leon',
      role: 'Fullstack Developer',
      image: '/images/leon.jpg', // 替换为实际图片路径
    },
    {
      name: 'Ozan',
      role: 'Fullstack Developer',
      image: '/images/ozan.jpg', // 替换为实际图片路径
    },
    {
      name: 'Weijia',
      role: 'Fullstack Developer',
      image: '/images/weijia.jpg', // 替换为实际图片路径
    },
    {
      name: 'Yagmur',
      role: 'Fullstack Developer',
      image: '/images/yagmur.jpg', // 替换为实际图片路径
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-600 to-indigo-500 text-gray-100">
      {/* Header */}
      <header className="bg-white shadow-md w-full">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-4xl font-bold text-center text-indigo-900">
            The Team behind NarrifAI
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Team Intro */}
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Our Team</h2>
          <p className="text-lg text-gray-200 mb-8">
            We are a passionate team dedicated to building NarrifAI, a tool that
            transforms video content into accessible and engaging experiences.
          </p>
          <h3 className="text-xl font-bold text-yellow-400 mb-6">Meet the Team</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamMembers.map((member, index) => (
              <div key={index} className="bg-gray-700 rounded-lg shadow-md overflow-hidden">
                {/* Photo */}
                <div className="w-full h-48 bg-gray-600 flex items-center justify-center">
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
                <div className="p-4">
                  <h4 className="text-lg font-bold text-yellow-400">{member.name}</h4>
                  <p className="text-gray-200">{member.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="bg-gray-800 p-8 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-yellow-400 mb-4">Contact Us</h2>
          <p className="text-lg text-gray-200 mb-6">
            If you have any questions or need further assistance, feel free to
            reach out to us. We're here to help!
          </p>
          <div className="space-y-4">
            <div className="flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-yellow-400 mr-2"
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
                className="text-gray-200 hover:text-yellow-400"
              >
                support@narrifai.com
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Team;