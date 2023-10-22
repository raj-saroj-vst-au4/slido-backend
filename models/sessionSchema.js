const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  title: {
    type: String,
    trim: true,
  },
  pin: {
    type: Number,
    required: true,
  },
  dateTime: {
    type: Date,
    required: true,
  },
  type: {
    type: String,
    default: "Open",
  },
  customlist: {
    type: Array,
    default: [],
  },
  tag: {
    type: String,
    default: "Generic",
  },
  desc: {
    type: String,
    default: "Live Q&A",
  },
});

const Session = mongoose.model("Session", sessionSchema);
module.exports = Session;
