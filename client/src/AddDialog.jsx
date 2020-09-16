import React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { FormControl, InputLabel, Select, Input } from "@material-ui/core";

function AddDialog(props) {
  return (
    <Dialog
      open={props.open}
      onClose={props.handleCancel}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Last Watched Episode</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Please enter the last episode that you watched of this show.
        </DialogContentText>
        <FormControl style={{ margin: "0 0.5em" }}>
          <InputLabel htmlFor="demo-dialog-native">Season</InputLabel>
          <Select
            native
            value={props.lastWatchedSeasonNumber}
            onChange={props.handleChangeSeason}
            input={<Input id="demo-dialog-native" />}
          >
            {props.seasons.map((season) => {
              return (
                <option value={season.season_number}>
                  {season.season_number}
                </option>
              );
            })}
          </Select>
        </FormControl>
        <FormControl style={{ margin: "0 0.5em" }}>
          <InputLabel htmlFor="demo-dialog-native">Episode</InputLabel>
          <Select
            native
            value={props.lastWatchedEpisodeNumber}
            onChange={props.handleChangeEpisode}
            input={<Input id="demo-dialog-native" />}
          >
            {props.seasons[props.lastWatchedSeasonNumber - 1] &&
              props.seasons[props.lastWatchedSeasonNumber - 1].episodes.map(
                (episode) => {
                  return <option value={episode}>{episode}</option>;
                }
              )}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.handleCancel} color="primary">
          Cancel
        </Button>
        <Button onClick={props.handleClose} color="primary">
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddDialog;
