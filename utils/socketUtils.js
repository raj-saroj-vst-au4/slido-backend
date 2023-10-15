const handlegetliverooms = (io) => {
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
  return liverooms;
};

module.exports = { handlegetliverooms };
