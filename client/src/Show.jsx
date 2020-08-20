import React from "react";
import Checkbox from "@material-ui/core/Checkbox";

function Show(props) {
  return (
    <div className={props.className}>
      <img className="photo" src={props.posterLink} alt="poster" />
      <div className="text">
        <h1>{props.show}</h1>
        <p>{props.episodeName}</p>
        <p>{props.episode}</p>
      </div>
      <Checkbox className="checkbox" />
    </div>
  );
}

export default Show;
