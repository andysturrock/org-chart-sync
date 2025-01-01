import { SilentRequest } from "@azure/msal-browser";
import { useMsal } from "@azure/msal-react";
import { useState } from "react";
import { Button } from "react-bootstrap";
import { getSlackAtlasData } from "../../api_wrappers";
import { slackAtlasDataAPIScopes } from "../../config";
import { SlackAtlasUser } from "../../types/slack_atlas_user";
import { AADUser } from "../aad/AADSection";
import { FileUser } from "../file/FileSection";
import { User, UserByEmail } from '../UserHierarchy';
import { SlackAtlasDataDiv } from "./SlackAtlasDataDiv";

type SlackSectionProps = {
  fileUsers: Map<string, FileUser> | undefined,
  azureActiveDirectoryUsers: Map<string, AADUser> | undefined,
  slackAtlasUsers: Map<string, SlackAtlasUser> | undefined;
  setSlackAtlasUsers: (slackAtlasUsers: Map<string, SlackAtlasUser>) => void;
  setSlackUserMap: (userByEmail: UserByEmail) => void;
  aadUserMap: UserByEmail | undefined;
  slackUserMap: UserByEmail | undefined;
};
export function SlackSection(props: SlackSectionProps) {
  const { instance, accounts } = useMsal();
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);

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
            aadUserMap={props.aadUserMap}
            slackUserMap={props.slackUserMap}
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
        console.debug(`Ignoring ${slackAtlasUser.email} as inactive`);
        continue;
      }
      // Ignore bot users.  They have an email address ending in @slack-bots.com
      if(slackAtlasUser.email.match(/@slack-bots.com$/)) {
        console.debug(`Ignoring ${slackAtlasUser.email} as bot user`);
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

    const userByEmail: UserByEmail = new Map<string, User>();
    for(const slackAtlasUser of slackAtlasUserMap.values()) {
      const user: User = {
        email: slackAtlasUser.email,
        managerEmail: slackAtlasUser.manager? slackAtlasUser.manager.email : null
      };
      userByEmail.set(slackAtlasUser.email, user);
    }
    props.setSlackAtlasUsers(slackAtlasUserMap);
    props.setSlackUserMap(userByEmail);
    setButtonDisabled(false);
  }
}
