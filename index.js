const { decodeJwt } = require("@clerk/clerk-sdk-node");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Clerk = require("@clerk/clerk-sdk-node/cjs/instance").default;
const { randomUUID } = require("crypto");
const Redis = require("ioredis");

require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    method: ["GET", "POST"],
    credentials: true,
  },
});

const secretKey = process.env.CLERK_SECRET_KEY;

const clerk = new Clerk({ secretKey: secretKey });
const port = process.env.PORT || 3002;

io.use(async (socket, next) => {
  const { userId, token } = socket.handshake.auth;
  // Authentication

  if (token && typeof token === "string") {
    console.log("validating user");
    try {
      socket.user = decodeJwt(token).payload;
      // console.log(socket.user);
      next();
    } catch (e) {
      console.log("Invalid Token Error ", e);
    }
  }
});

// const client = Redis.createClient({
//   host: process.env.REDIS_URL,
//   port: process.env.REDIS_PORT,
//   password: process.env.REDIS_PASS,
// });

const client = new Redis(process.env.REDIS_URL);

io.on("connection", async (socket) => {
  socket.emit("me", socket.id);

  socket.once("joinclass", async (classid) => {
    socket.join(classid);
    socket.classroomid = classid;
    let list = await io.in(classid).fetchSockets();
    let userlist = list.map((sock) => sock.user);
    io.to(classid).emit("livelist", userlist);
    // console.log(`${socket.user.umailid} joined class ${classid}`);
  });

  socket.on("sendMsg", ({ classid, txt }) => {
    const msgid = randomUUID();
    let { ufname, uimage, umailid, userid } = socket.user;
    let message = JSON.stringify({
      msgid,
      txt,
      from: { ufname, uimage, umailid, userid },
    });
    console.log(message);
    client.lpush(`messages:${classid}`, message, (err) => {
      if (err) {
        console.log("unable to save in redis: ", err);
      }
      socket.to(classid).emit("recMsg", { txt, from: socket.user, msgid });
    });
  });

  socket.on("input-change", (code) => {
    socket.broadcast.emit("update-input", code);
  });

  socket.on("chat", (msg) => {
    console.log("chat recieved", msg);
  });

  socket.on("disconnect", async () => {
    let list = await io.in(socket.classroomid).fetchSockets();
    let userlist = list.map((sock) => sock.user);
    io.to(socket.classroomid).emit("livelist", userlist);
    console.log("A user disconnected from ", socket.classroomid);
  });
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
