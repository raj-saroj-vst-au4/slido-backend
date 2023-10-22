const Session = require("./../models/sessionSchema");
const mongoose = require("mongoose");

let cachedData = new Map();

const handlegetliverooms = async (io) => {
  const availableRooms = [];

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

  if (cachedData.size >= 200) {
    cachedData = new Map();
    console.log("cache reset");
  }

  let liveRoomData = await Promise.all(
    liverooms.map(async (room) => {
      if (cachedData.has(room.key)) {
        const roomData = cachedData.get(room.key);
        // console.log("room data already in cache");
        return {
          name: roomData.name,
          dp: roomData.dp,
          id: room.key,
          title: roomData.title,
        };
      } else {
        // console.log("checking for data in db", count++);
        try {
          const roomId = new mongoose.Types.ObjectId(room.key);
          const dbRoomData = await Session.findById(roomId);

          if (dbRoomData) {
            const roomData = {
              name: dbRoomData.name,
              dp: dbRoomData.image,
              id: room.key,
              title: dbRoomData.title,
            };

            cachedData.set(room.key, roomData);

            return roomData;
          } else {
            const roomData = {
              name: "invalid",
              dp: "https://bit.ly/sage-adebayo",
              id: room.key,
              title: "invalid",
            };
            cachedData.set(room.key, roomData);

            return roomData;
          }
        } catch (e) {
          console.log("LiveList DB Error", e);
        }
      }
    })
  );

  return liveRoomData;
};

module.exports = { handlegetliverooms };
