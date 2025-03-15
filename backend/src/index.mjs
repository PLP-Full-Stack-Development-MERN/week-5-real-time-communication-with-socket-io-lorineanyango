import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import mongoose from "mongoose";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://chat-app-puce-two.vercel.app/",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect("mongodb+srv://lorianyango23:chatApp@cluster0.or7rx.mongodb.net/ChatApp")
  .then(() => console.log("Connected to MongoDB Atlas successfully!"))
  .catch((err) => console.error("MongoDB connection error:", err));

// mongoose.connect("mongodb+srv://lorianyango23:chatApp@cluster0.or7rx.mongodb.net/ChatApp", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// },);

const messageSchema = new mongoose.Schema({
  username: String,
  room: String,
  content: String,
  timestamp: { type: Date, default: Date.now },
});
const Message = mongoose.model("Message", messageSchema);

let users = {}; // Track users in memory

io.on("connection", (socket) => {
  console.log(" User connected:", socket.id);

  socket.on("joinRoom", async ({ username, room }) => {
    socket.join(room);
    users[socket.id] = { username, room };

    const usersInRoom = Object.values(users)
      .filter((user) => user.room === room)
      .map((user) => user.username);

    io.to(room).emit("updateUsers", usersInRoom);

    try {
      const messages = await Message.find({ room }).sort({ timestamp: 1 });
      socket.emit("loadMessages", messages);
    } catch (err) {
      console.error("⚠️ Error loading messages:", err);
    }
  });

  socket.on("sendMessage", async ({ room, username, content }) => {
    try {
      const message = new Message({ room, username, content });
      await message.save();
      io.to(room).emit("receiveMessage", message);
    } catch (err) {
      console.error(" Error saving message:", err);
    }
  });

  socket.on("typing", ({ room, username }) => {
    socket.to(room).emit("userTyping", username);
  });

  socket.on("disconnect", () => {
    console.log(" User disconnected:", socket.id);
    if (users[socket.id]) {
      const { room, username } = users[socket.id];
      delete users[socket.id];
      const usersInRoom = Object.values(users)
        .filter((user) => user.room === room)
        .map((user) => user.username);
      io.to(room).emit("updateUsers", usersInRoom);
    }
  });
});

const PORT = 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));