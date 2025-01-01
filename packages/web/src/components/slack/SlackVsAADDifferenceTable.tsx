import React, { JSX } from "react";
import { UserDiffByUser } from "../UserHierarchy";
import { SlackVsAADDifferenceRow } from "./SlackVsAADDifferenceRow";

export type SlackVsAADDifferenceListProps = {
  // Slack users are lhs, AAD users are rhs
  userdiffs: UserDiffByUser;
  children?: React.ReactNode;
}

export function SlackVsAADDifferenceTable(props: SlackVsAADDifferenceListProps) {
  const tableRows: JSX.Element[] = [];
  const emails = [...props.userdiffs.keys()].sort();
  for (const email of emails) {
    const userDiff = props.userdiffs.get(email);
    if(userDiff) {
      tableRows.push(
        <SlackVsAADDifferenceRow userDiff={userDiff} key={email}>
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
