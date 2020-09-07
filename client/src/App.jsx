import React, { useState, useEffect } from "react";
import Header from "./Header";
import List from "./List";
// import axios from "axios";

function App() {
  const [width, setWidth] = useState(window.innerWidth);
  const [searchArray, setSearchArray] = useState([]);
  const [searched, setSearched] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [seriesArray, setSeriesArray] = useState([]);

  const handleResize = () => {
    setWidth(window.innerWidth);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    if (!dataFetched) {
      setDataFetched(true);
      getShowData();
    }
  }, [dataFetched]);

  function getShowData() {
    fetch("/series")
      .then((data) => data.json())
      .then((res) => {
        setSeriesArray(res);
      });
  }
  function compareDates(a, b) {
    let comparison = 0;
    if (Date.parse(a.nextToAir.air_date) < Date.parse(b.nextToAir.air_date)) {
      comparison = -1;
    } else if (
      Date.parse(a.nextToAir.air_date) > Date.parse(b.nextToAir.air_date)
    ) {
      comparison = 1;
    }
    return comparison;
  }

  return (
    <div className="App">
      <Header
        searchArray={searchArray}
        setSearchArray={setSearchArray}
        setSearched={setSearched}
        setDataFetched={setDataFetched}
        width={width}
      />
      {searched ? (
        <List
          array={searchArray}
          seriesArray={seriesArray}
          width={width}
          class="Search"
        />
      ) : (
        <>
          <List
            array={seriesArray.filter((show) => show.episodesLeft > 0)}
            seriesArray={seriesArray}
            width={width}
            class="Watchlist"
            setSearched={setSearched}
            setDataFetched={setDataFetched}
          />
          <List
            array={seriesArray
              .filter((show) => show.nextToAir)
              .sort(compareDates)}
            width={width}
            class="Upcoming"
          />
        </>
      )}
    </div>
  );
}

export default App;
