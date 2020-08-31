import React, { useState } from "react";
import Header from "./Header";
import Watching from "./Watching";
import Search from "./Search";
// import axios from "axios";

function App() {
  const [searchArray, setSearchArray] = useState([]);
  const [searched, setSearched] = useState(false);
  return (
    <div className="App">
      <Header
        searchArray={searchArray}
        setSearchArray={setSearchArray}
        setSearched={setSearched}
      />
      <Watching />
      {searched && <Search searchArray={searchArray} />}
    </div>
  );
}

export default App;
