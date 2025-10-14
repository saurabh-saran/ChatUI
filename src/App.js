import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
// import UserCard from "./components/UserCard";
import UserList from "./components/UserList";
import ChatWindow from "./components/ChatWindow";
import Login from "./components/Login";
import Signup from "./components/Signup";
import axios from "axios";

function MainApp({ user, setUser }) {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
  const [showChat, setShowChat] = useState(false);
  const selectedUserObj = users.find(
    (u) => u.username === selectedUser?.username
  );

  useEffect(() => {
    const resizeHandler = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", resizeHandler);
    return () => window.removeEventListener("resize", resizeHandler);
  }, []);

  useEffect(() => {
    if (user) {
      axios
        .get(
          (process.env.REACT_APP_API_URL || "http://localhost:8000") + "/users"
        )
        .then((res) =>
          setUsers(res.data.filter((u) => u.username !== user.username))
        );
    }
  }, [user]);

  return (
    <div
      className="main-container"
      style={{ display: isMobile ? "block" : "flex", height: "100vh" }}
    >
      {!isMobile && (
        <Sidebar
          user={user}
          onLogout={() => {
            localStorage.removeItem("user");
            setUser(null);
            setSelectedUser(null);
            setShowChat(false);
          }}
        />
      )}
      {/* User List */}
      {(!isMobile || !showChat) && (
        <div
          className="userlist-panel"
          style={{
            width: isMobile ? "100vw" : 320,
            minWidth: isMobile ? undefined : 220,
            background: "#fff",
            borderRight: isMobile ? "none" : "1.5px solid #e0e4ee",
            height: "100vh",
            margin: 0,
            padding: 0,
            boxShadow: "1px 0 18px #e9edf7",
            position: "relative",
          }}
        >
          <UserList
            currentUser={user}
            users={users}
            selectedUser={selectedUser}
            onSelectUser={(u) => {
              setSelectedUser(u);
              if (isMobile) setShowChat(true);
            }}
          />
        </div>
      )}
      {/* Chat Window */}
      {selectedUser && (!isMobile || showChat) && (
        <div
          className="chat-panel"
          style={{
            flex: 1,
            minWidth: isMobile ? "100vw" : 350,
            height: "100vh",
            background: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ChatWindow
            user={user}
            chatWith={selectedUser.username}
            chatWithStatus={selectedUserObj?.online ? "Online" : "Offline"}
            onBack={() => (isMobile ? setShowChat(false) : null)}
            isMobile={isMobile}
          />
        </div>
      )}
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) setUser(JSON.parse(stored));
  }, []);

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Login onLogin={setUser} /> : <Navigate to="/" />}
        />
        <Route
          path="/signup"
          element={!user ? <Signup /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            user ? (
              <MainApp user={user} setUser={setUser} />
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to={user ? "/" : "/login"} />} />
      </Routes>
    </Router>
  );
}

export default App;
