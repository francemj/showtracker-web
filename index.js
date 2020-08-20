require("dotenv").config();
const express = require("express");
const {
  seriesEpisodesQuery,
  login,
  search,
  seriesImagesQuery,
  series,
  seriesEpisodesSummary,
  fullEpisode,
} = require("./modules/tvdb");

//express
const app = express();

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
  if (a.absoluteNumber < b.absoluteNumber) {
    comparison = -1;
  } else if (a.absoluteNumber > b.absoluteNumber) {
    comparison = 1;
  }
  return comparison;
}

(async () => {
  const token = await login(process.env.APIKEY);
  // let searchResult = await search({ name: "game of thrones" }, token);
  // console.log(searchResult);
  let result = await series({ id: 121361 }, token);
  console.log(result);

  // result = await seriesImagesQuery({ id: 121361, keyType: "poster" }, token);
  // result.sort(compareImages);
  // console.log(result);

  result = await seriesEpisodesSummary(121361, token);
  console.log(result);

  result = await seriesEpisodesQuery(
    { id: 121361, airedSeason: 7, airedEpisode: 1 },
    token
  );
  // let episodeList = result.filter((episode) => episode.absoluteNumber == 52);
  // episodeList.sort(compareEpisodes);
  console.log(result);
})();
