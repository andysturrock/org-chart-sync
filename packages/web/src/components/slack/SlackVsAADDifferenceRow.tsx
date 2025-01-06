import React, { JSX, useEffect, useState } from "react";
import { deactivateSlackAtlasUser, patchSlackAtlasManager, postSlackAtlasData } from "../../api_wrappers";
import { AADUser } from "../aad/AADSection";
import { UserDiff } from "../UserHierarchy";
import { FixButtonProps, SlackVsAADDifferenceFixRow } from "./SlackVsAADDifferenceFixRow";

type SlackVsAADDifferenceRowProps = {
  userDiff: UserDiff;
  getAccessToken: () => Promise<string>;
  getSlackUserId: (email: string) => string | undefined;
  children?: React.ReactNode;
  azureActiveDirectoryUsers: Map<string, AADUser>;
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
    tableRows.push(makeInAADButNotSlackRows(props, accessToken));
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
  const slackUserId = props.getSlackUserId(props.userDiff.lhsEmail ?? "") ?? "";
  async function disableUserInSlackButtonClick() {
    console.log(`disableUserInSlackButtonClick`)
    const ok = await deactivateSlackAtlasUser(accessToken, slackUserId);
    return ok ? "Fixed" : "Cannot fix";
  }
  const key = `${props.userDiff.lhsEmail} In Slack but not AAD`;
  const fixButtonProps: FixButtonProps = {
    fixButtonText: "Disable user in Slack",
    fixButtonOnClick: disableUserInSlackButtonClick,
    disableButton: false
  }
  return (
    <SlackVsAADDifferenceFixRow
      diffText={"In Slack but not AAD"}
      fixButtons={[fixButtonProps]}
      rowKey={key}
      key={key}
    >
    </SlackVsAADDifferenceFixRow>
  )
}

function makeInAADButNotSlackRows(props: SlackVsAADDifferenceRowProps, accessToken: string) {

  async function addUserToSlackButtonClick() {
    const aadUser = props.azureActiveDirectoryUsers.get(props.userDiff.rhsEmail ?? "");
    if(!aadUser || !props.userDiff.rhsEmail) {
      // Should not happen.
      return "In AAD but not in Slack, but can't find full AAD data so can't fix.";
    }

    // See if we have the manager in Slack already.  If we do then we can add this user to the hierarchy here.
    const slackManagerUserId = props.getSlackUserId(props.userDiff.rhsManagerEmail ?? "") ?? null;
    const newSlackId = await postSlackAtlasData(accessToken, aadUser.givenName, aadUser.surname, props.userDiff.rhsEmail, aadUser.jobTitle, props.userDiff.rhsEmail, slackManagerUserId, false)
    return `Fixed (Slack user id: ${newSlackId})`;
  }
  async function addProfileOnlyUserToSlackButtonClick() {    
    const aadUser = props.azureActiveDirectoryUsers.get(props.userDiff.rhsEmail ?? "");
    if(!aadUser) {
      // Should not happen.
      return "In AAD but not in Slack, but can't find full AAD data so can't fix.";
    }
  
    const aadEmail = props.userDiff.rhsEmail || "";
    // Slack requires users to have unique usernames and email addresses.
    // So edit the Slack email to be in form of bob+slackprofile@example.com
    // Remove any +slackprofile bit first if it's there so we don't end up twice.
    let profileEmail = aadEmail.replace('+slackprofile@', '@');
    profileEmail = aadEmail.replace('@', '+slackprofile@');
    // The username we append .profile-only.  We do this so that if we ever want to create
    // a proper Slack user for this profile user, we won't get a username or email clash.
    // Slack usernames must be 21 chars or under.
    let profileUserName = `${aadUser.givenName.substring(0,3)}.` +
        `${aadUser.surname.substring(0,3)}.profile-only`;
    profileUserName = profileUserName.toLowerCase();

    // See if we have the manager in Slack already.  If we do then we can add this user to the hierarchy here.
    const slackManagerUserId = props.getSlackUserId(props.userDiff.rhsManagerEmail ?? "") ?? null;
    const newSlackId = await postSlackAtlasData(accessToken, aadUser.givenName, aadUser.surname, profileUserName, aadUser.jobTitle, profileEmail, slackManagerUserId, true)
    return `Fixed (Slack user id: ${newSlackId})`;
  }
  const key = `${props.userDiff.rhsEmail} In AAD but not in Slack add user`;
  const fixButtonProps: FixButtonProps[] = [];

  fixButtonProps.push({
    fixButtonText: "Add full user to Slack",
    fixButtonOnClick: addUserToSlackButtonClick,
    disableButton: false
  });
  fixButtonProps.push({
    fixButtonText: "Add profile-only user to Slack",
    fixButtonOnClick: addProfileOnlyUserToSlackButtonClick,
    disableButton: false
  });
  return(
    <SlackVsAADDifferenceFixRow
      diffText={"In AAD but not in Slack"}
      fixButtons={fixButtonProps}
      rowKey={key}
      key={key}
    >
    </SlackVsAADDifferenceFixRow>
  );
}

function makeCantFixRow(diffText: string) {
  const fixButtonProps: FixButtonProps = {
    fixButtonText: "Can't fix",
    fixButtonOnClick: async () => "Can't fix",
    disableButton: true
  }
  return (
    <SlackVsAADDifferenceFixRow
      diffText={diffText}
      fixButtons={[fixButtonProps]}
      rowKey={diffText}
      key={diffText}
    >
    </SlackVsAADDifferenceFixRow>
  );
}

function makeDifferentManagerRow(props: SlackVsAADDifferenceRowProps, accessToken: string) {
  const slackUserId = props.getSlackUserId(props.userDiff.lhsEmail ?? "") ?? "";
  if(!slackUserId || slackUserId === "") {
    const diffText = `Can't find Slack user for ${slackUserId}`;
    return makeCantFixRow(diffText);
  }

  const managerSlackId = props.getSlackUserId(props.userDiff.rhsManagerEmail ?? "") ?? "";
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
  const fixButtonProps: FixButtonProps = {
    fixButtonText: "Change manager in Slack",
    fixButtonOnClick: changeManagerInSlackButtonClick,
    disableButton: false
  }
  return (
    <SlackVsAADDifferenceFixRow
      diffText={`Manager is ${props.userDiff.lhsManagerEmail} in Slack but ${props.userDiff.rhsManagerEmail} in AAD`}
      fixButtons={[fixButtonProps]}
      rowKey={key}
      key={key}
    >
    </SlackVsAADDifferenceFixRow>
  )
}
