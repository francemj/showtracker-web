import React, { useState, useEffect } from "react";
import Header from "./Header";
import List from "./List";
// import axios from "axios";

function App() {
  const [width, setWidth] = useState(window.innerWidth);
  const [searchArray, setSearchArray] = useState([]);
  const [searched, setSearched] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  const [watchingArray, setWatchingArray] = useState([]);

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
        setWatchingArray(res);
      });
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
        <List array={searchArray} width={width} class="Search" />
      ) : (
        <>
          <List array={watchingArray} width={width} class="Watchlist" />
        </>
      )}
    </div>
  );
}

export default App;
