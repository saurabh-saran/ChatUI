import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { FaPaperclip, FaMicrophone, FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

// const API_URL = "http://localhost:8000";
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

const socket = io(API_URL);

function ChatWindow({ user, chatWith, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef(null);
  const bottomRef = useRef();
  const recordingIntervalRef = useRef(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        console.log("Fetching chat history...");
        const res = await axios.get(
          `${API_URL}/messages?from=${user.username}&to=${chatWith}`
        );
        console.log("Chat history:", res.data);
        setMessages(res.data);
      } catch (error) {
        console.error("Error fetching messages:", error);
        alert("Failed to load chat history");
      }
    }
    fetchHistory();

    socket.emit("userOnline", user.username);

    // Listen for real-time messages (including images and voice)
    socket.on("receiveMessage", (message) => {
      console.log("Received real-time message:", message);
      // Only show messages from other users, not from current user
      if (message.from === chatWith && message.to === user.username) {
        setMessages((prev) => {
          // Check if message already exists to avoid duplicates
          const exists = prev.some(
            (msg) =>
              msg.timestamp === message.timestamp &&
              msg.from === message.from &&
              msg.message === message.message
          );
          if (!exists) {
            return [...prev, message];
          }
          return prev;
        });
      }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [chatWith, user.username]);

  // --- File Upload Functionality ---
  const handleFileClip = () => {
    console.log("File clip clicked");
    fileInputRef.current.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    console.log("File selected:", file);

    if (!file) {
      console.log("No file selected");
      return;
    }

    // Check file type
    if (!file.type.startsWith("image/") && !file.type.startsWith("audio/")) {
      alert("Please select an image or audio file");
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    console.log("Starting file upload...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log("Uploading to:", `${API_URL}/upload`);
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 30000, // 30 second timeout
      });

      console.log("Upload response:", response.data);

      if (response.data.success) {
        const messageType = file.type.startsWith("image/") ? "image" : "voice";
        const messageData = {
          from: user.username,
          to: chatWith,
          message: file.type.startsWith("image/")
            ? "📷 Image"
            : "🎤 Voice message",
          messageType: messageType,
          fileUrl: response.data.fileUrl,
          timestamp: new Date().toISOString(),
        };

        console.log("Sending message via socket:", messageData);
        socket.emit("sendMessage", messageData);

        // Add message to local state immediately for better UX
        setMessages((prev) => [...prev, messageData]);
      } else {
        throw new Error("Upload failed: " + response.data.error);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      if (error.code === "ECONNABORTED") {
        alert("Upload timeout. Please try again.");
      } else if (error.response?.status === 413) {
        alert("File too large. Please select a smaller file.");
      } else {
        alert("Failed to upload file: " + error.message);
      }
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = "";
    }
  };

  // --- Voice Recording Functionality ---
  const handleMicClick = async () => {
    console.log("Microphone clicked, isRecording:", isRecording);

    if (isRecording) {
      // Stop recording
      if (mediaRecorder && mediaRecorder.state === "recording") {
        console.log("Stopping recording...");
        mediaRecorder.stop();
        setIsRecording(false);
        setRecordingTime(0);
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
        }
      }
    } else {
      // Start recording
      try {
        console.log("Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100,
          },
        });

        console.log("Microphone access granted");
        const recorder = new MediaRecorder(stream, {
          mimeType: "audio/webm;codecs=opus",
        });
        const chunks = [];

        recorder.ondataavailable = (event) => {
          console.log("Audio data available");
          chunks.push(event.data);
        };

        recorder.onstop = async () => {
          console.log("Recording stopped, processing audio...");
          const audioBlob = new Blob(chunks, { type: "audio/webm" });
          const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
            type: "audio/webm",
          });

          console.log("Audio file created:", audioFile);

          try {
            setUploading(true);
            const formData = new FormData();
            formData.append("file", audioFile);

            console.log("Uploading voice message...");
            const response = await axios.post(`${API_URL}/upload`, formData, {
              headers: {
                "Content-Type": "multipart/form-data",
              },
              timeout: 30000,
            });

            console.log("Voice upload response:", response.data);

            if (response.data.success) {
              const messageData = {
                from: user.username,
                to: chatWith,
                message: "🎤 Voice message",
                messageType: "voice",
                fileUrl: response.data.fileUrl,
                timestamp: new Date().toISOString(),
              };

              console.log("Sending voice message via socket:", messageData);
              socket.emit("sendMessage", messageData);

              // Add message to local state immediately
              setMessages((prev) => [...prev, messageData]);
            } else {
              throw new Error("Voice upload failed: " + response.data.error);
            }
          } catch (error) {
            console.error("Error uploading voice message:", error);
            alert("Failed to send voice message: " + error.message);
          } finally {
            setUploading(false);
            // Stop all tracks to release microphone
            stream.getTracks().forEach((track) => track.stop());
          }
        };

        recorder.start(1000); // Collect data every second
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
        setIsRecording(true);
        setRecordingTime(0);

        // Start recording timer
        recordingIntervalRef.current = setInterval(() => {
          setRecordingTime((prev) => prev + 1);
        }, 1000);

        console.log("Recording started");
      } catch (error) {
        console.error("Error accessing microphone:", error);
        if (error.name === "NotAllowedError") {
          alert(
            "Microphone access denied. Please allow microphone access and try again."
          );
        } else if (error.name === "NotFoundError") {
          alert(
            "No microphone found. Please connect a microphone and try again."
          );
        } else {
          alert("Microphone error: " + error.message);
        }
      }
    }
  };

  // --- Emoji Functionality ---
  const handleEmojiClick = () => setShowEmoji((v) => !v);
  const onEmojiSelect = (emojiData) => {
    setInput(input + emojiData.emoji);
    setShowEmoji(false);
  };

  // --- Text Message Functionality ---
  const sendMessage = () => {
    if (input.trim() === "") return;

    const messageData = {
      from: user.username,
      to: chatWith,
      message: input.trim(),
      messageType: "text",
      timestamp: new Date().toISOString(),
    };

    console.log("Sending text message:", messageData);
    socket.emit("sendMessage", messageData);

    // Add message to local state immediately
    setMessages((prev) => [...prev, messageData]);
    setInput("");
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Format recording time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      style={{
        width: 480,
        minHeight: 630,
        margin: "50px auto",
        borderRadius: 30,
        boxShadow: "0 10px 32px #0002",
        background: "#f4f7fa",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {/* Back to User List button */}
      <button
        onClick={onBack}
        style={{
          margin: "16px 24px 12px 24px",
          padding: "8px 14px",
          cursor: "pointer",
          borderRadius: 8,
          border: "1px solid #555",
          background: "#fff",
          fontWeight: "bold",
        }}
      >
        ← Back to Users
      </button>

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(90deg,#2c63e4,#22d6ce)",
          color: "#fff",
          fontWeight: 600,
          fontSize: 24,
          padding: "26px 38px",
          borderRadius: "0 0 28px 28px",
          marginBottom: 16,
        }}
      >
        Chat with {chatWith}
        {isRecording && (
          <div style={{ fontSize: 14, marginTop: 5 }}>
            🔴 Recording... {formatTime(recordingTime)}
          </div>
        )}
        {uploading && (
          <div style={{ fontSize: 14, marginTop: 5 }}>⏳ Uploading...</div>
        )}
      </div>

      {/* Messages area */}
      <div
        style={{
          padding: "30px 28px 18px 28px",
          background: "#fff",
          minHeight: 350,
          maxHeight: 410,
          overflowY: "auto",
          borderBottom: "1px solid #eee",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#878787" }}>No messages yet</p>
        )}
        {messages.map((msg, i) => (
          <div
            key={`${msg.timestamp}-${i}`}
            style={{
              display: "flex",
              justifyContent:
                msg.from === user.username ? "flex-end" : "flex-start",
              marginBottom: 18,
            }}
          >
            <div
              style={{
                background: msg.from === user.username ? "#277fff" : "#f0f3f7",
                color: msg.from === user.username ? "#fff" : "#424242",
                borderRadius: 23,
                padding: "14px 24px",
                fontSize: 18,
                maxWidth: 305,
                wordBreak: "break-word",
                boxShadow: "0 1px 9px #0001",
                fontWeight: 500,
              }}
            >
              {/* Image Message */}
              {msg.messageType === "image" && msg.fileUrl ? (
                <div>
                  <img
                    src={msg.fileUrl}
                    alt="Shared image"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "200px",
                      borderRadius: "10px",
                      marginBottom: "8px",
                      cursor: "pointer",
                      objectFit: "cover",
                    }}
                    onClick={() => window.open(msg.fileUrl, "_blank")}
                    onError={(e) => {
                      console.error("Image failed to load:", msg.fileUrl);
                      e.target.style.display = "none";
                    }}
                  />
                  <div>{msg.message}</div>
                </div>
              ) : /* Voice Message */
              msg.messageType === "voice" && msg.fileUrl ? (
                <div>
                  <audio
                    controls
                    style={{
                      width: "100%",
                      marginBottom: "8px",
                    }}
                    preload="metadata"
                    onError={(e) => {
                      console.error("Audio failed to load:", msg.fileUrl);
                    }}
                  >
                    <source src={msg.fileUrl} type="audio/webm" />
                    <source src={msg.fileUrl} type="audio/mp3" />
                    <source src={msg.fileUrl} type="audio/wav" />
                    <source src={msg.fileUrl} type="audio/ogg" />
                    Your browser does not support the audio element.
                  </audio>
                  <div>{msg.message}</div>
                </div>
              ) : (
                /* Text Message */
                msg.message
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input and Icons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 22px",
          background: "#f7fcff",
          borderRadius: "0 0 30px 30px",
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,audio/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <FaPaperclip
          style={{
            fontSize: 25,
            color: uploading ? "#ccc" : "#8ea2d5",
            margin: "0 10px",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
          title="Attach Image or Audio File"
          onClick={uploading ? null : handleFileClip}
        />
        <FaMicrophone
          style={{
            fontSize: 25,
            color: isRecording ? "#e53935" : uploading ? "#ccc" : "#8ea2d5",
            margin: "0 10px",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
          title={isRecording ? "Stop Recording" : "Send Voice Message"}
          onClick={uploading ? null : handleMicClick}
        />
        <FaRegSmile
          style={{
            fontSize: 25,
            color: "#8ea2d5",
            margin: "0 10px",
            cursor: "pointer",
          }}
          title="Send Emoji"
          onClick={handleEmojiClick}
        />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={uploading}
          style={{
            flex: 1,
            fontSize: 18,
            padding: "15px 20px",
            border: "none",
            outline: "none",
            background: uploading ? "#f0f0f0" : "#ecf2f9",
            borderRadius: 38,
            margin: "0 12px",
            opacity: uploading ? 0.6 : 1,
          }}
          placeholder={uploading ? "Uploading..." : "Enter your message..."}
        />
        <button
          onClick={sendMessage}
          disabled={uploading || input.trim() === ""}
          style={{
            background:
              uploading || input.trim() === ""
                ? "#ccc"
                : "linear-gradient(90deg,#2c63e4,#22d6ce)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 50,
            height: 50,
            marginLeft: 8,
            fontSize: 22,
            cursor:
              uploading || input.trim() === "" ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px #29cae870",
          }}
        >
          &gt;
        </button>
      </div>

      {/* Emoji Picker */}
      {showEmoji && (
        <div
          style={{
            position: "fixed",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            borderRadius: 17,
            boxShadow: "0 8px 24px #0006",
            zIndex: 111,
          }}
        >
          <EmojiPicker onEmojiClick={onEmojiSelect} width={350} height={420} />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          color: "#8da7c8",
          fontSize: "15px",
          padding: "13px",
          borderRadius: "0 0 30px 30px",
          background: "#f4f9fc",
        }}
      >
        Powered by TIDIO
      </div>
    </div>
  );
}

export default ChatWindow;
