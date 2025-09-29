import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // backend का live URL env से लें
  const API_URL = process.env.REACT_APP_API_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // API call environment variable से URL के साथ
      const res = await axios.post(`${API_URL}/login`, {
        username,
        password,
      });
      localStorage.setItem("user", JSON.stringify(res.data));
      onLogin(res.data);
      navigate("/");
    } catch (error) {
      alert(error.response?.data || "Login failed");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Login</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          className="auth-input"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          autoFocus
        />
        <input
          className="auth-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="auth-btn">
          Login
        </button>
      </form>
      <p className="auth-footer">
        New User?{" "}
        <Link to="/signup" className="auth-link">
          Signup Here
        </Link>
      </p>
    </div>
  );
}

export default Login;
