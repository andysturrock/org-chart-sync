import { SilentRequest } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import React, { JSX } from "react";
import { slackAtlasDataAPIScopes } from "../../config";
import { SlackAtlasUser } from "../../types/slack_atlas_user";
import { UserDiffByUser } from "../UserHierarchy";
import { SlackVsAADDifferenceRow } from "./SlackVsAADDifferenceRow";

export type SlackVsAADDifferenceListProps = {
  // Slack users are lhs, AAD users are rhs
  userdiffs: UserDiffByUser;
  children?: React.ReactNode;
  slackAtlasUsers: Map<string, SlackAtlasUser>;
}

export function SlackVsAADDifferenceTable(props: SlackVsAADDifferenceListProps) {
  const { instance, accounts } = useMsal();
  const silentRequest: SilentRequest = {
    scopes: slackAtlasDataAPIScopes.scopes,
    account: accounts[0]
  };
  const getAccessToken = async () => { const authenticationResult = await instance.acquireTokenSilent(silentRequest); return authenticationResult.accessToken; }
  const getUserId = (email: string) => { return props.slackAtlasUsers.get(email)?.id; }

  const tableRows: JSX.Element[] = [];
  // Iterate like this so the rows are sorted alphabetically by email address.
  const emails = [...props.userdiffs.keys()].sort();
  for (const email of emails) {
    const userDiff = props.userdiffs.get(email);
    if(userDiff) {
      tableRows.push(
        <SlackVsAADDifferenceRow
          key={email}
          userDiff={userDiff}
          getAccessToken={getAccessToken}
          getUserId={getUserId}
        >
        </SlackVsAADDifferenceRow>
      )
    }
    else {
      console.error("Logic error in SlackVsAADDifferenceTable")
    }
  }
  return (
    <>
      <h6 className="card-title">Differences Slack vs AAD</h6>
      <table style={{ width: 1500, borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
        <thead style={{ width: 1500, borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>
          <tr>
            <th style={{ textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>Email address</th>
            <th style={{ textAlign: "center", borderWidth: 1, borderColor: "black", borderStyle: "solid" }}>Differences</th>
          </tr>
        </thead>
        <tbody>
          {tableRows}
        </tbody>
      </table>
      {props.children}
    </>
  )
}
