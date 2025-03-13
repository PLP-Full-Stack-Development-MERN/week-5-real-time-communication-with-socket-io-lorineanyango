import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function App() {
  const [room, setRoom] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const chatBoxRef = useRef(null);

  useEffect(() => {
    socket.on("updateUsers", (usersList) => setUsers(usersList));
    socket.on("loadMessages", (chatHistory) => setMessages(chatHistory));
    socket.on("receiveMessage", (msg) => setMessages((prev) => [...prev, msg]));
    socket.on("userTyping", (user) => {
      setTypingUser(user);
      setTimeout(() => setTypingUser(""), 2000);
    });

    return () => {
      socket.off("updateUsers");
      socket.off("receiveMessage");
      socket.off("userTyping");
      socket.off("loadMessages");
    };
  }, []);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const joinRoom = () => {
    if (room.trim() !== "" && username.trim() !== "") {
      socket.emit("joinRoom", { username, room });
      setJoined(true);
    }
  };

  const sendMessage = () => {
    if (message.trim() !== "") {
      socket.emit("sendMessage", { room, username, content: message });
      setMessage("");
    }
  };

  return (
    <div className="container">
      {!joined ? (
        <div className="join-room">
          <h2>Join a Chat Room</h2>
          <input type="text" placeholder="Enter your name" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input type="text" placeholder="Enter Room ID" value={room} onChange={(e) => setRoom(e.target.value)} />
          <button onClick={joinRoom}>Join</button>
        </div>
      ) : (
        <div className="chat-room">
          <h2>Room: {room}</h2>
          <h3>Users in this room:</h3>
          <ul>{users.map((user, index) => <li key={index}>{user}</li>)}</ul>
          <div ref={chatBoxRef} className="chat-box">
            {messages.length === 0 ? <p>No messages yet...</p> : messages.map((msg, index) => (
              <p key={index}><strong>{msg.username}:</strong> {msg.content}</p>
            ))}
          </div>
          {typingUser && <p>{typingUser} is typing...</p>}
          <input type="text" placeholder="Type a message..." value={message} onChange={(e) => { setMessage(e.target.value); socket.emit("typing", { room, username }); }} />
          <button onClick={sendMessage}>Send</button>
        </div>
      )}
    </div>
  );
}
