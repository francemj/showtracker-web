import React from "react";
import Checkbox from "@material-ui/core/Checkbox";

function Show(props) {
  function checked() {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId: 121361 }),
    };
    fetch("http://localhost:5000/add", requestOptions)
      .then((data) => data.json())
      .then((res) => console.log(res.json()));
  }
  return (
    <div className={props.className}>
      <img className="photo" src={props.posterLink} alt="poster" />
      <div className="text">
        <h1>{props.show}</h1>
        <p>
          {props.episode}
          <br />
          {props.episodeName} <br />
          <strong>
            {props.episodesLeft} episode{props.episodesLeft > 1 && "s"} left
          </strong>
        </p>
      </div>
      <Checkbox onChecked={checked} className="checkbox" />
    </div>
  );
}

export default Show;
