import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const [name, setName] = useState(""); // 🆕 Name hinzufügen
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState("");

  const getUsers = () => JSON.parse(localStorage.getItem("users") || "[]");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();

    if (isRegistering) {
      // Check if user already exists
      if (users.some((user: any) => user.email === email)) {
        setError("User already exists!");
        return;
      }
      // Add new user with name
      users.push({ name, email, password }); // 🆕 Name speichern
      localStorage.setItem("users", JSON.stringify(users));
    } else {
      // Check login
      const user = users.find(
        (user: any) => user.email === email && user.password === password
      );
      if (!user) {
        setError("Invalid credentials!");
        return;
      }
      // Save logged in user data
      localStorage.setItem("loggedInUser", JSON.stringify(user)); // 🆕 User-Daten inkl. Name speichern
    }

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-12 rounded shadow-lg w-1/3">
        <h2 className="text-3xl font-bold mb-8 text-center">
          {isRegistering ? "Register" : "Login"}
        </h2>

        {error && <p className="text-red-500 mb-4">{error}</p>}

        <form onSubmit={handleSubmit}>
          {isRegistering && ( // 🆕 Zeige Namensfeld nur bei Registrierung an
            <input
              type="text"
              placeholder="Name"
              className="w-full p-4 text-lg border rounded mb-6 focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="Email"
            className="w-full p-4 text-lg border rounded mb-6 focus:ring-2 focus:ring-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full p-4 text-lg border rounded mb-6 focus:ring-2 focus:ring-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-blue-500 text-white p-4 text-lg rounded hover:bg-blue-600 transition"
          >
            {isRegistering ? "Sign Up" : "Login"}
          </button>
        </form>

        <p className="text-center mt-6 text-lg">
          {isRegistering ? "Already have an account?" : "Don't have an account?"}
          <button
            className="text-blue-500 underline ml-2"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "Login" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
