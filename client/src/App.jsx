import React, { useState } from "react";
import Header from "./Header";
import Watching from "./Watching";
import Search from "./Search";
// import axios from "axios";

function App() {
  const [searchArray, setSearchArray] = useState([]);
  const [searched, setSearched] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);
  return (
    <div className="App">
      <Header
        searchArray={searchArray}
        setSearchArray={setSearchArray}
        setSearched={setSearched}
        setDataFetched={setDataFetched}
      />
      {searched ? (
        <Search searchArray={searchArray} />
      ) : (
        <Watching dataFetched={dataFetched} setDataFetched={setDataFetched} />
      )}
    </div>
  );
}

export default App;
