import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { io } from "socket.io-client";

const socket = io("http://localhost:5000");

function UserList({ user, onSelectUser, onLogout }) {
  const [users, setUsers] = useState([]);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:5000/users");
      const filteredUsers = res.data.filter(
        (u) => u.username !== user.username
      );
      setUsers(filteredUsers);
    } catch {
      alert("Failed to load users");
    }
  }, [user.username]);

  useEffect(() => {
    fetchUsers();
    socket.emit("userOnline", user.username);

    socket.on("updateUserList", (onlineUsers) => {
      setUsers((prevUsers) =>
        prevUsers.map((u) => ({
          ...u,
          online: onlineUsers.includes(u.username),
        }))
      );
    });

    return () => {
      socket.off("updateUserList");
    };
  }, [fetchUsers, user.username]);

  return (
    <div
      style={{
        maxWidth: 400,
        margin: "60px auto",
        padding: "38px 32px 30px 32px",
        boxShadow: "0 8px 24px #1f539830",
        borderRadius: 22,
        fontFamily: "sans-serif",
        background: "#f4f9fc",
        textAlign: "center",
        minHeight: 395,
      }}
    >
      {/* Welcome line */}
      <div
        style={{
          marginBottom: 15,
          fontSize: "23px",
          fontWeight: 700,
          color: "#1f2353",
          letterSpacing: "1px",
        }}
      >
        <span
          style={{
            color: "#2c63e4",
            fontSize: 28,
            marginRight: 6,
          }}
        >
          👋
        </span>
        Welcome, {user.username}
      </div>
      {/* Logout button */}
      <button
        onClick={onLogout}
        style={{
          marginBottom: 26,
          border: "none",
          background: "linear-gradient(90deg,#3f87f5,#22d6ce)",
          color: "#fff",
          padding: "10px 34px",
          borderRadius: 10,
          fontWeight: 600,
          fontSize: 16,
          letterSpacing: "1px",
          boxShadow: "0 1px 10px #2c63e430",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
      {/* Users list heading */}
      <h3
        style={{
          color: "#1969ec",
          fontFamily: "inherit",
          marginBottom: "18px",
          fontSize: "20px",
          letterSpacing: "1px",
        }}
      >
        Users
      </h3>
      {/* Users list */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {users.length === 0 && (
          <li style={{ color: "#707070", fontSize: 16, margin: "24px 0" }}>
            No users found
          </li>
        )}
        {users.map((u) => (
          <li
            key={u.username}
            onClick={() => onSelectUser(u.username)}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 18px",
              margin: "10px 0",
              backgroundColor: u.online ? "#e5f2ff" : "#f6f7f9",
              color: "#222",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: "520",
              fontSize: 17,
              boxShadow: u.online ? "0 2px 9px #27a7e410" : "none",
              border: u.online ? "1.5px solid #2c63e4" : "1.5px solid #edeff0",
              transition: "background 0.22s,border 0.22s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#d0eafd")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = u.online
                ? "#e5f2ff"
                : "#f6f7f9")
            }
          >
            <span style={{ fontWeight: 600 }}>{u.username}</span>
            <span
              style={{
                display: "inline-block",
                padding: "5px 14px",
                borderRadius: 24,
                fontSize: 15,
                background: u.online
                  ? "linear-gradient(90deg,#3f87f5,#22d6ce)"
                  : "#e1e1e3",
                color: u.online ? "#fff" : "#57606e",
                fontWeight: 600,
                marginLeft: 10,
                letterSpacing: "0.5px",
              }}
            >
              {u.online ? "Online" : "Offline"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserList;
