import React, { useState } from "react";
import axios from "axios";
import Checkbox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";
import AddDialog from "./AddDialog";

function Show(props) {
  const [checked, setChecked] = useState(props.checked);
  const [open, setOpen] = useState(false);

  const [nextEpisodeNumber, setNextEpisodeNumber] = useState(
    props.nextEpisodeNumber
  );
  const [nextSeasonNumber, setNextSeasonNumber] = useState(
    props.nextSeasonNumber
  );
  const [lastWatchedEpisodeNumber, setLastWatchedEpisodeNumber] = useState(0);
  const [lastWatchedSeasonNumber, setLastWatchedSeasonNumber] = useState(1);
  const [episode, setEpisode] = useState(
    "S" + nextSeasonNumber + "E" + nextEpisodeNumber
  );
  const [episodesLeft, setEpisodesLeft] = useState(props.episodesLeft);

  function checkedAdd(event) {
    setChecked(event.target.checked);
    if (event.target.checked) {
      setOpen(true);
    } else {
      const show = {
        id: props.showId,
      };
      axios.post("/remove", show).then((response) => console.log(response));
      props.setDataFetched(false);
    }
  }

  const handleCancel = () => {
    setChecked(false);
    setOpen(false);
  };
  const handleClose = () => {
    const show = {
      id: props.showId,
      lastWatchedEpisodeNumber: lastWatchedEpisodeNumber,
      lastWatchedSeasonNumber: lastWatchedSeasonNumber,
    };
    axios.post("/add", show).then((response) => console.log(response));
    setOpen(false);
  };

  const handleChangeSeason = (event) => {
    setLastWatchedSeasonNumber(event.target.value);
  };
  const handleChangeEpisode = (event) => {
    setLastWatchedEpisodeNumber(event.target.value);
  };

  function handleNext(event) {
    const show = {
      id: props.showId,
      lastWatchedEpisodeNumber: nextEpisodeNumber,
      lastWatchedSeasonNumber: nextSeasonNumber,
      episodesLeft: episodesLeft,
    };
    axios.put("/update", show).then((response) => {
      if (response.data.episodesLeft > 0) {
        setLastWatchedEpisodeNumber(nextEpisodeNumber);
        setLastWatchedSeasonNumber(nextSeasonNumber);
        setNextEpisodeNumber(response.data.episode_number);
        setNextSeasonNumber(response.data.season_number);
        setEpisode(
          "S" + response.data.season_number + "E" + response.data.episode_number
        );
        setEpisodesLeft(response.data.episodesLeft);
      } else {
        props.setDataFetched(false);
      }
    });
  }

  return (
    <div className={props.className}>
      <img className="photo" src={props.posterLink} alt="poster" />

      <div className="text">
        <h2>{props.show}</h2>
        {episodesLeft && (
          <p>
            <strong>{episodesLeft} </strong> episode
            {episodesLeft > 1 && "s"} left
          </p>
        )}
        {props.date && <p>{props.date}</p>}
        {["Search", "All Shows"].indexOf(props.listClass) < 0 ? (
          <p>{episode}</p>
        ) : (
          <p className="overview">{props.width > 550 && props.overview}</p>
        )}
      </div>
      {["Search", "All Shows"].indexOf(props.listClass) >= 0 && (
        <div className="action checkbox">
          <Checkbox onChange={checkedAdd} checked={checked} />
          <AddDialog
            open={open}
            handleCancel={handleCancel}
            handleClose={handleClose}
            handleChangeSeason={handleChangeSeason}
            handleChangeEpisode={handleChangeEpisode}
            lastWatchedSeasonNumber={lastWatchedSeasonNumber}
            lastWatchedEpisodeNumber={lastWatchedEpisodeNumber}
            seasons={props.seasons}
          />
        </div>
      )}
      {props.listClass === "Watchlist" && (
        <Button onClick={handleNext} color="inherit" className="action next">
          Next
        </Button>
      )}
    </div>
  );
}

export default Show;
