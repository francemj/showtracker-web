import React from "react";
import { ReactComponent as TMDB } from "./tmdb.svg";

function About() {
  return (
    <div className="about">
      <p>
        This product uses the TMDb API but is not endorsed or certified by TMDb.
      </p>
      <div className="logo">
        <TMDB />
      </div>
    </div>
  );
}

export default About;
