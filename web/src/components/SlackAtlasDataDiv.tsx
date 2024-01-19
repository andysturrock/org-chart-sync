import React, {useState} from "react";
import {SlackAtlasUser} from "./SlackSection";
import {FileUser} from "./FileSection";
import {Button} from "react-bootstrap";
import {inspect} from "util";
import {SilentRequest} from "@azure/msal-browser";
import {useMsal} from "@azure/msal-react";
import {slackAtlasDataAPIScopes} from "../authConfig";
import {AADUser} from "./AADSection";

enum FixAction {
  DeactivateSlackUser = "Deactivate user in Slack",
  AddSlackManager = "Add manager in Slack",
  UpdateSlackManager = "Update manager in Slack",
  RemoveSlackManager = "Remove manager in Slack",
  CannotFix = "Cannot fix",
  Fixed = "Fixed",
  Fixing = "Fixing"
}
type SlackVsFileDifference = {
  fileUser: FileUser | undefined,
  slackUser: SlackAtlasUser,
  slackManager: SlackAtlasUser | undefined,
  newSlackManager: SlackAtlasUser | undefined,
  fileManager: FileUser | undefined,
  fixAction: FixAction | undefined
};
type SlackVsFileDifferencesListProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  slackVsFileDifferences: Map<string, SlackVsFileDifference> | undefined,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference> | undefined>>,
  children?: React.ReactNode,
};
function SlackVsFileDifferencesList(props: SlackVsFileDifferencesListProps) {

  if(props.slackAtlasUsers && props.slackVsFileDifferences) {
    if(props.slackVsFileDifferences.size === 0) {
      return (
        <>
          <h6 className="card-title">No differences</h6>
          {props.children}
        </>
      );
    } else {
      const tableRows: JSX.Element[] = [];
      for(const difference of props.slackVsFileDifferences.values()) {
        const disabled = (difference.fixAction === FixAction.CannotFix ||
            difference.fixAction === FixAction.Fixed  ||
            difference.fixAction === FixAction.Fixing);
        tableRows.push (
          <tr key={difference.slackUser.email}>
            <td style={{textAlign: "left"}}>
              { difference.slackUser.email }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.slackUser.userName }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.fileManager?.email }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.slackUser.manager?.email }
            </td>
            <td style={{textAlign: "left"}}>
              <Button
                variant="secondary"
                className="ml-auto"
                title="Select File"
                disabled={disabled}
                // eslint-disable-next-line @typescript-eslint/no-misused-promises
                onClick={() => {onFixInSlackButtonClick(difference);}}>
                { difference.fixAction }
              </Button>
            </td>
          </tr>
        );
      }
      return (
        <div>
          <h6 className="card-title">Differences Slack vs file</h6>
          <table style={{width: 1500}}>
            <thead>
              <tr>
                <th style={{textAlign: "left"}}>Email address</th>
                <th style={{textAlign: "left"}}>Slack username</th>
                <th style={{textAlign: "left"}}>Manager in file</th>
                <th style={{textAlign: "left"}}>Manager in Slack</th>
                <th style={{textAlign: "left"}}>Fix action</th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </table>
          {props.children}
        </div>
      );
    }
  } else {
    return (
      <>
        {props.children}
      </>
    );
  }

  function onFixInSlackButtonClick(slackVsFileDifference: SlackVsFileDifference) {
    console.log(`Fixing ${inspect(slackVsFileDifference)}`);
  }
}

type CompareWithFileButtonProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser>,
  fileUsers: Map<string, FileUser>,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference> | undefined>>,
  children?: React.ReactNode;
};
export function CompareWithFileButton(props: CompareWithFileButtonProps) {
  return (
    <>
      <Button
        variant="secondary"
        className="ml-auto"
        title="Compare with File data"
        onClick={compareWithFileButtonClick}>
          Compare with File data
      </Button>
      {props.children}
    </>
  );

  function compareWithFileButtonClick() {
    const differences = new Map<string, SlackVsFileDifference>();
    console.log("compare with file");
    for(const [email, slackAtlasUser] of props.slackAtlasUsers) {
      const fileUser = props.fileUsers.get(email);
      const slackVsFileDifference: SlackVsFileDifference = {
        fileUser,
        slackUser: slackAtlasUser,
        slackManager: slackAtlasUser.manager,
        newSlackManager: undefined,
        fileManager: undefined,
        fixAction: undefined,
      };
      differences.set(email, slackVsFileDifference);
      // Person is in Slack but not the file
      if(!fileUser) {
        console.log(`${email} is in Slack but not file`);
        slackVsFileDifference.fixAction = FixAction.DeactivateSlackUser;
      }
      else {
        // Manager set in Slack but not in file
        if(slackAtlasUser.manager && !fileUser.manager) {
          slackVsFileDifference.fixAction = FixAction.RemoveSlackManager;
        }
        // Manager set in Slack and file but different
        else if(slackAtlasUser.manager && fileUser.manager && fileUser.manager.email !== slackAtlasUser.manager.email) {
          slackVsFileDifference.newSlackManager = props.slackAtlasUsers.get(email);
          slackVsFileDifference.fixAction = (slackVsFileDifference.newSlackManager === undefined) ?
            FixAction.UpdateSlackManager : FixAction.CannotFix;
        }
        // Manager set in file but not in Slack
        else if(fileUser.manager && !slackAtlasUser.manager) {
          slackVsFileDifference.fixAction = FixAction.AddSlackManager;
          slackVsFileDifference.newSlackManager = props.slackAtlasUsers.get(email);
          slackVsFileDifference.fixAction = (slackVsFileDifference.newSlackManager === undefined) ?
            FixAction.UpdateSlackManager : FixAction.CannotFix;
        }
        // Manager set in neither file nor Slack
        else if(!fileUser.manager && !slackAtlasUser.manager) {
          console.log(`user ${email} is fine (no manager)`);
          differences.delete(email);
        }
        // Manager is the same in file and Slack
        else if(fileUser.manager?.email === slackAtlasUser.manager?.email) {
          differences.delete(email);
        }
        // Presumably a logic error
        else {
          slackVsFileDifference.fixAction = FixAction.CannotFix;
        }
      }
    }
    props.setSlackVsFileDifferences(differences);
  }
}

type SlackAtlasDataDivProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser>,
  fileUsers: Map<string, FileUser> | undefined,
  azureActiveDirectoryUsers: Map<string, AADUser> | undefined
};
export function SlackAtlasDataDiv(props: SlackAtlasDataDivProps) {
  const [slackVsFileDifferences, setSlackVsFileDifferences] =
    useState<Map<string, SlackVsFileDifference> | undefined>(undefined);
  return (
    <>
      <div id="slack-atlas-data-div">
        <label>
        Number of users: {props.slackAtlasUsers.size}
        </label>
      </div>
      {
        props.fileUsers ?
          <>
            <CompareWithFileButton
              slackAtlasUsers={props.slackAtlasUsers}
              fileUsers={props.fileUsers}
              setSlackVsFileDifferences={setSlackVsFileDifferences}>
            </CompareWithFileButton>
            <SlackVsFileDifferencesList
              slackAtlasUsers={props.slackAtlasUsers}
              slackVsFileDifferences={slackVsFileDifferences}
              setSlackVsFileDifferences={setSlackVsFileDifferences}>
            </SlackVsFileDifferencesList>
          </>
          :
          <></>
      }
      {
        props.azureActiveDirectoryUsers ?
          <>
            <button>Compare with AAD</button>
          </>
          :
          <>
          </>
      }
    </>
  );
}

