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

      <div className={props.width < 600 ? "text large-title" : "text"}>
        <h2>{props.show}</h2>
        {props.episode ? (
          <p>
            {props.episode}
            <br />
            <strong>
              {props.episodesLeft} episode{props.episodesLeft > 1 && "s"} left
            </strong>
          </p>
        ) : (
          <p>{props.overview}</p>
        )}
      </div>
      <Checkbox onChecked={checked} className="checkbox" />
    </div>
  );
}

export default Show;
