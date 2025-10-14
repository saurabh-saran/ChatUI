import React, { useEffect, useState, useRef, useMemo } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { FaPaperclip, FaMicrophone, FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";
import "./ChatWindowModern.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const socket = io(API_URL);

function ChatWindow({ user, chatWith, onBack, isMobile }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const bottomRef = useRef();
  const recordingIntervalRef = useRef(null);

  // Media panel
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
      } catch (error) {
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
            (msg) =>
              msg.timestamp === message.timestamp &&
              msg.from === message.from &&
              msg.message === message.message
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
      !file.type.startsWith("application/pdf")
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
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 30000,
      });

      if (response.data.success) {
        let messageType = "doc";
        if (file.type.startsWith("image/")) messageType = "image";
        else if (file.type.startsWith("audio/")) messageType = "voice";
        else if (file.type.startsWith("video/")) messageType = "video";
        else if (file.type.startsWith("application/pdf")) messageType = "doc";

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
              : "📎 Attachment",
          messageType,
          fileUrl: response.data.fileUrl,
          fileName: file.name,
          timestamp: new Date().toISOString(),
        };

        socket.emit("sendMessage", messageData);
        // setMessages((prev) => [...prev, messageData]);
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

  // --- Mic/Voice Recording logic ---
  const handleMicClick = async () => {
    if (isRecording) {
      if (mediaRecorder && mediaRecorder.state === "recording") {
        mediaRecorder.stop();
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current)
          clearInterval(recordingIntervalRef.current);
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });
        const recorder = new window.MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        const chunks = [];

        recorder.ondataavailable = (event) => {
          chunks.push(event.data);
        };
        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
            type: "audio/webm",
          });

          try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", audioFile);

            const response = await axios.post(`${API_URL}/upload`, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 30000,
            });

            if (response.data.success) {
              const messageData = {
                from: user.username,
                to: chatWith,
                message: "🎤 Voice message",
                messageType: "voice",
                fileUrl: response.data.fileUrl,
                timestamp: new Date().toISOString(),
              };

              socket.emit("sendMessage", messageData);
              // setMessages((prev) => [...prev, messageData]);
            } else {
              throw new Error("Voice upload failed: " + response.data.error);
            }
          } catch (error) {
            alert("Failed to send voice message: " + error.message);
          } finally {
            setUploading(false);
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        recorder.start(1000);
        setMediaRecorder(recorder);
        setIsRecording(true);
        setRecordingTime(0);

        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);
      } catch (error) {
        alert("Microphone error: " + error.message);
      }
    }
  };

  const handleEmojiClick = () => setShowEmoji((v) => !v);

  const onEmojiSelect = (emojiData) => {
    setInput(input + emojiData.emoji);
    setShowEmoji(false);
  };

  const sendMessage = () => {
    if (input.trim() === "") return;
    const messageData = {
      from: user.username,
      to: chatWith,
      message: input.trim(),
      messageType: "text",
      timestamp: new Date().toISOString(),
    };
    socket.emit("sendMessage", messageData);
    // setMessages((prev) => [...prev, messageData]);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="modern-main-chat-flex">
      {/* Left: Main Chat */}
      <div className="modern-chat-window">
        {/* Optionally show back button mobile only */}
        {isMobile && (
          <button className="chat-back-btn" onClick={onBack}>
            ← Users
          </button>
        )}
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <img
              src={`https://api.dicebear.com/7.x/initials/svg?seed=${chatWith}`}
              alt={chatWith}
              className="chat-header-avatar"
            />
            <div>
              <div className="chat-header-title">{chatWith}</div>
              <div className="chat-header-status">Offline</div>
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
        {/* Chat body */}
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
        {/* Input Area */}
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
      {/* Right: Media & Attachments panel */}
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
