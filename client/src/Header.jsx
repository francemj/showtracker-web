import React, { useState } from "react";
import Toolbar from "@material-ui/core/Toolbar";
import TvTwoToneIcon from "@material-ui/icons/TvTwoTone";
import InputBase from "@material-ui/core/InputBase";
import { fade, makeStyles } from "@material-ui/core/styles";
import SearchIcon from "@material-ui/icons/Search";

const useStyles = makeStyles((theme) => ({
  root: {
    flexGrow: 1,
  },
  search: {
    position: "absolute",
    borderRadius: theme.shape.borderRadius,
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25),
    },
    right: 0,
    marginLeft: "auto",
    marginRight: 24,
    width: "auto",
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  inputRoot: {
    color: "inherit",
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch",
      },
    },
  },
}));

function Header() {
  // const [searchArray, setSearchArray] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  function search() {
    fetch("http://localhost:5000/search/" + searchTerm)
      .then((data) => data.json())
      .then((res) => {
        // setSearchArray(res);
        console.log(res);
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

  const classes = useStyles();
  return (
    <header className={classes.root}>
      <Toolbar>
        <TvTwoToneIcon className="item" fontSize="large" />
        <h1 className="item">ShowTracker</h1>
        <div className={classes.search}>
          <div className={classes.searchIcon}>
            <SearchIcon />
          </div>
          <InputBase
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            value={searchTerm}
            placeholder="Search…"
            classes={{
              root: classes.inputRoot,
              input: classes.inputInput,
            }}
            inputProps={{ "aria-label": "search" }}
          />
        </div>
      </Toolbar>
    </header>
  );
}
export default Header;
