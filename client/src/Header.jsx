import React, { useState } from "react";
import Toolbar from "@material-ui/core/Toolbar";
import TvTwoToneIcon from "@material-ui/icons/TvTwoTone";
import InputBase from "@material-ui/core/InputBase";
import SearchIcon from "@material-ui/icons/Search";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";

function Header(props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    search();
    setSearchTerm("");
    setOpen(false);
  };

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

  const handleClick = (event) => {
    props.setPage(event.currentTarget.value);
    props.setDataFetched(false);
  };

  return (
    <header className="root">
      <Toolbar>
        <TvTwoToneIcon className="item icon" fontSize="large" />
        {props.width > 640 && <h1 className="item">ShowTracker</h1>}
        <Button
          onClick={handleClick}
          color="inherit"
          className="item home-button"
          value="home"
        >
          Home
        </Button>
        <Button
          onClick={handleClick}
          color="inherit"
          className="item button last"
          value="allShows"
        >
          Shows
        </Button>
        {props.width > 500 ? (
          <div className="search-box search item">
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
        ) : (
          <div className="search item">
            <IconButton
              onClick={handleClickOpen}
              color="inherit"
              className="item button"
              value="search"
            >
              <SearchIcon />
            </IconButton>
            <div>
              <Dialog
                open={open}
                onClose={handleClose}
                aria-labelledby="form-dialog-title"
              >
                <DialogContent>
                  <TextField
                    onChange={handleChange}
                    autoFocus
                    margin="dense"
                    id="name"
                    label="Series Name"
                    value={searchTerm}
                    fullWidth
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleClose} color="primary">
                    Search
                  </Button>
                </DialogActions>
              </Dialog>
            </div>
          </div>
        )}
      </Toolbar>
    </header>
  );
}
export default Header;
