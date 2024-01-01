import React from "react";
import {SlackAtlasUser} from "../slack";
type SlackAtlasDataProps = {
  slackAtlasUsers: SlackAtlasUser[]
};

/**
 * Renders information about the user obtained from MS Graph 
 * @param props
 */
export function SlackAtlasDataDiv(props: SlackAtlasDataProps) {
  return (
    <div id="slack-atlas-data-div">
      <label>
        Number of users: {props.slackAtlasUsers.length}
      </label>
    </div>
  );
}