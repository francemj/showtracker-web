const axios = require("axios");
const { get, head } = require("./requests");

const baseUrl = "https://api.themoviedb.org/3/";

//Series
exports.fetchSeries = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "tv/" + params.id;
  return await get(url, headers);
};

//Search
exports.search = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let query = "query=" + params.query;
  let fields = ["language", "page", "include_adult", "first_air_date_year"];
  fields.forEach((item) => {
    if (params[item]) {
      query = query + "&" + item + "=" + params.item;
    }
  });
  let url = baseUrl + "search/tv?" + query;
  let result = await get(url, headers);
  return result;
};

//Episode
exports.fetchEpisode = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = { headers: token };
  let url =
    baseUrl +
    "tv/" +
    params.show_id +
    "/season/" +
    params.season_number +
    "/episode/" +
    params.episode_number;
  let result = await get(url, headers);
  return result;
};
