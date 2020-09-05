const mongoose = require("mongoose");

const showSchema = new mongoose.Schema({
  id: String,
  lastWatchedEpisodeNumber: String,
  lastWatchedSeasonNumber: String,
});

const Show = mongoose.model("Show", showSchema);

module.exports = Show;
