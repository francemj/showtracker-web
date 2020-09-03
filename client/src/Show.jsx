import React from "react";
import Checkbox from "@material-ui/core/Checkbox";

function Show(props) {
  function checked() {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: 121361 }),
    };
    fetch("/add", requestOptions)
      .then((data) => data.json())
      .then((res) => console.log(res.json()));
  }

  return (
    <div className={props.className}>
      <img className="photo" src={props.posterLink} alt="poster" />

      <div className="text">
        <h2>{props.show}</h2>
        {props.episodesLeft && (
          <p>
            <strong>{props.episodesLeft} </strong> episode
            {props.episodesLeft > 1 && "s"} left
          </p>
        )}
        {props.date && <p>{props.date}</p>}
        {props.episode ? (
          <p>{props.episode}</p>
        ) : (
          <p className="overview">{props.width > 550 && props.overview}</p>
        )}
      </div>
      {props.listClass !== "Upcoming" && (
        <Checkbox onChecked={checked} className="checkbox" />
      )}
    </div>
  );
}

export default Show;
