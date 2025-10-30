import { useState } from "react";
import { login } from "../api/api";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    try {
      const result = await login(username, password);
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div
      className="flex items-center justify-center h-screen bg-cover bg-center relative"
      style={{
        backgroundImage: "url('/bg1.jpg')", // 👈 place your GIF file in /public
      }}
    >
      {/* Overlay for better text contrast */}
      <div className="absolute inset-0 bg-black/50"></div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-lg w-96 flex flex-col items-center"
      >
        {/* Logo at the top */}
        <img
          src="/DCHO Logo.png" // 👈 place your logo inside /public as logo.png
          alt="DocuTrack Logo"
          className="w-20 h-20 mb-4 rounded-full object-contain shadow-md"
        />

        <h2 className="text-2xl font-bold mb-6 text-center text-[#23297A]">
          DocuTrack Login
        </h2>

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#23297A]"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#23297A]"
        />

        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          className="w-full bg-[#23297A] hover:bg-[#1E2A9D] text-white py-2 rounded-md font-semibold transition-colors"
        >
          Log In
        </button>
      </form>
    </div>
  );
}
