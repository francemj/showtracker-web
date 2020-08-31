import React from "react";
import Show from "./Show";
import ClearIcon from "@material-ui/icons/Clear";

function Search(props) {
  console.log(props.searchArray);
  return (
    <div className="search">
      <h1>Search</h1>
      {props.searchArray.map((element, index) => {
        let posterLink = "";
        if (element.poster) {
          posterLink = "https://artworks.thetvdb.com" + element.poster;
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
