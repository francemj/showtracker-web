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
const bodyParser = require("body-parser");

const path = require("path");

//db
require("./models");
const Show = require("./models/Shows");

//express
const app = express();
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  next();
});

//body-parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "client/build")));

//globals
let token;
let debug = false;

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

async function getSeriesData(seriesId, lastWatchedEpisode) {
  let seriesResult = await series({ id: seriesId }, token, debug);
  let latestEpisode = await getLatestEpisode(seriesId);
  let episodesLeft = latestEpisode.absoluteNumber - lastWatchedEpisode;
  let output = {
    id: seriesResult.id,
    seriesName: seriesResult.seriesName,
    poster: seriesResult.poster,
    overview: seriesResult.overview,
    episodeName: latestEpisode.episodeName,
    airedEpisodeNumber: latestEpisode.airedEpisodeNumber,
    airedSeason: latestEpisode.airedSeason,
    episodesLeft: episodesLeft,
  };
  return output;
}

app.get("/search/:query", async (req, res) => {
  await checkTokenAndDebug(req);
  let result = await search({ name: req.params.query }, token, debug);
  let reducedArray = result.map((element) => {
    let overview = element.overview;
    if (overview) {
      if (overview.length > 100) {
        overview = overview.substring(0, 100) + "...";
      }
    }
    return {
      id: element.id,
      seriesName: element.seriesName,
      overview: overview,
      poster: element.poster,
    };
  });
  res.send(reducedArray);
});

// app.get("/series/:seriesId", async (req, res) => {
//   await checkTokenAndDebug(req);
//   let result = await getSeriesData(req.params.seriesId);
//   res.send(result);
// });

app.get("/series", async (req, res) => {
  await checkTokenAndDebug(req);
  let dbResults = await Show.find({});
  let output = await Promise.all(
    dbResults.map(async (element) => {
      let output = await getSeriesData(element.id, element.lastWatchedEpisode);
      return output;
    })
  );
  let filteredOutput = output.filter((show) => show.episodesLeft > 0);
  res.send(filteredOutput);
});

app.post("/add", (req, res) => {
  const newShow = new Show({
    id: req.body.id,
    lastWatchedEpisode: req.body.lastWatchedEpisode,
  });
  newShow.save();
  res.send("Success!");
});

app.put("/update", (req, res) => {
  Show.updateOne(
    { id: req.body.id },
    { lastWatchedEpisode: req.body.lastWatchedEpisode },
    (err) => {
      if (err) {
        res.send(err);
      } else {
        res.send("Success");
      }
    }
  );
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname + "/client/build/index.html"));
});

app.listen(process.env.PORT || 5000, function () {
  console.log(`Server started successfully on port ${process.env.PORT} `);
});
