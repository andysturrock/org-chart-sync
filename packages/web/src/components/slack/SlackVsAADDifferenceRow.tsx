import React, { JSX, useEffect, useState } from "react";
import { patchSlackAtlasManager } from "../../api_wrappers";
import { UserDiff } from "../UserHierarchy";
import { SlackVsAADDifferenceFixRow } from "./SlackVsAADDifferenceFixRow";

type SlackVsAADDifferenceRowProps = {
  userDiff: UserDiff;
  getAccessToken: () => Promise<string>;
  getUserId: (email: string) => string | undefined;
  children?: React.ReactNode;
}

export function SlackVsAADDifferenceRow(props: SlackVsAADDifferenceRowProps) {
  const tableRows: JSX.Element[] = [];
  const [accessToken, setAccessToken] = useState("")

  useEffect(() => {
    async function getAccessToken() {
      setAccessToken(await props.getAccessToken());
    };
    getAccessToken();
  });

  if(props.userDiff.lhsEmail && !props.userDiff.rhsEmail) {
    tableRows.push(makeInSlackButNotAADRow(props, accessToken));
  }
  else if(props.userDiff.rhsEmail && !props.userDiff.lhsEmail) {
    tableRows.push(makeInAADButNotSlackRow(props));
  }
  else if(props.userDiff.lhsEmail && (props.userDiff.lhsManagerEmail !== props.userDiff.rhsManagerEmail)) {
    tableRows.push(makeDifferentManagerRow(props, accessToken))
  }
  else {
    console.warn(`Unexpected diff in SlackVsAADDifferenceRow: ${JSON.stringify(props.userDiff)}`);
  }

  const email = props.userDiff.lhsEmail ? props.userDiff.lhsEmail : props.userDiff.rhsEmail;
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

function makeInSlackButNotAADRow(props: SlackVsAADDifferenceRowProps, accessToken: string) {
  const slackUserId = props.getUserId(props.userDiff.lhsEmail ?? "") ?? "";
  async function disableUserInSlackButtonClick() {
    console.log(`disableUserInSlackButtonClick`)
    console.log(props.userDiff)
    console.log(slackUserId)
    console.log(accessToken)
    return "";
  }
  const key = `${props.userDiff.lhsEmail} In Slack but not AAD`;
  return (
    <SlackVsAADDifferenceFixRow
      diffText={"In Slack but not AAD"}
      fixButtonText={"Disable user in Slack"}
      fixButtonOnClick={disableUserInSlackButtonClick}
      rowKey={key}
      key={key}
      disableButton={false}
    >
    </SlackVsAADDifferenceFixRow>
  )
}

function makeInAADButNotSlackRow(props: SlackVsAADDifferenceRowProps) {
  async function addUserToSlackButtonClick() {
    console.log(`addUserToSlackButtonClick`)
    console.log(props.userDiff)
    return "";
  }
  const key = `${props.userDiff.rhsEmail} In AAD but not in Slack`;
  return (
    <SlackVsAADDifferenceFixRow
      diffText={"In AAD but not in Slack"}
      fixButtonText={"Add to Slack"}
      fixButtonOnClick={addUserToSlackButtonClick}
      rowKey={key}
      key={key}
      disableButton={false}
    >
    </SlackVsAADDifferenceFixRow>
  )
}

function makeCantFixRow(diffText: string) {
  return (
    <SlackVsAADDifferenceFixRow
      diffText={diffText}
      fixButtonText={"Can't fix"}
      fixButtonOnClick={async () => ""}
      rowKey={diffText}
      key={diffText}
      disableButton={true}
    >
    </SlackVsAADDifferenceFixRow>
  );
}

function makeDifferentManagerRow(props: SlackVsAADDifferenceRowProps, accessToken: string) {
  const slackUserId = props.getUserId(props.userDiff.lhsEmail ?? "") ?? "";
  if(!slackUserId || slackUserId === "") {
    const diffText = `Can't find Slack user for ${slackUserId}`;
    return makeCantFixRow(diffText);
  }

  const managerSlackId = props.getUserId(props.userDiff.rhsManagerEmail ?? "") ?? "";
  if(!managerSlackId || managerSlackId === "") {
    const diffText = `Manager is ${props.userDiff.lhsManagerEmail} in Slack but ${props.userDiff.rhsManagerEmail} in AAD.
    Add ${props.userDiff.rhsManagerEmail} to Slack and try again.`;
    return makeCantFixRow(diffText);
  }
  async function changeManagerInSlackButtonClick() {
    console.log(`changeManagerInSlackButtonClick`)
    console.log(props.userDiff)
    console.log(`slackId: ${slackUserId}, managerSlackId: ${managerSlackId}`)
    const success = await patchSlackAtlasManager(accessToken, slackUserId, managerSlackId);
    return success ? "Fixed" : "Cannot fix";
  }
  const key = `${props.userDiff.lhsEmail} Different managers`;
  return (
    <SlackVsAADDifferenceFixRow
      diffText={`Manager is ${props.userDiff.lhsManagerEmail} in Slack but ${props.userDiff.rhsManagerEmail} in AAD`}
      fixButtonText={"Change manager in Slack"}
      fixButtonOnClick={changeManagerInSlackButtonClick}
      rowKey={key}
      key={key}
      disableButton={false}
    >
    </SlackVsAADDifferenceFixRow>
  )
}
