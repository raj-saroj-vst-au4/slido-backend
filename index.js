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

const client = new Redis(process.env.REDIS_URL);

const handlegetliverooms = () => {
  var availableRooms = [];
  var rooms = io.sockets.adapter.rooms;
  for (const [key, value] of rooms) {
    if (value instanceof Set) {
      availableRooms.push({ key, value: Array.from(value) });
    }
  }

  let liverooms = availableRooms.filter((room) => {
    if (room.value.length > 1) {
      return room;
    } else if (room.value.length == 1 && room.key != room.value[0]) {
      return room;
    }
  });
  // console.log("live", liverooms);
  return liverooms;
};

io.on("connection", async (socket) => {
  socket.emit("me", socket.id);

  socket.once("joinclass", async (classid) => {
    socket.join(classid);
    socket.classroomid = classid;
    let list = await io.in(classid).fetchSockets();
    let userlist = list.map((sock) => sock.user);
    io.to(classid).emit("livelist", userlist);

    client.hgetall(`messages:${classid}`, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        io.to(socket.id).emit("intmsgslist", res);
      }
    });

    // console.log(`${socket.user.umailid} joined class ${classid}`);
  });

  socket.on("sendMsg", ({ classid, text }) => {
    const msgid = randomUUID();
    let { ufname, uimage, umailid, userid } = socket.user;
    let message = {
      msgid,
      text,
      from: { ufname, uimage, umailid, userid },
      time: new Date(),
      upvotes: [],
    };
    // using hset
    client.hset(
      `messages:${classid}`,
      msgid,
      JSON.stringify(message),
      (err, res) => {
        if (err) {
          console.log(err);
        } else {
          io.to(classid).emit("recMsg", message);
        }
      }
    );
  });

  socket.on("getliverooms", () => {
    socket.emit("liverooms", handlegetliverooms());
  });

  socket.on("upmsg", ({ msgid, classid, smailid, simage }) => {
    try {
      client.hget(`messages:${classid}`, msgid, function (err, reply) {
        if (reply) {
          const existingMessage = JSON.parse(reply);
          existingMessage.upvotes.push({ sm: smailid, si: simage });
          client.hset(
            `messages:${classid}`,
            msgid,
            JSON.stringify(existingMessage)
          );

          io.to(classid).emit("upvotedmsg", { msgid, smailid, simage });
        }
      });
    } catch (err) {
      console.log(err);
    }
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
