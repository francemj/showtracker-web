import React from "react";
import Header from "./Header";
import Show from "./Show";
import shows from "./shows.js";

function App() {
  return (
    <div className="App">
      <Header />
      <div className="watching">
        {shows.map((element, index) => {
          let posterLink =
            "https://artworks.thetvdb.com/banners/" + element.posterLink;
          let className = "series";
          let episode = "S" + element.season + "E" + element.episodeNumber;
          if (index === 0) {
            className += " top";
          } else if (index === shows.length - 1) {
            className += " bottom";
          }
          return (
            <Show
              className={className}
              show={element.title}
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
