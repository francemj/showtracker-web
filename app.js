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
app.use(bodyParser.json());
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

function getAbsoluteNumber(cumulativeTotalEpisodesBySeason, episode) {
  if (episode.season_number > 1) {
    return (
      cumulativeTotalEpisodesBySeason[parseInt(episode.season_number) - 2] +
      episode.episode_number
    );
  } else {
    return episode.episode_number;
  }
}

function getAbsoluteDifference(
  cumulativeTotalEpisodesBySeason,
  episode1,
  episode2
) {
  return Math.abs(
    getAbsoluteNumber(cumulativeTotalEpisodesBySeason, episode1) -
      getAbsoluteNumber(cumulativeTotalEpisodesBySeason, episode2)
  );
}

function getAiredEpisodesBySeason(latestEpisode, seasons) {
  let episodeListBySeason = seasons.map((season) => {
    let episodes = [];
    if (season !== null || season) {
      for (let i = 1; i <= season.episode_count; i++) {
        if (
          season.season_number < latestEpisode.season_number ||
          (season.season_number === latestEpisode.season_number &&
            i <= latestEpisode.episode_number)
        ) {
          episodes.push(i);
        }
      }
      if (episodes.length > 0) {
        return { season_number: season.season_number, episodes: episodes };
      }
    }
  });
  return episodeListBySeason.filter((element) => element);
}

async function getSeriesData(
  seriesId,
  lastWatchedSeasonNumber,
  lastWatchedEpisodeNumber
) {
  let seriesResult = await fetchSeries({ id: seriesId }, token, debug);
  let overview = seriesResult.overview;
  if (overview && overview.length > 100) {
    overview = overview.substring(0, 100) + "...";
  }
  let latestEpisode = seriesResult.last_episode_to_air;
  if (latestEpisode === null) {
    latestEpisode = { season_number: 1, episode_number: 0 };
  }
  let output;
  if (seriesResult.seasons) {
    let seasons = seriesResult.seasons.filter(
      (season) => season.season_number > 0
    );
    let numberOfEpisodes = 0;
    let cumulativeTotalEpisodesBySeason = seasons.map((season) => {
      numberOfEpisodes += season.episode_count;
      return numberOfEpisodes;
    });
    let episodeListBySeason = getAiredEpisodesBySeason(latestEpisode, seasons);
    let episodesLeft = getAbsoluteDifference(
      cumulativeTotalEpisodesBySeason,
      latestEpisode,
      {
        episode_number: lastWatchedEpisodeNumber,
        season_number: lastWatchedSeasonNumber,
      }
    );
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
        overview: overview,
        nextToAir: seriesResult.next_episode_to_air,
        seasons: episodeListBySeason,
      };
    } else {
      output = {
        key: seriesResult.id,
        seriesName: seriesResult.name,
        poster: seriesResult.poster_path,
        episodesLeft: 0,
        overview: overview,
        nextToAir: seriesResult.next_episode_to_air,
        seasons: episodeListBySeason,
      };
    }
    return output;
  } else {
    output = {
      key: seriesResult.id,
      seriesName: seriesResult.name,
      poster: seriesResult.poster_path,
      episodesLeft: 0,
      nextToAir: seriesResult.next_episode_to_air,
      overview: overview,
    };
    return output;
  }
}

app.get("/search/:query", async (req, res) => {
  let result = await search(
    { query: req.params.query },
    token,
    req.headers.debug
  );
  let reducedArray = await Promise.all(
    result.results.map(async (element) => {
      let seriesResult = await fetchSeries({ id: element.id }, token, debug);
      let latestEpisode = seriesResult.last_episode_to_air;
      if (latestEpisode === null) {
        latestEpisode = { season_number: 1, episode_number: 0 };
      }
      let seasons = seriesResult.seasons.filter(
        (season) => season.season_number > 0
      );
      let episodeListBySeason = getAiredEpisodesBySeason(
        latestEpisode,
        seasons
      );
      let overview = element.overview;
      if (overview && overview.length > 100) {
        overview = overview.substring(0, 100) + "...";
      }
      return {
        key: element.id,
        seriesName: element.name,
        overview: overview,
        poster: element.poster_path,
        seasons: episodeListBySeason,
      };
    })
  );
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
  Show.findOne({ id: req.body.id.toString() }, (err, foundShow) => {
    if (err) {
      res.send(err);
    } else {
      const newShow = new Show({
        id: req.body.id,
        lastWatchedEpisodeNumber: req.body.lastWatchedEpisodeNumber,
        lastWatchedSeasonNumber: req.body.lastWatchedSeasonNumber,
      });
      newShow.save();
      res.send("Add successful");
    }
  });
});

app.post("/remove", (req, res) => {
  Show.findOne({ id: req.body.id.toString() }, (err, foundShow) => {
    if (foundShow) {
      Show.deleteOne({ id: foundShow.id }, (err) => {
        if (err) {
          res.send(err);
        } else {
          res.send("Delete successful");
        }
      });
    } else {
      res.send("No show found");
    }
  });
});

app.put("/update", (req, res) => {
  Show.updateOne(
    { id: req.body.id },
    {
      lastWatchedEpisodeNumber: req.body.lastWatchedEpisodeNumber,
      lastWatchedSeasonNumber: req.body.lastWatchedSeasonNumber,
    },
    async (err) => {
      if (err) {
        res.send(err);
      } else {
        const seriesResult = await fetchSeries(
          { id: req.body.id },
          token,
          debug
        );
        const next = await nextEpisode(
          seriesResult.seasons.filter((season) => season.season_number > 0),
          {
            show_id: req.body.id,
            episode_number: req.body.lastWatchedEpisodeNumber,
            season_number: req.body.lastWatchedSeasonNumber,
          }
        );
        const show = {
          episodesLeft: req.body.episodesLeft - 1,
          season_number: next.season_number,
          episode_number: next.episode_number,
        };
        res.send(show);
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
