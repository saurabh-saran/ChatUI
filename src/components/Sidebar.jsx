import {
  FaHome,
  FaCalendarAlt,
  FaUserFriends,
  FaFolderOpen,
  FaSignOutAlt,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom"; // +++
import "./Sidebar.css";

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate(); // +++

  function handleLogout() {
    localStorage.removeItem("user");
    if (onLogout) onLogout();
    navigate("/login");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">M</div>
        <div>
          <div className="sidebar-title">Modernize</div>
          <div className="sidebar-role">Admin</div>
        </div>
      </div>
      <nav className="sidebar-menu">
        <div className="sidebar-item active">
          <FaHome className="sidebar-icon" />
          Chats
        </div>
        <div className="sidebar-item">
          <FaFolderOpen className="sidebar-icon" />
          Apps
        </div>
        <div className="sidebar-item">
          <FaUserFriends className="sidebar-icon" />
          Home
        </div>
        <div className="sidebar-item">
          <FaCalendarAlt className="sidebar-icon" />
          Calendar
        </div>
        <div className="sidebar-item">
          <FaUserFriends className="sidebar-icon" />
          Users
        </div>
      </nav>
      <div className="sidebar-footer">
        <div>
          <div className="sidebar-profile-name">Saurabh</div>
          <div className="sidebar-profile-role">Designer</div>
        </div>
        <FaSignOutAlt
          className="sidebar-logout"
          onClick={handleLogout}
          title="Logout"
        />
      </div>
    </aside>
  );
}
