import React from "react";
import Checkbox from "@material-ui/core/Checkbox";

function Show(props) {
  function checked() {
    const requestOptions = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    };
    fetch("http://localhost:5000/add", requestOptions)
      .then((data) => data.json())
      .then((res) => console.log(res));
  }
  return (
    <div className={props.className}>
      <img className="photo" src={props.posterLink} alt="poster" />
      <div className="text">
        <h1>{props.show}</h1>
        <p>{props.episode}</p>
        <p>{props.episodeName}</p>
        <p>
          <strong>{props.episodeName}</strong>
        </p>
      </div>
      <Checkbox onChecked={checked} className="checkbox" />
    </div>
  );
}

export default Show;
