import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Dashboard } from "./pages/dashboard/index";
import LandingPage from "./pages/landingPage";
import { WorkSpace } from "./pages/workspace/index";
import { SideBar } from "./components/SideBar";
import reportWebVitals from "./reportWebVitals";

import Workspace2 from "./pages/workspace/index2";
import Workspace3 from "./pages/workspace/index3";
import App from "./App";
import Tutorial from "./pages/tutorial/index";
import FAQ from "./pages/faq/index";
import Team from "./pages/team/index";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="*"
          element={
            <div className="h-full w-full flex">
              <SideBar />
              <div className="grow h-screen overflow-y-auto">
                <Routes>
                  <Route path="workspace" element={<Workspace3 />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="main" element={<App />} />
                  <Route path="faq" element={<FAQ />} />
                  <Route path="tutorial" element={<Tutorial />} />
                  <Route path="team" element={<Team />} />
                  <Route path="app" element={<WorkSpace />} />
                </Routes>
              </div>
            </div>
          }
        />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
