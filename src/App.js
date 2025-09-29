import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import Login from "./components/Login";
import Signup from "./components/Signup";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";
import "./App.css";

function App() {
  const [user, setUser] = useState(null);
  const [chatWith, setChatWith] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
    setChatWith(null);
  };

  return (
    <Router>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login onLogin={setUser} />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <>
            <Route
              path="/"
              element={
                chatWith ? (
                  <ChatWindow
                    user={user}
                    chatWith={chatWith}
                    onBack={() => setChatWith(null)}
                  />
                ) : (
                  <UserList
                    user={user}
                    onSelectUser={setChatWith}
                    onLogout={handleLogout}
                  />
                )
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
    </Router>
  );
}

export default App;
