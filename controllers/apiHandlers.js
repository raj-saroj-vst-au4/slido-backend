const Session = require("./../models/sessionSchema");

const handleCreateSession = async (req, res) => {
  const { title, pin, date, time, participants, customList, user, tag, desc } =
    req.body;
  if (!title || !pin || !date || !time || !participants || !user) {
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
    date,
    time,
    type: participants,
    customlist: customList.split(",").map((mail) => mail.trim()),
    tag,
    desc,
  });

  await newSession
    .save()
    .then((createdsess) => {
      return res
        .status(200)
        .send(`${createdsess.title} Created and Scheduled Successfully`);
    })
    .catch((e) => {
      console.log("Mongoose error ", e);
      return res.status(500).send(e);
    });
};

const handleFetchSessions = async (req, res) => {
  const { mailid } = req.body;
  console.log("my maild", mailid);
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

module.exports = {
  handleCreateSession,
  handleFetchSessions,
};
