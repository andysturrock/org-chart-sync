import {Component, ChangeEvent, createRef} from "react";
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
  // constant members
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

type FileSectionState = {
  selectedFile: File | null,
  fileVsSlackDifferences: Map<string, FileVsSlackDifference> | undefined
};

type FileSectionProps = {
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined,
  fileUsers: Map<string, FileUser> | undefined,
  setFileUsers: (fileUsers: Map<string, FileUser>) => void
};

/**
 * Renders information about the user obtained from MS Graph 
 * @param props
 */
export class FileSection extends Component<FileSectionProps, FileSectionState> {
  private hiddenFileInput = createRef<HTMLInputElement>();

  constructor(props: FileSectionProps) {
    super(props);
    this.state = {
      selectedFile: null,
      fileVsSlackDifferences: undefined
    };
  }

  private onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if(event.target.files) {
      this.setState({
        selectedFile: event.target.files[0],
      });

      const filereader = new FileReader();
      let fileContents = "";
      const onLoad = () => {
        // OK to cast here as we used readAsText to read the file so we know this will be a string.
        // See https://developer.mozilla.org/en-US/docs/Web/API/FileReader/result
        fileContents = filereader.result as string;
        const fileUsers = this.buildFileHierarchy(fileContents);
        this.props.setFileUsers(fileUsers);
        this.setState({
          fileVsSlackDifferences: undefined
        });
      };
      filereader.addEventListener("load", onLoad);
      filereader.readAsText(event.target.files[0]);
    }
  }

  private buildFileHierarchy(fileContents: string) {
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

  private compareWithSlack() {
    const differences = new Map<string, FileVsSlackDifference>();
    // This function shouldn't be called without this.props.fileUsers being populated
    // but the Typescript transpiler doesn't know that so add a guard here.
    if(this.props.fileUsers) {
      for(const [email, fileUser] of this.props.fileUsers) {
        const fileVsSlackDifference: FileVsSlackDifference = {
          fileUser: fileUser,
          slackUser: undefined,
          newSlackManager: undefined,
          fileManager: undefined,
          fixAction: undefined
        };
        const slackUser = this.props.slackAtlasUsers?.get(email);
        if(slackUser) {
          fileVsSlackDifference.slackUser = slackUser;
          // Manager is in the file but missing in Slack
          if(fileUser.manager && !slackUser.manager) {
            fileVsSlackDifference.fileManager = fileUser.manager;
            // Try to find the manager in Slack
            fileVsSlackDifference.newSlackManager = this.props.slackAtlasUsers?.get(fileUser.manager.email);
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
            fileVsSlackDifference.newSlackManager = this.props.slackAtlasUsers?.get(fileUser.manager.email);
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
            fileVsSlackDifference.newSlackManager = this.props.slackAtlasUsers?.get(fileUser.manager.email);
          }
          fileVsSlackDifference.fixAction = FixAction.AddSlackUser;
          differences.set(fileVsSlackDifference.fileUser.email, fileVsSlackDifference);
        }
      }
    }
    this.setState({
      fileVsSlackDifferences: differences
    });
  }

  private compareWithSlackButton() {
    if(this.props.slackAtlasUsers && this.state.selectedFile) {
      return (
        <Button
          variant="secondary"
          className="ml-auto"
          title="Compare with Slack Atlas"
          onClick={this.compareWithSlack.bind(this)}>
            Compare with Slack Atlas
        </Button>
      );
    }
    else return (
      <>
      </>
    );
  }

  private fileData() {
    if(this.state.selectedFile) {
      return (
        <div>
          <p>
            File Name:{" "}
            {this.state.selectedFile.name}
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

  private onSelectFileButtonClick() {
    this.hiddenFileInput.current?.click();
  }

  private async onFixInSlackButtonClick(difference: FileVsSlackDifference) {
    const {instance, accounts} = useMsal();
    const silentRequest: SilentRequest = {
      scopes: slackAtlasDataAPIScopes.scopes,
      account: accounts[0]
    };
    // TODO
    console.log(`Fix: ${inspect(difference, false, 99)}`);
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
      const success = await patchSlackAtlasData(authenticationResult.accessToken, difference.slackUser.id, difference.newSlackManager.id);
      difference.fixAction = success? FixAction.Fixed : FixAction.CannotFix;
      this.setState({
        fileVsSlackDifferences: this.state.fileVsSlackDifferences
      });}
      break;
    default:
      throw new Error("TODO");
      break;
    }
  }

  render() {
    return (
      <div>
        <hr />
        <h5 className="card-title">File data</h5>
        <br />
        <div>
          <input
            type="file"
            onChange={this.onFileChange.bind(this)}
            accept=".csv"
            style={{display: 'none'}}
            ref={this.hiddenFileInput}
          />
          <Button
            variant="secondary"
            className="ml-auto"
            title="Select File"
            onClick={this.onSelectFileButtonClick.bind(this)}>
              Select File
          </Button>
        </div>
        <div>
          {this.fileData()}
        </div>
        <div>
          {this.compareWithSlackButton()}
        </div>
        <div>
          {this.fileVsSlackDifferencesList()}
        </div>
      </div>
    );
  }

  fileVsSlackDifferencesList() {
    if(this.props.slackAtlasUsers && this.state.selectedFile && this.state.fileVsSlackDifferences) {
      if(this.state.fileVsSlackDifferences.size === 0) {
        return (
          <h6 className="card-title">No differences</h6>
        );
      }
      else {
        const tableRows: JSX.Element[] = [];
        for(const difference of this.state.fileVsSlackDifferences.values()) {
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
                  onClick={this.onFixInSlackButtonClick.bind(this, difference)}>
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
          </div>
        );
      }
    }
    else {
      return (
        <>
        </>
      );
    }
  }
}