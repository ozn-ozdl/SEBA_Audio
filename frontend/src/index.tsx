import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import "./index.css";
import { Dashboard } from "./pages/dashboard/index";
import LandingPage from "./pages/landingPage";
import { WorkSpace } from "./pages/workspace/oldFiles/index";
import { SideBar } from "./components/SideBar";
import reportWebVitals from "./reportWebVitals";
import PrivateRoute from "./routes/PrivateRoute";

import Workspace2 from "./pages/workspace/oldFiles/index2";
import Workspace3 from "./pages/workspace/index3";
import App from "./App";
import Tutorial from "./pages/tutorial/index";
import FAQ from "./pages/faq/index";
import Team from "./pages/team/index";
import Login from "./pages/login/login"; 

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const isAuthenticated = !!localStorage.getItem("loggedInUser");

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
        />

        <Route element={<PrivateRoute />}>
          <Route
            path="*"
            element={
              <div className="h-full w-full flex">
                <SideBar />
                <div className="grow h-screen overflow-y-auto">
                  <Routes>
                    <Route path="dashboard" element={<Dashboard />} />
                    <Route path="workspace" element={<Workspace3 />} />
                    <Route path="faq" element={<FAQ />} />
                    <Route path="tutorial" element={<Tutorial />} />
                    <Route path="team" element={<Team />} />
                    <Route path="app" element={<WorkSpace />} />
                  </Routes>
                </div>
              </div>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
