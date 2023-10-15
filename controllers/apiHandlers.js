const handleCreateSession = (req, res) => {
  const { title, pin, date, time, participants, customList } = req.body;
  if (!title || !pin || !date || !time || !participants) {
    if (participants == "custom" && customList.length < 1) {
      return res.status(400).send("Inappropriate Data");
    }
  }
};

module.exports = { handleCreateSession };
