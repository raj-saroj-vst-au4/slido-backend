const { decodeJwt } = require("@clerk/clerk-sdk-node");
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
// const Clerk = require("@clerk/clerk-sdk-node/cjs/instance").default;
const cors = require("cors");
const mongoose = require("mongoose");

require("dotenv").config();

const app = express();
const server = http.createServer(app);

const soController = require("./controllers/socketHandlers");
const apiController = require("./controllers/apiHandlers");
const utils = require("./utils/socketUtils");

const io = socketIo(server, {
  cors: {
    origin: "*",
    method: ["GET", "POST"],
  },
});

// const secretKey = process.env.CLERK_SECRET_KEY;

// const clerk = new Clerk({ secretKey: secretKey });
const port = process.env.PORT || 3002;

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
  })
);

app.use(express.json());

app.get("/", (req, res) => res.status(200).json({ alive: true }));
app.post("/createSession", apiController.handleCreateSession);
app.post("/fetchmySessions", apiController.handleFetchSessions);
app.post("/checkIsHost", apiController.handleCheckIsHost);

io.use(async (socket, next) => {
  const { userId, token } = socket.handshake.auth;
  if (token && typeof token === "string") {
    try {
      if (socket.user) {
        next();
      } else {
        socket.user = decodeJwt(token).payload;
        next();
      }
    } catch (e) {
      console.log("Invalid Token Error ", e);
    }
  }
});

io.on("connection", async (socket) => {
  socket.emit("me", socket.id);
  socket.emit("liverooms", await utils.handlegetliverooms(io));

  socket.once("joinclass", (classid) => {
    soController.handleJoinClass(classid, io, socket);
  });

  socket.on("sendMsg", ({ classid, text }) =>
    soController.handleSendMsg(classid, text, socket, io)
  );

  socket.on("upmsg", ({ msgid, classid, smailid, simage }) =>
    soController.handleMsgUpvote(msgid, classid, smailid, simage, io)
  );

  socket.on("flagAnswered", ({ ansmsgid, classid, ansindex }) => {
    soController.handleFlagAnswered(ansmsgid, classid, ansindex, io);
  });

  socket.on("disconnect", async () => {
    let list = await io.in(socket.classroomid).fetchSockets();
    let userlist = list.map((sock) => sock.user);
    io.to(socket.classroomid).emit("livelist", userlist);
    // console.log("A user disconnected from ", socket.classroomid);
  });
});

server.listen(port, async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB);
    console.log("Server running & db Connected");
  } catch (e) {
    console.log(e);
  }
});
