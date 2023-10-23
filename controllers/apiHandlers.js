const Session = require("./../models/sessionSchema");

const handleCreateSession = async (req, res) => {
  const { title, pin, dateTime, participants, customList, user, tag, desc } =
    req.body;
  if (!title || !pin || !dateTime || !participants || !user) {
    if (participants == "custom" && customList.length < 1) {
      return res.status(400).send("Inappropriate Data");
    }
    return res.status(400).send("Inappropriate Data");
  }

  const newSession = new Session({
    name: user.firstName + " " + user.lastName,
    email: user.identifier,
    image: user.imageUrl,
    title,
    pin,
    dateTime,
    type: participants,
    customlist: customList.split(",").map((mail) => mail.trim()),
    tag,
    desc,
  });

  await newSession
    .save()
    .then((createdsess) => {
      return res.status(200).json(createdsess);
    })
    .catch((e) => {
      console.log("Mongoose error ", e);
      return res.status(500).send(e);
    });
};

const handleFetchSessions = async (req, res) => {
  const { mailid } = req.body;
  await Session.find({
    $or: [{ type: "open" }, { customlist: mailid }],
  })
    .then((result) => {
      // console.log(result);
      return res.status(200).send(result);
    })
    .catch((err) => {
      console.log("Mongoose find err", err);
      return res.status(500).send(err);
    });
};

const handleCheckIsHost = async (req, res) => {
  const { mailid, classid } = req.body;

  try {
    await Session.findById(classid)
      .then((result) => {
        if (result.email === mailid) {
          return res.status(201).send({ title: result.title });
        } else {
          return res.status(203).send({ title: result.title });
        }
      })
      .catch((e) => {
        return res.status(404).send("Session Does not exist or has expired !");
      });
  } catch (e) {
    console.log("mongoose checkishost error", e);
  }
};

module.exports = {
  handleCreateSession,
  handleFetchSessions,
  handleCheckIsHost,
};
