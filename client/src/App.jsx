import React, { useState, useEffect } from "react";
import Header from "./Header";
import Show from "./Show";
import shows from "./shows.js";
// import axios from "axios";

let dataFetched = false;

function App() {
  const [seriesArray, setSeriesArray] = useState([]);

  function getShowData() {
    console.log(shows);
    shows.forEach((series) =>
      fetch("http://localhost:5000/series/" + series.id)
        .then((data) => data.json())
        .then((res) =>
          setSeriesArray((prevItems) => {
            return [...prevItems, res];
          })
        )
    );
  }

  useEffect(() => {
    if (!dataFetched) {
      dataFetched = true;
      getShowData();
    }
    console.log(seriesArray);
  });
  return (
    <div className="App">
      <Header />
      <div className="watching">
        {seriesArray.map((element, index) => {
          let posterLink =
            "https://artworks.thetvdb.com/banners/" +
            element.poster.substring(0, element.poster.length - 4) +
            "_t.jpg";
          let className = "series";
          let episode =
            "S" + element.airedSeason + "E" + element.airedEpisodeNumber;
          if (index === 0) {
            className += " top";
          } else if (index === seriesArray.length - 1) {
            className += " bottom";
          }
          return (
            <Show
              className={className}
              show={element.seriesName}
              posterLink={posterLink}
              episodeName={element.episodeName}
              episode={episode}
            />
          );
        })}
      </div>
    </div>
  );
}

export default App;
