import React from "react";

import Show from "./Show";
import missing from "./missing.jpg";

function List(props) {
  const divClass = "list " + props.class;
  return (
    <div className={divClass}>
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
          return (
            <Show
              key={element.key}
              showId={element.key}
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              nextEpisodeNumber={element.nextEpisodeNumberToWatch}
              nextSeasonNumber={element.nextSeasonNumberToWatch}
              episodesLeft={element.episodesLeft}
              setDataFetched={props.setDataFetched}
              checked={false}
            />
          );
        } else if (props.class === "Search") {
          let checked = props.seriesArray.find(
            (show) => show.key === element.key
          );
          if (checked) {
            checked = true;
          } else {
            checked = false;
          }
          return (
            <Show
              key={element.key}
              showId={element.key}
              listClass={props.class}
              className={className}
              show={name}
              posterLink={posterLink}
              overview={element.overview}
              width={props.width}
              checked={checked}
              seriesArray={props.seriesArray}
            />
          );
        } else if (props.class === "Upcoming") {
          return (
            <Show
              listClass={props.class}
              className={className}
              key={element.key}
              showId={element.key}
              show={name}
              posterLink={posterLink}
              nextEpisodeNumber={element.nextToAir.episode_number}
              nextSeasonNumber={element.nextToAir.season_number}
              date={element.nextToAir.air_date}
              checked={false}
            />
          );
        } else {
          return (
            <Show
              listClass={props.class}
              className={className}
              key={element.key}
              showId={element.key}
              show={name}
              posterLink={posterLink}
              nextEpisodeNumber={element.nextEpisodeNumberToWatch}
              nextSeasonNumber={element.nextSeasonNumberToWatch}
              checked={true}
              width={props.width}
              overview={element.overview}
            />
          );
        }
      })}
    </div>
  );
}

export default List;
