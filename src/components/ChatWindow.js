import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { FaPaperclip, FaMicrophone, FaRegSmile } from "react-icons/fa";
import EmojiPicker from "emoji-picker-react";

const socket = io("http://localhost:5000");

function ChatWindow({ user, chatWith, onBack }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef();

  useEffect(() => {
    async function fetchHistory() {
      const res = await axios.get(
        `http://localhost:5000/messages?from=${user.username}&to=${chatWith}`
      );
      setMessages(res.data);
    }
    fetchHistory();

    socket.emit("userOnline", user.username);

    socket.on("receiveMessage", (message) => {
      if (
        (message.from === user.username && message.to === chatWith) ||
        (message.from === chatWith && message.to === user.username)
      ) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => socket.off("receiveMessage");
  }, [chatWith, user.username]);

  // --- Icon Functionality ---
  const handleFileClip = () => fileInputRef.current.click();
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) alert("File attached: " + file.name);
  };
  const handleMicClick = async () => {
    if (isRecording) {
      setIsRecording(false);
    } else if (navigator.mediaDevices) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new window.MediaRecorder(stream);
      recorder.ondataavailable = () => alert("Voice recorded! (Demo)");
      recorder.start();
      setIsRecording(true);
      setTimeout(() => {
        recorder.stop();
        setIsRecording(false);
      }, 4000);
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
    };
    socket.emit("sendMessage", messageData);
    setInput("");
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
            key={i}
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
              {msg.message}
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
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
        <FaPaperclip
          style={{
            fontSize: 25,
            color: "#8ea2d5",
            margin: "0 10px",
            cursor: "pointer",
          }}
          title="Attach File"
          onClick={handleFileClip}
        />
        <FaMicrophone
          style={{
            fontSize: 25,
            color: isRecording ? "#e53935" : "#8ea2d5",
            margin: "0 10px",
            cursor: "pointer",
          }}
          title="Send Voice Message"
          onClick={handleMicClick}
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
          style={{
            flex: 1,
            fontSize: 18,
            padding: "15px 20px",
            border: "none",
            outline: "none",
            background: "#ecf2f9",
            borderRadius: 38,
            margin: "0 12px",
          }}
          placeholder="Enter your message..."
        />
        <button
          onClick={sendMessage}
          style={{
            background: "linear-gradient(90deg,#2c63e4,#22d6ce)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 50,
            height: 50,
            marginLeft: 8,
            fontSize: 22,
            cursor: "pointer",
            boxShadow: "0 2px 8px #29cae870",
          }}
        >
          &gt;
        </button>
      </div>

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
