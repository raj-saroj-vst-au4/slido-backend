const { randomUUID } = require("crypto");
const Redis = require("ioredis");

const handleSendMsg = async (classid, text, socket, io) => {
  const client = await new Redis(process.env.REDIS_URL);
  const msgid = randomUUID();
  let { ufname, uimage, umailid, userid } = socket.user;
  let message = {
    msgid,
    text,
    from: { ufname, uimage, umailid, userid },
    time: Date.now(),
    upvotes: [],
  };

  const multi = client.multi();
  multi.hset(`messages:${classid}`, msgid, JSON.stringify(message));
  multi.zadd(`messages:${classid}:sorted`, parseFloat(message.time), msgid);

  multi.exec((err, res) => {
    if (err) {
      console.log(err);
    } else {
      io.to(classid).emit("recMsg", message);
    }
    client.quit();
  });
};

const handleMsgUpvote = async (msgid, classid, smailid, simage, io) => {
  const client = await new Redis(process.env.REDIS_URL);
  try {
    await client.hget(`messages:${classid}`, msgid, function (err, reply) {
      if (reply) {
        const existingMessage = JSON.parse(reply);
        existingMessage.upvotes.push({ sm: smailid, si: simage });
        client.hset(
          `messages:${classid}`,
          msgid,
          JSON.stringify(existingMessage)
        );
        return io.to(classid).emit("upvotedmsg", { msgid, smailid, simage });
      }
    });
  } catch (err) {
    return console.log(err);
  } finally {
    client.quit();
  }
};

const handleJoinClass = async (classid, io, socket) => {
  const client = await new Redis(process.env.REDIS_URL);
  socket.join(classid);
  socket.classroomid = classid;
  let list = await io.in(classid).fetchSockets();
  let userlist = list.map((sock) => sock.user);
  io.to(classid).emit("livelist", userlist);

  await client.zrange(`messages:${classid}:sorted`, 0, -1, (err, msgids) => {
    if (err) {
      return console.log(err);
    } else if (msgids.length > 0) {
      client.hmget(`messages:${classid}`, msgids, (err, msgData) => {
        if (err) {
          return console.log(err);
        }
        const messages = msgData.map((msg) => JSON.parse(msg));
        // messages.sort((a,b)=> a.time - b.time)
        return io.to(socket.id).emit("intmsgslist", messages);
      });
    } else {
      return null;
    }
  });
  client.quit();
};

module.exports = { handleSendMsg, handleMsgUpvote, handleJoinClass };
