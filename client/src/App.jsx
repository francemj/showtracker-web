import React from "react";
import Header from "./Header";
import Watching from "./Watching";
import Search from "./Search";
// import axios from "axios";

let searchResults = false;

function App() {
  return (
    <div className="App">
      <Header />
      {!searchResults ? <Watching /> : <Search />}
    </div>
  );
}

export default App;
