import React from "react";
import {ProfileData} from "../graph";
type ProfileProps = {
  graphData: ProfileData
};

/**
 * Renders information about the user obtained from MS Graph 
 * @param props
 */
export function ProfileDataDiv(props: ProfileProps) {
  return (
    <div id="profile-div">
      <p>
        <strong>First Name: </strong> {props.graphData.givenName}
      </p>
      <p>
        <strong>Last Name: </strong> {props.graphData.surname}
      </p>
      <p>
        <strong>Email: </strong> {props.graphData.userPrincipalName}
      </p>
      <p>
        <strong>Id: </strong> {props.graphData.id}
      </p>
    </div>
  );
}