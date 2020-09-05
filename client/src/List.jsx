import React from "react";

import Show from "./Show";
import missing from "./missing.jpg";

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

        let posterLink = "https://image.tmdb.org/t/p/w185";
        if (element.poster) {
          posterLink += element.poster;
        } else {
          posterLink = missing;
        }

        if (props.class === "Watchlist") {
          let episode =
            "S" +
            element.nextSeasonNumberToWatch +
            "E" +
            element.nextEpisodeNumberToWatch;
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
            "S" +
            element.nextSeasonNumberToWatch +
            "E" +
            element.nextEpisodeNumberToWatch;
          return (
            <Show
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              episode={episode}
              date={element.nextToAir.air_date}
              width={props.width}
            />
          );
        }
      })}
    </div>
  );
}

export default Watching;
