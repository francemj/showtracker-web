import React from "react";

import Show from "./Show";

function Watching(props) {
  return (
    <div className="list">
      <h1>{props.class}</h1>
      {props.array.map((element, index) => {
        let className = "series";
        if (props.array.length !== 1) {
          if (index === 0) {
            className += " top";
          } else if (index === props.array.length - 1) {
            className += " bottom";
          }
        } else {
          className += " single";
        }
        let name = element.seriesName;

        let posterLink = "https://artworks.thetvdb.com";
        if (props.class !== "Search") {
          posterLink += "/banners/";
        }
        if (element.poster) {
          if (element.poster === "/banners/images/missing/series.jpg") {
            posterLink += "/banners/images/missing/series.jpg";
          } else {
            posterLink +=
              element.poster.substring(0, element.poster.length - 4) + "_t.jpg";
          }
        } else {
          posterLink += "/banners/images/missing/series.jpg";
        }

        if (props.class === "Watchlist") {
          let episode =
            "S" + element.airedSeason + "E" + element.airedEpisodeNumber;
          return (
            <Show
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              episode={episode}
              episodesLeft={element.episodesLeft}
              width={props.width}
            />
          );
        } else if (props.class === "Search") {
          return (
            <Show
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              overview={element.overview}
              width={props.width}
            />
          );
        } else {
          let episode =
            "S" + element.airedSeason + "E" + element.airedEpisodeNumber;
          return (
            <Show
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              episode={episode}
              date={element.airingDate}
              width={props.width}
            />
          );
        }
      })}
    </div>
  );
}

export default Watching;
