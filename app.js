require("dotenv").config();
const express = require("express");
const {
  seriesEpisodesQuery,
  login,
  search,
  seriesImagesQuery,
  series,
  seriesEpisodes,
  seriesEpisodesSummary,
  fullEpisode,
} = require("./modules/tvdb");
const _ = require("lodash");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

//express
const app = express();
let token;
let debug = false;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));

//mongoose
mongoose.connect(
  "mongodb+srv://" +
    process.env.MONGOLOGIN +
    "@cluster0.ntq2u.mongodb.net/showDB",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const showSchema = new mongoose.Schema({
  id: String,
  latestWatchedEpisode: String,
});

const Show = mongoose.model("Show", showSchema);

function compareEpisodes(a, b) {
  let comparison = 0;
  if (Date.parse(a.firstAired) < Date.parse(b.firstAired)) {
    comparison = -1;
  } else if (Date.parse(a.firstAired) > Date.parse(b.firstAired)) {
    comparison = 1;
  }
  return comparison;
}

async function checkTokenAndDebug(req) {
  if (!token) {
    token = await login(process.env.APIKEY);
  }
  if (req.headers.debug) {
    debug = true;
  } else {
    debug = false;
  }
}

async function getEpisodes(seriesId) {
  let result = await seriesEpisodes({ id: seriesId }, token, debug);
  count = 2;
  let episodeList = [];
  while (Array.isArray(result)) {
    let filtered = result.filter((episode) => episode.airedSeason > 0);
    episodeList = episodeList.concat(filtered);
    result = await seriesEpisodes({ id: seriesId, page: count }, token, debug);
    count++;
  }
  episodeList.sort(compareEpisodes);
  return episodeList;
}

function filterEpisodesByDate(episodes, before) {
  const today = Date.now();
  episodes = episodes.filter((episode) => {
    if (before) {
      return Date.parse(episode.firstAired) < today;
    } else {
      return Date.parse(episode.firstAired) > today;
    }
  });
  episodes.sort(compareEpisodes);
  return episodes;
}

async function getLatestEpisode(seriesId) {
  let episodes = await getEpisodes(seriesId);
  episodes = filterEpisodesByDate(episodes, true);
  return episodes[episodes.length - 1];
}

async function getEpisodeAiringNext(seriesId) {
  let episodes = await getEpisodes(seriesId);
  episodes = filterEpisodesByDate(episodes, false);
  return episodes[0];
}

async function getSeriesData(seriesId) {
  let seriesResult = await series({ id: seriesId }, token, debug);
  let latestEpisode = await getLatestEpisode(seriesId);
  let output = {
    id: seriesResult.id,
    seriesName: seriesResult.seriesName,
    poster: seriesResult.poster,
    overview: seriesResult.overview,
    episodeName: latestEpisode.episodeName,
    airedEpisodeNumber: latestEpisode.airedEpisodeNumber,
    airedSeason: latestEpisode.airedSeason,
    episodesLeft: 0,
  };
  return output;
}

app.get("/search/:query", async (req, res) => {
  await checkTokenAndDebug(req);
  let result = await search({ name: req.params.query }, token, debug);
  let reducedArray = result.map((element) => {
    return {
      id: element.id,
      seriesName: element.seriesName,
      overview: element.overview,
      poster: element.poster,
    };
  });
  res.send(reducedArray);
});

app.get("/series/:seriesId", async (req, res) => {
  await checkTokenAndDebug(req);
  let result = await getSeriesData(req);
  res.send(result);
});

app.get("/series", async (req, res) => {
  await checkTokenAndDebug(req);
  let dbResults = await Show.find({});
  let output = await Promise.all(
    dbResults.map(async (element) => {
      let seriesResult = await series({ id: element.id }, token, debug);
      let latestEpisode = await getLatestEpisode(element.id);
      return {
        id: seriesResult.id,
        seriesName: seriesResult.seriesName,
        poster: seriesResult.poster,
        overview: seriesResult.overview,
        episodeName: latestEpisode.episodeName,
        airedEpisodeNumber: latestEpisode.airedEpisodeNumber,
        airedSeason: latestEpisode.airedSeason,
        episodesLeft: 0,
      };
    })
  );
  res.send(output);
});

app.post("/add", (req, res) => {
  const newShow = new Show({
    id: req.body.id,
    latestWatchedEpisode: req.body.latestWatchedEpisode,
  });
  newShow.save();
  res.send("Success!");
});

app.listen(process.env.PORT || 5000, function () {
  console.log("Server started successfully");
});
