import React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import { FormControl, InputLabel, Select, Input } from "@material-ui/core";
import CheckIcon from "@material-ui/icons/Check";
import ToggleButton from "@material-ui/lab/ToggleButton";

function AddDialog(props) {
  return (
    <Dialog
      open={props.open}
      onClose={props.handleCancel}
      aria-labelledby="form-dialog-title"
    >
      <DialogTitle id="form-dialog-title">Last Watched Episode</DialogTitle>
      <DialogContent>
        {!props.started && (
          <>
            <DialogContentText>
              Have you started this show?
              <ToggleButton
                style={{ width: "1em", height: "1em", marginLeft: "0.5em" }}
                value="check"
                selected={props.started}
                onChange={() => {
                  props.setStarted(!props.started);
                  props.setLastWatchedEpisodeNumber(1);
                }}
              >
                <CheckIcon />
              </ToggleButton>
            </DialogContentText>
          </>
        )}
        {props.started && (
          <>
            <DialogContentText>
              Please enter the last episode that you have watched:
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
          </>
        )}
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
