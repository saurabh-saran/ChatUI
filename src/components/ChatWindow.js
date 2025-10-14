import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { FaPaperclip, FaMicrophone, FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import "./ChatWindowModern.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const socket = io(API_URL);

function ChatWindow({
  user,
  chatWith,
  chatWithStatus = "Offline",
  onBack,
  isMobile,
}) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef();
  const recordingIntervalRef = useRef(null);

  const mediaAttachments = useMemo(
    () =>
      messages.filter(
        (msg) =>
          (msg.messageType === "image" || msg.messageType === "video") &&
          msg.fileUrl
      ),
    [messages]
  );
  const documentAttachments = useMemo(
    () =>
      messages.filter(
        (msg) =>
          msg.messageType === "doc" ||
          (msg.fileUrl &&
            !["image", "video", "voice"].includes(msg.messageType))
      ),
    [messages]
  );

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await axios.get(
          `${API_URL}/messages?from=${user.username}&to=${chatWith}`
        );
        setMessages(res.data);
      } catch {
        alert("Failed to load chat history");
      }
    }
    fetchHistory();

    socket.emit("userOnline", user.username);

    socket.on("receiveMessage", (message) => {
      if (
        (message.from === chatWith && message.to === user.username) ||
        (message.from === user.username && message.to === chatWith)
      ) {
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m.timestamp === message.timestamp &&
              m.from === message.from &&
              m.message === message.message
          );
          if (!exists) return [...prev, message];
          return prev;
        });
      }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [chatWith, user.username]);

  const handleFileClip = () => fileInputRef.current.click();

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("audio/") &&
      !file.type.startsWith("video/") &&
      // !file.type.startsWith("application/pdf")
      file.type !== "application/pdf"
    ) {
      alert("Please select an image, audio, video, or pdf file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      alert("File size must be less than 15MB");
      return;
    }
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await axios.post(`${API_URL}/upload`, formData, {
        timeout: 30000,
      });

      if (response.data.success) {
        let messageType = "doc";
        if (file.type.startsWith("image/")) messageType = "image";
        else if (file.type.startsWith("audio/")) messageType = "voice";
        else if (file.type.startsWith("video/")) messageType = "video";
        else if (file.type === "application/pdf") messageType = "doc";

        const messageData = {
          from: user.username,
          to: chatWith,
          message:
            messageType === "image"
              ? "📷 Image"
              : messageType === "voice"
              ? "🎤 Voice message"
              : messageType === "video"
              ? "🎬 Video"
              : messageType === "doc"
              ? "📎 PDF Document"
              : "📎 Attachment",
          messageType,
          fileUrl: response.data.fileUrl,
          fileName: file.name,
          timestamp: new Date().toISOString(),
        };

        socket.emit("sendMessage", messageData);
      } else {
        throw new Error("Upload failed: " + response.data.error);
      }
    } catch (error) {
      alert("Failed to upload file: " + error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleMicClick = async () => {
    // ...voice recording logic same as previous code, no local setMessages update...
  };

  const handleEmojiClick = () => setShowEmoji((v) => !v);

  const onEmojiSelect = (emojiData) => {
    setInput(input + emojiData.emoji);
    setShowEmoji(false);
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const messageData = {
      from: user.username,
      to: chatWith,
      message: input.trim(),
      messageType: "text",
      timestamp: new Date().toISOString(),
    };
    socket.emit("sendMessage", messageData);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="modern-main-chat-flex">
      <div className="modern-chat-window">
        {isMobile && (
          <button className="chat-back-btn" onClick={onBack}>
            ← Users
          </button>
        )}
        <div className="chat-header">
          <div className="chat-header-info">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${chatWith}`}
              alt={chatWith}
              className="chat-header-avatar"
            />
            <div>
              <div className="chat-header-title">{chatWith}</div>
              <div className="chat-header-status">{chatWithStatus}</div>
            </div>
          </div>
          <div className="chat-header-actions">
            <span className="chat-header-icon" title="Call">
              📞
            </span>
            <span className="chat-header-icon" title="Video">
              🎥
            </span>
            <span className="chat-header-icon" title="More">
              ⋮
            </span>
          </div>
        </div>
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="msg-empty">No messages yet</div>
          )}
          {messages.map((msg, i) => (
            <div
              key={`${msg.timestamp}-${i}`}
              className={
                "chat-bubble " +
                (msg.from === user.username ? "from-me" : "from-other")
              }
            >
              <div>
                {msg.messageType === "image" && msg.fileUrl ? (
                  <img
                    src={msg.fileUrl}
                    className="bubble-img"
                    alt={msg.message}
                  />
                ) : msg.messageType === "voice" && msg.fileUrl ? (
                  <audio src={msg.fileUrl} controls style={{ width: 140 }} />
                ) : msg.messageType === "video" && msg.fileUrl ? (
                  <video src={msg.fileUrl} controls style={{ width: 180 }} />
                ) : msg.messageType === "doc" && msg.fileUrl ? (
                  <a
                    href={msg.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bubble-doc-link"
                  >
                    📎 {msg.fileName || "Document"}
                  </a>
                ) : (
                  <span>{msg.message}</span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="chat-input-bar">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,audio/*,video/*,application/pdf"
            style={{ display: "none" }}
            onChange={handleFileChange}
          />
          <FaPaperclip
            className="chat-input-icon"
            title="Attach"
            onClick={handleFileClip}
          />
          <FaMicrophone
            className="chat-input-icon"
            title="Voice"
            onClick={handleMicClick}
          />
          <FaRegSmile
            className="chat-input-icon"
            title="Emoji"
            onClick={handleEmojiClick}
          />
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={uploading}
            placeholder={uploading ? "Uploading..." : "Enter your message..."}
          />
          <button
            className="chat-send-btn"
            onClick={sendMessage}
            disabled={uploading || !input.trim()}
          >
            &gt;
          </button>
        </div>
        {showEmoji && (
          <div className="chat-emoji-popup">
            <EmojiPicker
              onEmojiClick={onEmojiSelect}
              width={350}
              height={420}
            />
          </div>
        )}
      </div>
      <div className="media-sidebar-panel">
        <div className="media-sidebar-title">Media & Attachments</div>
        <div className="media-section">
          <div className="media-section-title">
            Media ({mediaAttachments.length})
          </div>
          {mediaAttachments.length === 0 ? (
            <div className="media-empty">No media yet</div>
          ) : (
            <div className="media-preview-list">
              {mediaAttachments
                .slice(-3)
                .map((msg, i) =>
                  msg.messageType === "image" ? (
                    <img
                      src={msg.fileUrl}
                      alt="img"
                      className="media-preview-thumb"
                      key={i}
                    />
                  ) : msg.messageType === "video" ? (
                    <video
                      src={msg.fileUrl}
                      className="media-preview-thumb"
                      key={i}
                    />
                  ) : null
                )}
            </div>
          )}
        </div>
        <div className="media-section">
          <div className="media-section-title">
            Attachments ({documentAttachments.length})
          </div>
          {documentAttachments.length === 0 ? (
            <div className="media-empty">No attachments</div>
          ) : (
            <ul className="media-doc-list">
              {documentAttachments.slice(-2).map((msg, i) => (
                <li key={i}>
                  <a
                    href={msg.fileUrl}
                    className="media-doc-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    📎 {msg.fileName || "Document"}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatWindow;
