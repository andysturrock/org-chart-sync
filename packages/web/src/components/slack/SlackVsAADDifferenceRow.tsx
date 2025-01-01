import React, { JSX } from "react";
import { UserDiff } from "../UserHierarchy";
import { SlackVsAADDifferenceFixRow } from "./SlackVsAADDifferenceFixRow";

type SlackVsAADDifferenceRowProps = {
  userDiff: UserDiff;
  children?: React.ReactNode;
}

function disableUserInSlack(userDiff: UserDiff) {
  console.log(`disableUserInSlackButtonClick`)
  console.log(userDiff)
}

function addUserToSlack(userDiff: UserDiff) {
  console.log(`addUserToSlack`)
  console.log(userDiff)
}

function changeManagerInSlack(userDiff: UserDiff) {
  console.log(`changeManagerInSlack`)
  console.log(userDiff)
}

export function SlackVsAADDifferenceRow(props: SlackVsAADDifferenceRowProps) {
  const tableRows: JSX.Element[] = [];

  if(props.userDiff.lhsEmail && !props.userDiff.rhsEmail) {
    function disableUserInSlackButtonClick() {
      disableUserInSlack(props.userDiff);
    }
    tableRows.push(
      <SlackVsAADDifferenceFixRow
        diffText={"In Slack but not AAD"}
        fixButtonText={"Disable user in Slack"}
        fixButtonOnClick={disableUserInSlackButtonClick}
        rowKey={`${props.userDiff.lhsEmail} In Slack but not AAD`}
      >
      </SlackVsAADDifferenceFixRow>
    )
  }
  if(props.userDiff.rhsEmail && !props.userDiff.lhsEmail) {
    function addUserToSlackButtonClick() {
      addUserToSlack(props.userDiff)
    }
    tableRows.push(
      <SlackVsAADDifferenceFixRow
        diffText={"In AAD but not in Slack"}
        fixButtonText={"Add to Slack"}
        fixButtonOnClick={addUserToSlackButtonClick}
        rowKey={`${props.userDiff.rhsEmail} In AAD but not in Slack`}
      >
      </SlackVsAADDifferenceFixRow>
    )
  }
  if(props.userDiff.lhsManagerEmail !== props.userDiff.rhsManagerEmail) {
    function changeManagerInSlackButtonClick() {
      changeManagerInSlack(props.userDiff)
    }
    tableRows.push(
      <SlackVsAADDifferenceFixRow
        diffText={`Manager is ${props.userDiff.lhsManagerEmail} in Slack but ${props.userDiff.rhsManagerEmail} in AAD`}
        fixButtonText={"Change manager in Slack"}
        fixButtonOnClick={changeManagerInSlackButtonClick}
        rowKey={`${props.userDiff.lhsEmail} Different managers`}
      >
      </SlackVsAADDifferenceFixRow>
    )
  }

  const email = props.userDiff.lhsEmail ? props.userDiff.lhsEmail : props.userDiff.rhsEmail;
  console.log(`SlackVsAADDifferenceRow key (email): ${email}`)
  return (
    <tr key={email}>
      <td style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        {email}
      </td>
      <td>
        <table style={{ width: 1200, borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
          <thead>
            <tr>
              <th style={{ width: 400, textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>Fix Action</th>
              <th style={{ width: 800, textAlign: "center", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>Difference</th>
            </tr>
          </thead>
          <tbody>
            {tableRows}
          </tbody>
        </table>
      </td>
      {props.children}
    </tr>
  );
}