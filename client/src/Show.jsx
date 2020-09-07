import React, { useState } from "react";
import axios from "axios";
import Checkbox from "@material-ui/core/Checkbox";
import Button from "@material-ui/core/Button";

function Show(props) {
  const [checked, setChecked] = useState(props.checked);

  const [nextEpisodeNumber, setNextEpisodeNumber] = useState(
    props.nextEpisodeNumber
  );
  const [nextSeasonNumber, setNextSeasonNumber] = useState(
    props.nextSeasonNumber
  );
  const [episode, setEpisode] = useState(
    "S" + nextSeasonNumber + "E" + nextEpisodeNumber
  );
  const [episodesLeft, setEpisodesLeft] = useState(props.episodesLeft);

  function checkedAdd(event) {
    setChecked(event.target.checked);
    if (event.target.checked) {
      const show = {
        id: props.showId,
        lastWatchedEpisodeNumber: 0,
        lastWatchedSeasonNumber: 1,
      };
      axios.post("/add", show).then((response) => console.log(response));
    } else {
      const show = {
        id: props.showId,
      };
      axios.post("/remove", show).then((response) => console.log(response));
    }
  }

  function handleNext(event) {
    const show = {
      id: props.showId,
      lastWatchedEpisodeNumber: nextEpisodeNumber,
      lastWatchedSeasonNumber: nextSeasonNumber,
      episodesLeft: episodesLeft,
    };
    axios.put("/update", show).then((response) => {
      if (response.data.episodesLeft > 0) {
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
        {props.listClass !== "Search" ? (
          <p>{episode}</p>
        ) : (
          <p className="overview">{props.width > 550 && props.overview}</p>
        )}
      </div>
      {props.listClass === "Search" && (
        <Checkbox
          onChange={checkedAdd}
          className="checkbox"
          checked={checked}
        />
      )}
      {props.listClass === "Watchlist" && (
        <Button onClick={handleNext} color="inherit" className="checkbox">
          Next
        </Button>
      )}
    </div>
  );
}

export default Show;
