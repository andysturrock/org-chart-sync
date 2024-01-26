import {useState} from "react";
import {FileUser} from "./FileSection";
import {useMsal} from "@azure/msal-react";
import {SilentRequest} from "@azure/msal-browser";
import {slackAtlasDataAPIScopes} from "../config";
import inspect from "browser-util-inspect";
import {SlackAtlasDataDiv} from "./SlackAtlasDataDiv";
import {Button} from "react-bootstrap";
import {getSlackAtlasData} from "../slack";
import {getDummySlackData} from "./getDummySlackData";
import {AADUser} from "./AADSection";

export type SlackAtlasUser = {
  id: string,
  userName: string,
  email: string,
  title: string,
  managerId: string | undefined,
  manager: SlackAtlasUser | undefined,
  active: boolean,
  userType: string | undefined
  profileOnlyUser: boolean
};

type SlackSectionProps = {
  fileUsers: Map<string, FileUser> | undefined,
  azureActiveDirectoryUsers: Map<string, AADUser> | undefined,
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined;
  setSlackAtlasUsers: (slackAtlasUsers: Map<string, SlackAtlasUser>) => void;
};
export function SlackSection(props: SlackSectionProps) {
  const {instance, accounts} = useMsal();
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const silentRequest: SilentRequest = {
    scopes: slackAtlasDataAPIScopes.scopes,
    account: accounts[0]
  };

  const buttonText = buttonDisabled? "Getting Slack Atlas data..." : "Get Slack Atlas data";
  return (
    <>
      <hr />
      <h5 className="card-title">Slack Atlas data</h5>
      <br />
      {
        props.slackAtlasUsers ? (
          <SlackAtlasDataDiv
            slackAtlasUsers={props.slackAtlasUsers}
            fileUsers={props.fileUsers}
            azureActiveDirectoryUsers={props.azureActiveDirectoryUsers}
          />
        ) : (
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          <Button variant="secondary" onClick={onGetSlackAtlasDataButtonClick} disabled={buttonDisabled}>
            {buttonText}
          </Button>
        )
      }
    </>
  );

  async function onGetSlackAtlasDataButtonClick(): Promise<void> {
    setButtonDisabled(true);
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent(silentRequest);
    console.log(`authenticationResult.accessToken for slackAtlasData API: ${inspect(authenticationResult.accessToken, true, 99)}`);
    const slackAtlasUsers = await getSlackAtlasData(authenticationResult.accessToken);
    // const slackAtlasUsers = getDummySlackData();

    // Convert the array into a map keyed by email address.
    const slackAtlasUserMap = new Map<string, SlackAtlasUser>();
    // Also create the hierarchy, linking each user to their manager.
    // To do this use another map keyed by user id.
    const id2slackAtlasUserMap = new Map<string, SlackAtlasUser>();
    for(const slackAtlasUser of slackAtlasUsers) {
      // Ignore non-active users
      if(!slackAtlasUser.active) {
        console.log(`Ignoring ${slackAtlasUser.email} as inactive`);
        continue;
      }
      // Ignore bot users.  They have an email address ending in @slack-bots.com
      if(slackAtlasUser.email.match(/@slack-bots.com$/)) {
        console.log(`Ignoring ${slackAtlasUser.email} as bot user`);
        continue;
      }
      // Convert email to lowercase as sometimes it's stored in CamelCase and we will use it a Map key
      slackAtlasUser.email = slackAtlasUser.email.toLowerCase();
      // We have stored Profile Only users with +slackprofile as part of their email address.
      // Remove that so their email address matches what will be in the file, but mark them
      // as profile-only so we can add the +slackprofile part back in if needed.
      if(slackAtlasUser.email.match(/\+slackprofile@/)) {
        slackAtlasUser.email = slackAtlasUser.email.replace('+slackprofile@', '@');
        slackAtlasUser.profileOnlyUser = true;
      }
      else {
        slackAtlasUser.profileOnlyUser = false;
      }
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
}
