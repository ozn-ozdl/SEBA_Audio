import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const demoUser = {
  username: "SEBA Entertainment",
  password: "demo", 
};

const LoginPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const searchParams = new URLSearchParams(location.search);
  const nextPage = searchParams.get("next") || "/dashboard";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notification, setNotification] = useState(""); // Notification state

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (username === demoUser.username && password === demoUser.password) {
      localStorage.setItem("currentUser", username);
      navigate("/dashboard");
    } else {
      setError("Invalid username or password");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    demoUser.username = username;
    demoUser.password = password;
  
    const usersData = JSON.parse(localStorage.getItem("users") || "{}");
  
    usersData[username] = { projects: [] };
  
    // Save the updated users object back to localStorage
    localStorage.setItem("users", JSON.stringify(usersData));
  
    // Set currentUser
    localStorage.setItem("currentUser", username);
    setNotification("Registration successful, please log in with your new account!");
    setTimeout(() => {
      setNotification("");
      setIsLoginMode(true);
    }, 4000);
  };

  const [isLoginMode, setIsLoginMode] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md bg-white p-8 rounded shadow">
        {/* Notification Message */}
        {notification && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 border border-green-300 rounded text-center">
            {notification}
          </div>
        )}
        <h2 className="text-2xl mb-6 text-center">
          {isLoginMode ? "Login" : "Sign Up"}
        </h2>
        <form onSubmit={isLoginMode ? handleLogin : handleSignUp}>
          <div className="mb-4">
            <label className="block mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          {error && <p className="mb-4 text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-500"
          >
            {isLoginMode ? "Login" : "Sign Up"}
          </button>
        </form>
        <div className="mt-4 text-center">
          {isLoginMode ? (
            <p>
              Don't have an account?{" "}
              <button
                onClick={() => {
                  setError("");
                  setIsLoginMode(false);
                }}
                className="text-indigo-600 hover:underline"
              >
                Sign Up
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => {
                  setError("");
                  setIsLoginMode(true);
                }}
                className="text-indigo-600 hover:underline"
              >
                Login
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
