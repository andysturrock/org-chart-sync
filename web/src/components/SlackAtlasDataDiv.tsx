import React, {useState} from "react";
import {SlackAtlasUser} from "./SlackSection";
import {FileUser} from "./FileSection";
import {Button} from "react-bootstrap";
import {inspect} from "util";
import {AADUser} from "./AADSection";
import {useMsal} from "@azure/msal-react";
import {IPublicClientApplication, SilentRequest} from "@azure/msal-browser";
import {slackAtlasDataAPIScopes} from "../authConfig";
import {patchSlackAtlasData} from "../slack";

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
  fixAction: FixAction | undefined,
  fixNote?: string
};
type SlackVsFileDifferencesListProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  slackVsFileDifferences: Map<string, SlackVsFileDifference> | undefined,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference> | undefined>>,
  children?: React.ReactNode,
};
function SlackVsFileDifferencesList(props: SlackVsFileDifferencesListProps) {
  const {instance, accounts} = useMsal();
  const silentRequest: SilentRequest = {
    scopes: slackAtlasDataAPIScopes.scopes,
    account: accounts[0]
  };

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
                onClick={async () => {await onFixInSlackButtonClick(difference);}}>
                { difference.fixAction }
              </Button>
            </td>
            <td style={{textAlign: "left"}}>
              { difference.fixNote }
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
                <th style={{textAlign: "left"}}>Notes</th>
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
    console.log(`Fixing ${inspect(slackVsFileDifference)}`);
    const fileVsSlackDifferences = new Map(props.slackVsFileDifferences);
    switch(slackVsFileDifference.fixAction) {
    case FixAction.UpdateSlackManager:
      await updateSlackManager(slackVsFileDifference, fileVsSlackDifferences, instance, silentRequest, props.setSlackVsFileDifferences);
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
        slackVsFileDifference.fixNote = "User is in Slack but missing from file";
      }
      else {
        // Manager set in Slack but not in file
        if(slackAtlasUser.manager && !fileUser.manager) {
          slackVsFileDifference.fixAction = FixAction.RemoveSlackManager;
        }
        // Manager set in Slack and file but different
        else if(slackAtlasUser.manager && fileUser.manager && fileUser.manager.email !== slackAtlasUser.manager.email) {
          console.log(`user ${slackAtlasUser.email}: fileUser.manager.email = ${fileUser.manager.email}, slackAtlasUser.manager.email = ${slackAtlasUser.manager.email}`);
          slackVsFileDifference.fileManager = props.fileUsers.get(fileUser.manager.email);
          slackVsFileDifference.newSlackManager = props.slackAtlasUsers.get(fileUser.manager.email);
          if(slackVsFileDifference.newSlackManager) {
            slackVsFileDifference.fixAction = FixAction.UpdateSlackManager;
          }
          else {
            slackVsFileDifference.fixAction = FixAction.CannotFix;
            slackVsFileDifference.fixNote = "Manager does not exist in Slack";
          }
        }
        // Manager set in file but not in Slack
        else if(fileUser.manager && !slackAtlasUser.manager) {
          slackVsFileDifference.fileManager = props.fileUsers.get(fileUser.manager.email);
          slackVsFileDifference.newSlackManager = props.slackAtlasUsers.get(email);
          if(slackVsFileDifference.newSlackManager) {
            slackVsFileDifference.fixAction = FixAction.AddSlackManager;
          }
          else {
            slackVsFileDifference.fixAction = FixAction.CannotFix;
            slackVsFileDifference.fixNote = "Manager does not exist in Slack";
          }
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
          slackVsFileDifference.fixNote = "Contact Support";
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

async function updateSlackManager(difference: SlackVsFileDifference,
  slackVsFileDifferences: Map<string, SlackVsFileDifference>,
  instance: IPublicClientApplication,
  silentRequest: SilentRequest,
  setSlackVsFileDifferences: React.Dispatch<React.SetStateAction<Map<string, SlackVsFileDifference> | undefined>>) {
  let newDifference = slackVsFileDifferences.get(difference.slackUser.email);
  // Logic error
  if(!newDifference) {
    throw new Error("Cannot find difference in new Map");
  }
  newDifference.fixAction = FixAction.Fixing;
  setSlackVsFileDifferences(slackVsFileDifferences);

  const authenticationResult = await instance.acquireTokenSilent(silentRequest);
  // These are both logic errors.
  if(!difference.slackUser) {
    throw new Error("Missing Slack user");
  }
  // If the manager is not set then explicitly pass null as the manager id.
  const managerId = difference.slackManager ? difference.slackManager.id : null;
  const success = await patchSlackAtlasData(authenticationResult.accessToken, difference.slackUser.id, managerId);

  // TODO work out how to render each line separately and just trigger rerender of the specific line
  slackVsFileDifferences = new Map(slackVsFileDifferences);
  newDifference = slackVsFileDifferences.get(difference.slackUser.email);
  // Logic error
  if(!newDifference) {
    throw new Error("Cannot find difference in new Map");
  }
  newDifference.fixAction = success? FixAction.Fixed : FixAction.CannotFix;
  setSlackVsFileDifferences(slackVsFileDifferences);
}