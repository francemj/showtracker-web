const axios = require("axios");
const { get, head } = require("./requests");

const baseUrl = "https://api.thetvdb.com";

//Authentication
exports.login = async function (apiKey) {
  let data = {
    apikey: apiKey,
  };
  let url = baseUrl + "/login";
  const response = await axios.post(url, data).catch(function (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.log(error.response.data);
      console.log(error.response.status);
      console.log(error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
      // http.ClientRequest in node.js
      console.log(error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.log("Error", error.message);
    }
    console.log(error.config);
  });
  return {
    Authorization: "Bearer " + response.data.token,
  };
};

exports.refreshToken = async function (token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let url = baseUrl + "/refresh_token";
  let params = {
    headers: token,
  };
  await get(url, params);
};

//Episodes
exports.fullEpisode = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  const id = params.id;
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/episodes/" + id;
  return await get(url, headers);
};

//Languages
exports.languages = async function (token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/languages";
  return await get(url, headers);
};

exports.language = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/languages/" + params.id;
  return await get(url, headers);
};

//Movies
exports.movie = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  const id = params.id;
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/movies/" + id;
  return await get(url, headers);
};

//Search
exports.search = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let query = "";
  if (params.name) {
    query = "name=" + params.name;
  } else if (params.imdbId) {
    query = "imdbId=" + params.imdbId;
  } else if (params.zap2itId) {
    query = "zap2itId=" + params.zap2itId;
  } else if (params.slug) {
    query = "slug=" + params.slug;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/search/series?" + query;
  return await get(url, headers);
};

exports.searchParams = async function (token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/search/series/params";
  return await get(url, headers);
};

//Series
exports.series = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id;
  return await get(url, headers);
};

exports.seriesHead = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id;
  return await head(url, headers);
};

exports.seriesActors = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/actors";
  return await get(url, headers);
};

exports.seriesEpisodes = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let query = "";
  if (params.page) {
    query = "?page=" + params.page;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/episodes" + query;
  return await get(url, headers);
};

exports.seriesEpisodesQuery = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let query = "";
  for (const [key, value] of Object.entries(params)) {
    if (key != "id" && key != "lang") {
      if (query === "") {
        query = query + key + "=" + value;
      } else {
        query = query + "&" + key + "=" + value;
      }
    }
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/episodes/query?" + query;
  return await get(url, headers);
};

exports.seriesEpisodesQueryParams = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/episodes/query/params";
  return await get(url, headers);
};

exports.seriesEpisodesSummary = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/episodes/summary";
  return await get(url, headers);
};

exports.seriesFilter = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/filter?keys=" + params.keys;
  return await get(url, headers);
};

exports.seriesFilterParams = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/filter/params";
  return await get(url, headers);
};

exports.seriesImages = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/images";
  return await get(url, headers);
};

exports.seriesImagesQuery = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let query = "";
  for (const [key, value] of Object.entries(params)) {
    if (key != "id" && key != "lang") {
      if (query === "") {
        query = query + key + "=" + value;
      } else {
        query = query + "&" + key + "=" + value;
      }
    }
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/images/query?" + query;
  return await get(url, headers);
};

exports.seriesImagesQueryParams = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/series/" + params.id + "/images/query/params";
  return await get(url, headers);
};

//Updates
exports.updatedQuery = async function (params, token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let query = "";
  for (const [key, value] of Object.entries(params)) {
    if (key != "lang") {
      if (query === "") {
        query = query + key + "=" + value;
      } else {
        query = query + "&" + key + "=" + value;
      }
    }
  }
  if (params.lang) {
    token = { ...token, "Accept-Language": params.lang };
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/updated/query?" + query;
  return await get(url, headers);
};

exports.updatedQueryParams = async function (token, debug) {
  if (debug) {
    token.debug = true;
  } else {
    token.debug = false;
  }
  let headers = {
    headers: token,
  };
  let url = baseUrl + "/updated/query/params";
  return await get(url, headers);
};
