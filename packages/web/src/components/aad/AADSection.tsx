import { SilentRequest } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';
import inspect from 'browser-util-inspect';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import { graphAPIScopes } from '../../config';
import { getAADHierarchy } from '../../graph';
import { User, UserByEmail } from '../UserHierarchy';

export type AADUser = {
  id: string;
  givenName: string;
  surname: string;
  displayName: string;
  jobTitle: string;
  mail: string;
  accountEnabled: boolean;
  managerId: string | undefined;
  manager: AADUser | undefined;
};

type AADSectionProps = {
  azureActiveDirectoryUsers: Map<string, AADUser> | undefined;
  setAzureActiveDirectoryUsers: (azureActiveDirectoryUsers: Map<string, AADUser>) => void;
  setUserMap: (userByEmail: UserByEmail) => void;
  children?: React.ReactNode;
};
export function AADSection(props: AADSectionProps) {
  const { instance, accounts } = useMsal();
  const [buttonDisabled, setButtonDisabled] = useState<boolean>(false);
  const [userByEmail, setUserByEmail] = useState<UserByEmail>(new Map<string, User>());

  async function getAADOrgData() {
    setButtonDisabled(true);
    const silentRequest: SilentRequest = {
      scopes: graphAPIScopes.scopes,
      account: accounts[0]
    };
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent(silentRequest);
    const azureActiveDirectoryUsers = await getAADHierarchy(authenticationResult.accessToken);

    const userMap = new Map<string, AADUser>();
    const id2User = new Map<string, AADUser>();
    for(const user of azureActiveDirectoryUsers) {
      console.log(`Checking user: ${inspect(user)}`);
      // Ignore inactive users
      if(!user.accountEnabled) {
        continue;
      }
      userMap.set(user.mail, user);
      id2User.set(user.id, user);
    }
    // Set the manager references
    for(const user of id2User.values()) {
      if(user.managerId) {
        const manager = id2User.get(user.managerId);
        user.manager = manager;
      }
    }
    console.log(`userMap.size: ${inspect(userMap.size)}`);

    const newUserByEmail: UserByEmail = new Map<string, User>();
    for(const aadUser of userMap.values()) {
      const user: User = {
        email: aadUser.mail,
        managerEmail: aadUser.manager? aadUser.manager.mail : null
      };
      newUserByEmail.set(aadUser.mail, user);
    }
    setUserByEmail(newUserByEmail);
    props.setAzureActiveDirectoryUsers(userMap);
    props.setUserMap(newUserByEmail);
    setButtonDisabled(false);
  }

  console.log(`userByEmail.size: ${userByEmail.size}`);
  console.log(`userByEmail: ${JSON.stringify(userByEmail)}`);
  console.log(userByEmail)
  return (
    <>
      <hr />
      <h5 className="card-title">AAD data</h5>
      <br />
      {userByEmail.size > 0 ? (
        <label>
        AAD Org Data
          <textarea
            name="AAD Org Data"
            readOnly={true}
            rows={4} cols={40}
            value={JSON.stringify(userByEmail)}/>
        </label>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        <Button variant="secondary" onClick={getAADOrgData} disabled={buttonDisabled}>
          Get AAD Hierarchy Information
        </Button>
      )}
    </>
  );
}