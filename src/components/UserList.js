import React from "react";
import "./UserList.css";

// Generates pastel color for avatars
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++)
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  const color = `hsl(${hash % 360},75%,79%)`;
  return color;
}

export default function UserList({
  users = [],
  selectedUser,
  onSelectUser,
  currentUser, // <-- prop name yahi hona chahiye!
}) {
  // Safe default for currentUser
  // Yahi check: currentUser me username ho ➔ wahi dikhana
  const userObj =
    currentUser && currentUser.username
      ? currentUser
      : { username: "", role: "" };

  return (
    <div className="userlist-panel">
      {/* Top User Section */}
      <div className="userlist-usercard">
        <div
          className="userlist-usercard-avatar"
          style={{ background: stringToColor(userObj.username || "") }}
        >
          {userObj.username ? userObj.username[0].toUpperCase() : "?"}
        </div>
        <div>
          <div className="userlist-usercard-name">
            {/* No 'No User', bas username */}
            {userObj.username || ""}
          </div>
          <div className="userlist-usercard-role">{userObj.role || "User"}</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="userlist-searchbar">
        <input className="userlist-searchinput" placeholder="Search contacts" />
      </div>

      {/* Users List */}
      <ul className="userlist-list">
        {users.length === 0 && (
          <li className="userlist-empty">No users found</li>
        )}
        {users.map((u) => (
          <li
            key={u.username}
            className={
              "userlist-item" +
              (selectedUser && selectedUser.username === u.username
                ? " userlist-item-active"
                : "")
            }
            onClick={() => onSelectUser(u)}
          >
            <div
              className="userlist-avatar"
              style={{ background: stringToColor(u.username) }}
            >
              {u.username[0] ? u.username[0].toUpperCase() : "👤"}
            </div>
            <div className="userlist-mid">
              <span className="userlist-name">{u.username}</span>
              <div className="userlist-statusmsg">
                {u.lastMessage || "No messages yet"}
              </div>
            </div>
            <div className="userlist-right">
              <span
                className={
                  u.online
                    ? "userlist-dot userlist-dot-online"
                    : "userlist-dot userlist-dot-offline"
                }
                title={u.online ? "Online" : "Offline"}
              />
              <span className="userlist-time">
                {u.lastMessageTime ? u.lastMessageTime : ""}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
