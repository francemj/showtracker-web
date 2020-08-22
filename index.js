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

//express
const app = express();
let token;
let debug = false;

function compareImages(a, b) {
  let comparison = 0;
  if (a.ratingsInfo.count > b.ratingsInfo.count) {
    comparison = -1;
  } else if (b.ratingsInfo.count > a.ratingsInfo.count) {
    comparison = 1;
  }
  return comparison;
}

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

async function getEpisodes(req) {
  let result = await seriesEpisodes({ id: req.params.seriesId }, token, debug);
  count = 2;
  let episodeList = [];
  while (Array.isArray(result)) {
    let filtered = result.filter((episode) => episode.airedSeason > 0);
    episodeList = episodeList.concat(filtered);
    result = await seriesEpisodes(
      { id: req.params.seriesId, page: count },
      token,
      debug
    );
    count++;
  }
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

app.get("/search/:query", async (req, res) => {
  await checkTokenAndDebug(req);
  let result = await search({ name: req.params.query }, token, debug);
  let reducedArray = result.map((element) => {
    return {
      id: element.id,
      seriesName: element.seriesName,
      overview: element.overview,
    };
  });
  res.send(reducedArray);
});

app.get("/series/:seriesId", async (req, res) => {
  await checkTokenAndDebug(req);
  let result = await series({ id: req.params.seriesId }, token, debug);
  res.send(result);
});

app.get("/series/:seriesId/episodes", async (req, res) => {
  await checkTokenAndDebug(req);
  let episodes = await getEpisodes(req);
  episodes.sort(compareEpisodes);
  res.send(episodes);
});

app.get("/series/:seriesId/latest", async (req, res) => {
  await checkTokenAndDebug(req);
  let episodes = await getEpisodes(req);
  episodes = filterEpisodesByDate(episodes, true);
  res.send(episodes[episodes.length - 1]);
});

app.get("/series/:seriesId/next", async (req, res) => {
  await checkTokenAndDebug(req);
  let episodes = await getEpisodes(req);
  episodes = filterEpisodesByDate(episodes, false);
  res.send(episodes[0]);
});

app.listen(process.env.PORT || 5000, function () {
  console.log("Server started successfully");
});
