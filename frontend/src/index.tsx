import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./index.css";
import { Dashboard } from "./pages/dashboard/index";
import LandingPage from "./pages/landingPage";
import { WorkSpace } from "./pages/workspace/index";
import reportWebVitals from "./reportWebVitals";
import App from "./App";
import FAQPage from "./FAQPage";


const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="workspace" element={<WorkSpace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="main" element={<App />} />
        <Route path="faq" element={<FAQPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
