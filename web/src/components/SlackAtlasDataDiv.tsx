import React, {useState} from "react";
import {SlackAtlasUser} from "./SlackSection";
import {FileUser} from "./FileSection";
import {Button} from "react-bootstrap";
import {inspect} from "util";
import {AADUser} from "./AADSection";
import {useMsal} from "@azure/msal-react";
import {IPublicClientApplication, SilentRequest} from "@azure/msal-browser";
import {slackAtlasDataAPIScopes} from "../config";
import {patchSlackAtlasManager, patchSlackAtlasTitle} from "../slack";

enum FixAction {
  DeactivateSlackUser = "Deactivate user in Slack",
  AddSlackManager = "Add manager in Slack",
  UpdateSlackManager = "Update manager in Slack",
  RemoveSlackManager = "Remove manager in Slack",
  SetSlackTitle = "Set job title in Slack",
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
  slackTitle: string | undefined,
  fixAction: FixAction;
  fixNote: string
};

type SlackVsFileDifferencesListProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  slackVsFileDifferences: Map<string, SlackVsFileDifference[]> | undefined,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference[]> | undefined>>,
  children?: React.ReactNode,
};
function SlackVsFileDifferencesList(props: SlackVsFileDifferencesListProps) {
  const {instance, accounts} = useMsal();
  const silentRequest: SilentRequest = {
    scopes: slackAtlasDataAPIScopes.scopes,
    account: accounts[0]
  };

  type DifferenceRowProps = {
      differences: SlackVsFileDifference[],
      children?: React.ReactNode,
    };
  function DifferenceRow(props: DifferenceRowProps) {
    const tableRows: JSX.Element[] = [];
    for(const difference of props.differences) {
      const disabled = (difference.fixAction === FixAction.CannotFix ||
        difference.fixAction === FixAction.Fixed  ||
        difference.fixAction === FixAction.Fixing);
      tableRows.push (
        <tr key={difference.fixAction}>
          <td style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
            <Button
              variant="secondary"
              className="ml-auto"
              title="Select File"
              disabled={disabled}
              // eslint-disable-next-line @typescript-eslint/no-misused-promises
              onClick={async () => {await onFixInSlackButtonClick(difference);}}
            >
              {difference.fixAction}
            </Button>
          </td>
          <td style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
            {difference.fixNote}
          </td>
        </tr>
      );
    }
    return (
      <>
        <div>
          <table style={{width: 1200, borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
            <thead>
              <tr>
                <th style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>Fix Action</th>
                <th style={{textAlign: "center", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>Difference</th>
              </tr>
            </thead>
            <tbody>
              {tableRows}
            </tbody>
          </table>
          {props.children}
        </div>
        {props.children}
      </>
    );
  }

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
      for(const [email, differences] of props.slackVsFileDifferences) {
        tableRows.push (
          <tr key={email}>
            <td style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
              { email }
            </td>
            <td style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
              <DifferenceRow differences={differences}>
              </DifferenceRow>
            </td>
          </tr>
        );
      }
      return (
        <div>
          <h6 className="card-title">Differences Slack vs file</h6>
          <table style={{width: 1500, borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
            <thead style={{width: 1500, borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>
              <tr>
                <th style={{textAlign: "left", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>Email address</th>
                <th style={{textAlign: "center", borderWidth: 1, borderColor: "black", borderStyle: "solid"}}>Differences</th>
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

  async function onFixInSlackButtonClick(slackVsFileDifference: SlackVsFileDifference) {
    const fileVsSlackDifferences = new Map(props.slackVsFileDifferences);
    switch(slackVsFileDifference.fixAction) {
    case FixAction.UpdateSlackManager:
      await updateSlackAtlas(slackVsFileDifference, fileVsSlackDifferences, instance, silentRequest, props.setSlackVsFileDifferences);
      break;
    case FixAction.SetSlackTitle:
      await updateSlackAtlas(slackVsFileDifference, fileVsSlackDifferences, instance, silentRequest, props.setSlackVsFileDifferences);
      break;
    default:
      throw new Error("TODO");
      break;
    }
  }
}

type CompareWithFileButtonProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser>,
  fileUsers: Map<string, FileUser>,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference[]> | undefined>>,
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
    const differences = new Map<string, SlackVsFileDifference[]>();
    for(const [email, slackAtlasUser] of props.slackAtlasUsers) {
      const fileUser = props.fileUsers.get(email);
      const slackVsFileManagerDifference: SlackVsFileDifference = {
        fileUser,
        slackUser: slackAtlasUser,
        slackManager: slackAtlasUser.manager,
        newSlackManager: undefined,
        slackTitle: fileUser?.title,
        fileManager: undefined,
        fixAction: FixAction.CannotFix,
        fixNote: ""
      };
      // Person is in Slack but not the file
      if(!fileUser) {
        slackVsFileManagerDifference.fixAction = FixAction.DeactivateSlackUser;
        slackVsFileManagerDifference.fixNote = "User is in Slack but missing from file";
        differences.set(email, [slackVsFileManagerDifference]);
      }
      else {
        // Manager set in Slack but not in file
        if(slackAtlasUser.manager && !fileUser.manager) {
          slackVsFileManagerDifference.fixAction = FixAction.RemoveSlackManager;
          slackVsFileManagerDifference.fixNote = `Manager is ${slackAtlasUser.manager.email} in Slack but blank in file`;
          differences.set(email, [slackVsFileManagerDifference]);
        }
        // Manager set in Slack and file but different
        else if(slackAtlasUser.manager && fileUser.manager && fileUser.manager.email !== slackAtlasUser.manager.email) {
          slackVsFileManagerDifference.fileManager = props.fileUsers.get(fileUser.manager.email);
          slackVsFileManagerDifference.newSlackManager = props.slackAtlasUsers.get(fileUser.manager.email);
          if(slackVsFileManagerDifference.newSlackManager) {
            slackVsFileManagerDifference.fixAction = FixAction.UpdateSlackManager;
            slackVsFileManagerDifference.fixNote = `Manager is ${slackAtlasUser.manager.email} in Slack but ${fileUser.manager.email} in file`;
          }
          else {
            slackVsFileManagerDifference.fixAction = FixAction.CannotFix;
            slackVsFileManagerDifference.fixNote = "Manager does not exist in Slack";
          }
          differences.set(email, [slackVsFileManagerDifference]);
        }
        // Manager set in file but not in Slack
        else if(fileUser.manager && !slackAtlasUser.manager) {
          slackVsFileManagerDifference.fileManager = props.fileUsers.get(fileUser.manager.email);
          slackVsFileManagerDifference.newSlackManager = props.slackAtlasUsers.get(email);
          if(slackVsFileManagerDifference.newSlackManager) {
            slackVsFileManagerDifference.fixAction = FixAction.AddSlackManager;
            slackVsFileManagerDifference.fixNote = `Manager is missing in Slack but ${fileUser.manager.email} in file`;
          }
          else {
            slackVsFileManagerDifference.fixAction = FixAction.CannotFix;
            slackVsFileManagerDifference.fixNote = "Manager does not exist in Slack.  Create the manager in Slack and then re-run.";
          }
          differences.set(email, [slackVsFileManagerDifference]);
        }
        // Manager set in neither file nor Slack
        else if(!fileUser.manager && !slackAtlasUser.manager) {
          // OK
        }
        // Manager is the same in file and Slack
        else if(fileUser.manager?.email === slackAtlasUser.manager?.email) {
          // OK
        }
        // Presumably a logic error
        else {
          slackVsFileManagerDifference.fixAction = FixAction.CannotFix;
          slackVsFileManagerDifference.fixNote = "Contact Support";
          const differenceList = differences.get(email) || [];
          differenceList.push(slackVsFileManagerDifference);
          differences.set(email, differenceList);
        }
        // Title is set in file but not in Slack
        if(fileUser.title && !slackAtlasUser.title) {
          const slackVsFileTitleDifference: SlackVsFileDifference = {
            fileUser,
            slackUser: slackAtlasUser,
            slackManager: slackAtlasUser.manager,
            newSlackManager: undefined,
            slackTitle: fileUser?.title,
            fileManager: undefined,
            fixAction: FixAction.SetSlackTitle,
            fixNote: `Title is missing in Slack but "${fileUser.title}" in file`
          };
          const differenceList = differences.get(email) || [];
          differenceList.push(slackVsFileTitleDifference);
          differences.set(email, differenceList);
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
    useState<Map<string, SlackVsFileDifference[]> | undefined>(undefined);
  return (
    <>
      <div id="slack-atlas-data-div">
        <label>
        Number of Slack users: {props.slackAtlasUsers.size}
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

async function updateSlackAtlas(difference: SlackVsFileDifference,
  slackVsFileDifferences: Map<string, SlackVsFileDifference[]>,
  instance: IPublicClientApplication,
  silentRequest: SilentRequest,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference[]> | undefined>>) {

  const originalFixAction = difference.fixAction;
  difference.fixAction = FixAction.Fixing;
  // setState will only update state if it can see it's a new object
  setSlackVsFileDifferences(new Map(slackVsFileDifferences));

  const authenticationResult = await instance.acquireTokenSilent(silentRequest);
  if(!difference.slackUser) {
    throw new Error("Missing Slack user");
  }

  switch(originalFixAction) {
  case FixAction.UpdateSlackManager: {
    // If the manager is not set then explicitly pass null as the manager id.
    const managerId = difference.slackManager?.id || null;
    const success = await patchSlackAtlasManager(authenticationResult.accessToken, difference.slackUser.id, managerId);
    difference.fixAction = success? FixAction.Fixed : FixAction.CannotFix;
    break;
  }
  case FixAction.SetSlackTitle: {
    const title = difference.slackTitle || null;
    const success = await patchSlackAtlasTitle(authenticationResult.accessToken, difference.slackUser.id, title);
    difference.fixAction = success? FixAction.Fixed : FixAction.CannotFix;
    break;
  }
  
  default:
    throw new Error("TODO");
    break;
  }
  
  setSlackVsFileDifferences(new Map(slackVsFileDifferences));
}
