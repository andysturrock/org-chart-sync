import {useMsal} from '@azure/msal-react';
import {getAADHierarchy} from '../graph';
import {graphAPIScopes} from '../config';
import {useState} from 'react';
import {SilentRequest} from '@azure/msal-browser';
import Button from 'react-bootstrap/Button';
import {inspect} from 'util';

export type AADUser = {
  id: string,
  displayName: string;
  jobTitle: string;
  mail: string;
  accountEnabled: boolean;
  managerId: string | undefined,
  manager: AADUser | undefined;
};

type AADSectionProps = {
  azureActiveDirectoryUsers: Map<string, AADUser> | undefined,
  setAzureActiveDirectoryUsers: (azureActiveDirectoryUsers: Map<string, AADUser>) => void,
  children?: React.ReactNode;
};
export function AADSection(props: AADSectionProps) {
  const {instance, accounts} = useMsal();
  const [buttonDisabled, setButtonDisabled] = useState(false);

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
    props.setAzureActiveDirectoryUsers(userMap);
    setButtonDisabled(false);
  }

  return (
    <>
      <hr />
      <h5 className="card-title">AAD data</h5>
      <br />
      {props.azureActiveDirectoryUsers ? (
        <label>
        AAD Org Data
          <textarea
            name="AAD Org Data"
            readOnly={true}
            rows={4} cols={40}
            value={inspect(props.azureActiveDirectoryUsers, true, null)}/>
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