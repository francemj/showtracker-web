import React from "react";
import Show from "./Show";

function Search(props) {
  return (
    <div className="search">
      <h1>Search</h1>
      {props.searchArray.map((element, index) => {
        let posterLink = "https://artworks.thetvdb.com";
        if (element.poster) {
          posterLink += element.poster;
        } else {
          posterLink += "/banners/images/missing/series.jpg";
        }
        let name = element.seriesName;
        if (name.length > 20) {
          name = name.substring(0, 17) + "...";
        }
        let className = "series";
        if (props.searchArray.length !== 1) {
          if (index === 0) {
            className += " top";
          } else if (index === props.searchArray.length - 1) {
            className += " bottom";
          }
        } else {
          className += " single";
        }

        return (
          <Show
            className={className}
            show={name}
            posterLink={posterLink}
            overview={element.overview}
          />
        );
      })}
    </div>
  );
}

export default Search;
