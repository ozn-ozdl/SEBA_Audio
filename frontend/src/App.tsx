import React from "react";
import logo from "./logo.svg";
import "./App.css";
import { Button } from "./components/ui/button";

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>
          Edit <code>src/App.tsx</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <a
          className="text-blue-400 underline mt-4"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
        <div className="mt-4">
          <Button variant="secondary" className="ml-2">
            Secondary Button
          </Button>
        </div>
      </header>
    </div>
  );
}

export default App;
