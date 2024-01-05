import {ChangeEvent, useRef, useState} from "react";
import {Button} from "react-bootstrap";
import {SlackAtlasUser} from "./SlackSection";
import {inspect} from "util";
import {useMsal} from "@azure/msal-react";
import {SilentRequest} from "@azure/msal-browser";
import {slackAtlasDataAPIScopes} from "../authConfig";
import {patchSlackAtlasData} from "../slack";

export type FileUser = {
  id: string,
  firstName: string,
  lastName: string,
  title: string,
  email: string,
  managerId: string | undefined
  manager: FileUser | undefined
};

enum FixAction {
  AddSlackUser = "Add user to Slack",
  AddSlackManager = "Add manager in Slack",
  UpdateSlackManager = "Update manager in Slack",
  RemoveSlackManager = "Remove manager in Slack",
  CannotFix = "Cannot fix",
  Fixed = "Fixed"
}

type FileVsSlackDifference = {
  fileUser: FileUser,
  slackUser: SlackAtlasUser | undefined,
  newSlackManager: SlackAtlasUser | undefined,
  fileManager: FileUser | undefined,
  fixAction: FixAction | undefined
};

type FileSectionProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  fileUsers: Map<string, FileUser> | undefined,
  setFileUsers: (fileUsers: Map<string, FileUser>) => void
};

type FileDataProps = {
  selectedFile: File | null,
  children?: React.ReactNode;
};
function FileData(props: FileDataProps) {
  if(props.selectedFile) {
    return (
      <div>
        <p>
          File Name:{" "}
          {props.selectedFile.name}
        </p>
      </div>
    );
  } else {
    return (
      <div>
        <h6>No file selected</h6>
      </div>
    );
  }
}

type CompareWithSlackButtonProps = {
  fileUsers: Map<string, FileUser> | undefined,
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  selectedFile: File | null,
  children?: React.ReactNode;
  setFileVsSlackDifferences: React.Dispatch<React.SetStateAction<Map<string, FileVsSlackDifference> | undefined>>
};
function CompareWithSlackButton(props: CompareWithSlackButtonProps) {
  if(props.slackAtlasUsers && props.selectedFile) {
    return (
      <>
        <Button
          variant="secondary"
          className="ml-auto"
          title="Compare with Slack Atlas"
          onClick={compareWithSlack}>
          Compare with Slack Atlas
        </Button>
        {props.children}
      </>
    );
  }
  else return (
    <>
    </>
  );

  function compareWithSlack() {
    const differences = new Map<string, FileVsSlackDifference>();
    // This function shouldn't be called without this.props.fileUsers being populated
    // but the Typescript transpiler doesn't know that so add a guard here.
    if(props.fileUsers) {
      for(const [email, fileUser] of props.fileUsers) {
        const fileVsSlackDifference: FileVsSlackDifference = {
          fileUser: fileUser,
          slackUser: undefined,
          newSlackManager: undefined,
          fileManager: undefined,
          fixAction: undefined
        };
        const slackUser = props.slackAtlasUsers?.get(email);
        if(slackUser) {
          fileVsSlackDifference.slackUser = slackUser;
          // Manager is in the file but missing in Slack
          if(fileUser.manager && !slackUser.manager) {
            fileVsSlackDifference.fileManager = fileUser.manager;
            // Try to find the manager in Slack
            fileVsSlackDifference.newSlackManager = props.slackAtlasUsers?.get(fileUser.manager.email);
            if(fileVsSlackDifference.newSlackManager) {
              fileVsSlackDifference.fixAction = FixAction.AddSlackManager;
            }
            else {
              fileVsSlackDifference.fixAction = FixAction.CannotFix;
            }
            differences.set(fileVsSlackDifference.fileUser.email, fileVsSlackDifference);
          }
          // Manager is not set in the file but is set in Slack
          else if(!fileUser.manager && slackUser.manager) {
            fileVsSlackDifference.newSlackManager = undefined;
            fileVsSlackDifference.fixAction = FixAction.RemoveSlackManager;
            differences.set(fileVsSlackDifference.fileUser.email, fileVsSlackDifference);
          }
          // Manager in the file and Slack but different
          else if(fileUser.manager && slackUser.manager && 
            fileUser.manager.email !== slackUser.manager.email) {
            // Try to find the manager in Slack
            fileVsSlackDifference.newSlackManager = props.slackAtlasUsers?.get(fileUser.manager.email);
            if(fileVsSlackDifference.newSlackManager) {
              fileVsSlackDifference.fixAction = FixAction.UpdateSlackManager;  
            }
            else {
              // This is probably a logic error
              fileVsSlackDifference.fixAction = FixAction.CannotFix;
            }
            differences.set(fileVsSlackDifference.fileUser.email, fileVsSlackDifference);
          }
        }
        // Person is in the file but not in Slack
        else {
          if(fileUser.manager) {
            // Try to find the manager in Slack
            fileVsSlackDifference.newSlackManager = props.slackAtlasUsers?.get(fileUser.manager.email);
          }
          fileVsSlackDifference.fixAction = FixAction.AddSlackUser;
          differences.set(fileVsSlackDifference.fileUser.email, fileVsSlackDifference);
        }
      }
    }
    props.setFileVsSlackDifferences(differences);
  }
}

type FileVsSlackDifferencesListProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  selectedFile: File | null,
  fileVsSlackDifferences: Map<string, FileVsSlackDifference> | undefined,
  children?: React.ReactNode,
  setFileVsSlackDifferences: React.Dispatch<React.SetStateAction<Map<string, FileVsSlackDifference> | undefined>>
};
function FileVsSlackDifferencesList(props: FileVsSlackDifferencesListProps) {
  const {instance, accounts} = useMsal();
  const silentRequest: SilentRequest = {
    scopes: slackAtlasDataAPIScopes.scopes,
    account: accounts[0]
  };
  
  async function onFixInSlackButtonClick(difference: FileVsSlackDifference) {
    // Copy the existing differences into a new Map and mutate that.
    // Otherwise the State doesn't update properly.
    const fileVsSlackDifferences = new Map(props.fileVsSlackDifferences);
    switch(difference.fixAction) {
    case FixAction.AddSlackManager: {
      const authenticationResult = await instance.acquireTokenSilent(silentRequest);
      // These are both logic errors.
      if(!difference.slackUser) {
        throw new Error("Missing Slack user");
      }
      if(!difference.newSlackManager) {
        throw new Error("Missing Slack new manager");
      }
      console.log(`Update manager on ${difference.slackUser.id} to ${difference.newSlackManager.id}`);
      
      const success = await patchSlackAtlasData(authenticationResult.accessToken, difference.slackUser.id, difference.newSlackManager.id);

      const newDifference = fileVsSlackDifferences.get(difference.fileUser.email);
      // Logic error
      if(!newDifference) {
        throw new Error("Cannot find difference in new Map");
      }
      newDifference.fixAction = success? FixAction.Fixed : FixAction.CannotFix;
      props.setFileVsSlackDifferences(fileVsSlackDifferences);
    
      break;
    }
    default:
      throw new Error("TODO");
      break;
    }
  }

  if(props.slackAtlasUsers && props.selectedFile && props.fileVsSlackDifferences) {
    if(props.fileVsSlackDifferences.size === 0) {
      return (
        <>
          <h6 className="card-title">No differences</h6>
          {props.children}
        </>
      );
    }
    else {
      const tableRows: JSX.Element[] = [];
      for(const difference of props.fileVsSlackDifferences.values()) {
        const disabled = (difference.fixAction === FixAction.CannotFix ||
        difference.fixAction === FixAction.Fixed);
        tableRows.push (
          <tr key={difference.fileUser.email}>
            <td style={{textAlign: "left"}}>
              { difference.fileUser.email }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.slackUser?.userName }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.fileManager?.email }
            </td>
            <td style={{textAlign: "left"}}>
              { difference.slackUser?.manager?.email }
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
          </tr>
        );
      }
      return (
        <div>
          <h6 className="card-title">Differences file vs Slack</h6>
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
  }
  else {
    return (
      <>
        {props.children}
      </>
    );
  }
}

export function FileSection(props: FileSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileVsSlackDifferences, setFileVsSlackDifferences] =
    useState<Map<string, FileVsSlackDifference> | undefined>(undefined);
  const hiddenFileInput = useRef<HTMLInputElement>(null);

  return (
    <div>
      <hr />
      <h5 className="card-title">File data</h5>
      <br />
      <div>
        <input
          type="file"
          onChange={onFileChange}
          accept=".csv"
          style={{display: 'none'}}
          ref={hiddenFileInput}
        />
        <Button
          variant="secondary"
          className="ml-auto"
          title="Select File"
          onClick={onSelectFileButtonClick}>
            Select File
        </Button>
      </div>
      <div>
        <FileData selectedFile={selectedFile}>
        </FileData>
      </div>
      <div>
        <CompareWithSlackButton
          fileUsers={props.fileUsers}
          slackAtlasUsers={props.slackAtlasUsers}
          selectedFile={selectedFile}
          setFileVsSlackDifferences={setFileVsSlackDifferences}
        >
        </CompareWithSlackButton>
      </div>
      <div>
        <FileVsSlackDifferencesList
          slackAtlasUsers={props.slackAtlasUsers}
          selectedFile={selectedFile}
          fileVsSlackDifferences={fileVsSlackDifferences}
          setFileVsSlackDifferences={setFileVsSlackDifferences}
        >
        </FileVsSlackDifferencesList>
      </div>
    </div>
  );

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if(event.target.files) {
      setSelectedFile(event.target.files[0]);
  
      const filereader = new FileReader();
      let fileContents = "";
      const onLoad = () => {
        // OK to cast here as we used readAsText to read the file so we know this will be a string.
        // See https://developer.mozilla.org/en-US/docs/Web/API/FileReader/result
        fileContents = filereader.result as string;
        const fileUsers = buildFileHierarchy(fileContents);
        props.setFileUsers(fileUsers);
        setFileVsSlackDifferences(undefined);
      };
      filereader.addEventListener("load", onLoad);
      filereader.readAsText(event.target.files[0]);
    }
  }

  function buildFileHierarchy(fileContents: string) {
    const email2FileUser = new Map<string, FileUser>();
    const id2FileUser = new Map<string, FileUser>();
    const lines = fileContents.split(/\n/);
    // Start at lineNumber = 1 to skip the header line
    for(let lineNumber = 1; lineNumber < lines.length; lineNumber++) {
      let line = lines[lineNumber];
      // Get rid of any newline/return chars
      line = line.replace(/\r/, "");
      line = line.replace(/\n/, "");
      if(line !== "") {
        const fields = line.split(/,/);
        const fileUser: FileUser = {
          id: fields[0],
          firstName: fields[1],
          lastName: fields[2],
          title: fields[3],
          email: fields[4],
          managerId: fields[5],
          manager: undefined
        };
        // Ensure email is all lowercase as we'll use it as a Map key
        fileUser.email = fileUser.email.toLowerCase();
        email2FileUser.set(fileUser.email, fileUser);
        id2FileUser.set(fileUser.id, fileUser);
      }
    }
    // Now go over the email2FileUser list and set the manager references
    for(const fileUser of email2FileUser.values()) {
      if(fileUser.managerId) {
        const manager = id2FileUser.get(fileUser.managerId);
        fileUser.manager = manager;
      }
    }
    return email2FileUser;
  }

  function onSelectFileButtonClick() {
    hiddenFileInput.current?.click();
  }
}
