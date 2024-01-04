import React from "react";
import {SlackAtlasUser} from "./SlackSection";
type SlackAtlasDataProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser>
};

/**
 * Renders information about the user obtained from MS Graph 
 * @param props
 */
export function SlackAtlasDataDiv(props: SlackAtlasDataProps) {
  return (
    <div id="slack-atlas-data-div">
      <label>
        Number of users: {props.slackAtlasUsers.size}
      </label>
    </div>
  );
}