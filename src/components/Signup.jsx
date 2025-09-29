import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:5000/signup", { username, password });
      alert("User created successfully! Login now.");
      navigate("/login");
    } catch (error) {
      alert(error.response?.data || "Signup failed");
    }
  };

  return (
    <div className="auth-container">
      <h2 className="auth-title">Signup</h2>
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
          Signup
        </button>
      </form>
      <p className="auth-footer">
        Already have an account?{" "}
        <Link to="/login" className="auth-link">
          Login Here
        </Link>
      </p>
    </div>
  );
}

export default Signup;
