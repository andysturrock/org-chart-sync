import {useState} from "react";
import {FileUser} from "./FileSection";
import {useMsal} from "@azure/msal-react";
import {SilentRequest} from "@azure/msal-browser";
import {slackHierarchyAPIScopes} from "../authConfig";
import inspect from "browser-util-inspect";
import {SlackAtlasDataDiv} from "./SlackAtlasDataDiv";
import {Button} from "react-bootstrap";
import {getSlackHierarchy} from "../slack";
import {getDummySlackData} from "./getDummySlackData";

export type SlackAtlasUser = {
  id: string,
  userName: string,
  email: string,
  title: string,
  managerId: string | undefined,
  manager: SlackAtlasUser | undefined,
  active: boolean
};

type SlackSectionProps = {
  fileUsers: Map<string, FileUser> | undefined,
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined;
  setSlackAtlasUsers: (slackAtlasUsers: Map<string, SlackAtlasUser>) => void;
};

export function SlackSection(props: SlackSectionProps) {
  const {instance, accounts} = useMsal();
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const silentRequest: SilentRequest = {
    scopes: slackHierarchyAPIScopes.scopes,
    account: accounts[0]
  };

  async function onClick(): Promise<void> {
    setButtonDisabled(true);
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent(silentRequest);
    // console.log(`authenticationResult for slackHierarchyData: ${inspect(authenticationResult, true, 99)}`);
    console.log(`authenticationResult.accessToken for slackHierarchyData: ${inspect(authenticationResult.accessToken, true, 99)}`);
    // const slackAtlasUsers = await getSlackHierarchy(authenticationResult.accessToken);
    const slackAtlasUsers = getDummySlackData();

    // Convert the array into a map keyed by email address.
    const slackAtlasUserMap = new Map<string, SlackAtlasUser>();
    // Also create the hierarchy, linking each user to their manager.
    // To do this use another map keyed by user id.
    const id2slackAtlasUserMap = new Map<string, SlackAtlasUser>();
    for(const slackAtlasUser of slackAtlasUsers) {
      console.log(`slackAtlasUser = ${inspect(slackAtlasUser)}`);
      // Convert email to lowercase as sometimes it's stored in CamelCase
      slackAtlasUser.email = slackAtlasUser.email.toLowerCase();
      slackAtlasUserMap.set(slackAtlasUser.email, slackAtlasUser);
      id2slackAtlasUserMap.set(slackAtlasUser.id, slackAtlasUser);
    }
    // Now go back over all the users and add the manager references
    for(const slackAtlasUser of slackAtlasUsers) {
      if(slackAtlasUser.managerId) {
        const manager = id2slackAtlasUserMap.get(slackAtlasUser.managerId);
        slackAtlasUser.manager = manager;
      }
    }
    props.setSlackAtlasUsers(slackAtlasUserMap);
    setButtonDisabled(false);
  }
  const buttonText = buttonDisabled? "Getting Slack Atlas data..." : "Get Slack Atlas data";
  return (
    <>
      <hr />
      <h5 className="card-title">Slack Atlas data</h5>
      <br />
      {props.slackAtlasUsers ? (
        <SlackAtlasDataDiv slackAtlasUsers={props.slackAtlasUsers} />
      )
        :
        (
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          <Button variant="secondary" onClick={onClick} disabled={buttonDisabled}>
            {buttonText}
          </Button>
        )
      }
    </>
  );
}
