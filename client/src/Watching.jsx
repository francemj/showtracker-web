import React, { useState, useEffect } from "react";

import WatchingShow from "./WatchingShow";

let dataFetched = false;

function Watching() {
  const [seriesArray, setSeriesArray] = useState([]);

  function getShowData() {
    fetch("http://localhost:5000/series/")
      .then((data) => data.json())
      .then((res) => setSeriesArray(res));
  }

  useEffect(() => {
    if (!dataFetched) {
      dataFetched = true;
      getShowData();
    }
    console.log(seriesArray);
  });

  return (
    <div className="watching">
      {seriesArray.map((element, index) => {
        let posterLink =
          "https://artworks.thetvdb.com/banners/" +
          element.poster.substring(0, element.poster.length - 4) +
          "_t.jpg";
        let className = "series";
        let episode =
          "S" + element.airedSeason + "E" + element.airedEpisodeNumber;
        if (seriesArray.length !== 1) {
          if (index === 0) {
            className += " top";
          } else if (index === seriesArray.length - 1) {
            className += " bottom";
          }
        } else {
          className += " single";
        }

        return (
          <WatchingShow
            className={className}
            show={element.seriesName}
            posterLink={posterLink}
            episodeName={element.episodeName}
            episode={episode}
            episodesLeft={element.episodesLeft}
          />
        );
      })}
    </div>
  );
}

export default Watching;
