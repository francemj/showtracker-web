require("dotenv").config();
const express = require("express");

const bodyParser = require("body-parser");

const path = require("path");

//db
require("./models");
const Show = require("./models/Shows");
const { search, fetchSeries, fetchEpisode } = require("./modules/tmdb");

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
let token = { Authorization: "Bearer " + process.env.TOKEN };
let debug = false;

async function checkDebug(req) {
  if (req.headers.debug) {
    debug = true;
  } else {
    debug = false;
  }
}

async function nextEpisode(seasons, episode) {
  let next = {
    show_id: episode.show_id,
    episode_number: parseInt(episode.episode_number) + 1,
    season_number: parseInt(episode.season_number),
  };
  if (seasons[next.season_number - 1].episode_count < next.episode_number) {
    next["episode_number"] = 1;
    next["season_number"] += 1;
  }
  let result = await getEpisode(next);
  return result;
}

async function getEpisode(episode) {
  let result = await fetchEpisode(
    {
      show_id: episode.show_id,
      episode_number: episode.episode_number,
      season_number: episode.season_number,
    },
    token,
    debug
  );
  return result;
}

function getAbsoluteNumber(seasons, episode) {
  if (episode.season_number > 1) {
    return (
      seasons[parseInt(episode.season_number) - 2] + episode.episode_number
    );
  } else {
    return episode.episode_number;
  }
}

function getAbsoluteDifference(seasons, episode1, episode2) {
  return Math.abs(
    getAbsoluteNumber(seasons, episode1) - getAbsoluteNumber(seasons, episode2)
  );
}

async function getSeriesData(
  seriesId,
  lastWatchedSeasonNumber,
  lastWatchedEpisodeNumber
) {
  let seriesResult = await fetchSeries({ id: seriesId }, token, debug);
  let numberOfEpisodes = 0;
  let seasons = seriesResult.seasons.filter(
    (season) => season.season_number > 0
  );
  let totalEpisodesBySeason = seasons.map((season) => {
    numberOfEpisodes += season.episode_count;
    return numberOfEpisodes;
  });
  let latestEpisode = seriesResult.last_episode_to_air;
  let episodesLeft = getAbsoluteDifference(
    totalEpisodesBySeason,
    latestEpisode,
    {
      episode_number: lastWatchedEpisodeNumber,
      season_number: lastWatchedSeasonNumber,
    }
  );
  let output;
  if (episodesLeft > 0) {
    let next = await nextEpisode(seasons, {
      show_id: seriesId,
      episode_number: lastWatchedEpisodeNumber,
      season_number: lastWatchedSeasonNumber,
    });
    output = {
      key: seriesResult.id,
      seriesName: seriesResult.name,
      poster: seriesResult.poster_path,
      nextEpisodeNumberToWatch: next.episode_number,
      nextSeasonNumberToWatch: next.season_number,
      episodesLeft: episodesLeft,
      nextToAir: seriesResult.next_episode_to_air,
    };
  } else {
    output = {
      key: seriesResult.id,
      seriesName: seriesResult.name,
      poster: seriesResult.poster_path,
      episodesLeft: 0,
      nextToAir: seriesResult.next_episode_to_air,
    };
  }
  return output;
}

app.get("/search/:query", async (req, res) => {
  let result = await search(
    { query: req.params.query },
    token,
    req.headers.debug
  );
  let reducedArray = result.results.map((element) => {
    let overview = element.overview;
    if (overview && overview.length > 100) {
      overview = overview.substring(0, 100) + "...";
    }
    return {
      key: element.id,
      seriesName: element.name,
      overview: overview,
      poster: element.poster_path,
    };
  });
  res.send(reducedArray);
});

app.get("/series/:seriesId", async (req, res) => {
  await checkDebug(req);
  let result = await getSeriesData(req.params.seriesId, 1, 0);
  res.send(result);
});

app.get("/series", async (req, res) => {
  let dbResults = await Show.find({});
  let result = await Promise.all(
    dbResults.map(async (element) => {
      let output = await getSeriesData(
        element.id,
        parseInt(element.lastWatchedSeasonNumber),
        parseInt(element.lastWatchedEpisodeNumber)
      );
      return output;
    })
  );
  res.send(result);
});

app.post("/add", (req, res) => {
  const newShow = new Show({
    id: req.body.id,
    lastWatchedEpisodeNumber: req.body.lastWatchedEpisodeNumber,
    lastWatchedSeasonNumber: req.body.lastWatchedSeasonNumber,
  });
  newShow.save();
  res.send("Success");
});

app.put("/update", (req, res) => {
  Show.updateOne(
    { id: req.body.id },
    {
      lastWatchedEpisodeNumber: req.body.lastWatchedEpisodeNumber,
      lastWatchedSeasonNumber: req.body.lastWatchedSeasonNumber,
    },
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
