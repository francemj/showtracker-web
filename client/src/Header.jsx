import React, { useState } from "react";
import Toolbar from "@material-ui/core/Toolbar";
import TvTwoToneIcon from "@material-ui/icons/TvTwoTone";
import InputBase from "@material-ui/core/InputBase";
import SearchIcon from "@material-ui/icons/Search";
import Button from "@material-ui/core/Button";

function Header(props) {
  const [searchTerm, setSearchTerm] = useState("");

  function search() {
    fetch("/search/" + searchTerm)
      .then((data) => data.json())
      .then((res) => {
        props.setSearchArray(res);
        props.setPage("search");
        props.setDataFetched(false);
      });
  }

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      search();
      setSearchTerm("");
    }
  };

  const handleChange = (event) => {
    setSearchTerm(event.target.value);
  };

  const handleClick = () => {
    props.setPage("home");
    props.setDataFetched(false);
  };

  return (
    <header className="root">
      <Toolbar>
        <TvTwoToneIcon className="item" fontSize="large" />
        {props.width > 640 && <h1 className="item">ShowTracker</h1>}
        <Button onClick={handleClick} color="inherit" className="home-button">
          Home
        </Button>
        <div className="search-box">
          <div className="search-icon">
            <SearchIcon />
          </div>
          <InputBase
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            value={searchTerm}
            placeholder="Search…"
            classes={{
              root: "input-root",
              input: "input-input",
            }}
            inputProps={{ "aria-label": "search" }}
          />
        </div>
      </Toolbar>
    </header>
  );
}
export default Header;
