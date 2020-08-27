const mongoose = require("mongoose");

const showSchema = new mongoose.Schema({
  id: String,
  lastWatchedEpisode: String,
});

const Show = mongoose.model("Show", showSchema);

module.exports = Show;
