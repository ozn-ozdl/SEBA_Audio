import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, HelpCircle, ChevronDown, ChevronUp, Users } from 'lucide-react';

export function SideBar() {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const toggleHelp = () => {
    setIsHelpOpen(!isHelpOpen);
  };

  return (
    <div className="h-full w-64 bg-gray-900 text-white p-4 flex flex-col">
      {/* Header Top */}
      <div>
        <div className="flex items-center justify-center mb-8">
          <h1 className="text-xl font-bold">NarrifAI</h1>
        </div>
        <nav>
          <ul>
            {/* Dashboard */}
            <li className="mb-4">
              <Link
                to="/dashboard"
                className="flex justify-center items-center hover:bg-gray-700 p-2 rounded"
              >
                <LayoutDashboard className="mr-2" />
                Dashboard
              </Link>
            </li>

            {/* Help Group */}
            <li className="mb-4">
              <div
                onClick={toggleHelp}
                className="flex justify-between items-center hover:bg-gray-700 p-2 rounded cursor-pointer"
              >
                {/* Help */}
                <div className="flex-1 flex justify-center items-center">
                  <HelpCircle className="mr-2" />
                  Help
                </div>
                {/* Arrow adj */}
                <div>
                  {isHelpOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Subcomponent */}
              {isHelpOpen && (
                <ul className="pl-6 mt-2 space-y-2">
                  <li>
                    <Link
                      to="/tutorial"
                      className="flex justify-center items-center hover:bg-gray-700 p-2 rounded"
                    >
                      Tutorial
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/faq"
                      className="flex justify-center items-center hover:bg-gray-700 p-2 rounded"
                    >
                      FAQ
                    </Link>
                  </li>
                </ul>
              )}
            </li>
          </ul>
        </nav>
      </div>

      {/* Our Team */}
      <div className="mt-auto p-4 border-t border-gray-700">
        <Link
          to="/team"
          className="flex justify-center items-center hover:bg-gray-700 p-2 rounded"
        >
          <Users className="mr-2" />
          <span className="font-bold">Our Team & Contact</span>
        </Link>
      </div>
    </div>
  );
}