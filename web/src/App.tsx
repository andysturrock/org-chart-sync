import {useState} from 'react';
import inspect from 'browser-util-inspect';
import {PageLayout} from './components/PageLayout';
import {graphAPIScopes, slackHierarchyAPIScopes} from './authConfig';
import {AADManagerData, ProfileData, getAADHierarchy, getProfileData} from './graph';
import {ProfileDataDiv} from './components/ProfileDataDiv';

import {AuthenticatedTemplate, UnauthenticatedTemplate, useMsal} from '@azure/msal-react';

import './App.css';

import Button from 'react-bootstrap/Button';
import {SilentRequest} from '@azure/msal-browser';
import {SlackAtlasUser, getSlackHierarchy} from './slack';

/**
* Renders information about the signed-in user or a button to retrieve data about the user
*/
function ProfileContent() {
  const {instance, accounts} = useMsal();
  const [graphData, setGraphData] = useState<ProfileData>();

  async function RequestProfileData() {
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent({
      ...graphAPIScopes,
      account: accounts[0],
    });
    const profileData = await getProfileData(authenticationResult.accessToken);
    setGraphData(profileData);
  }

  return (
    <>
      <h5 className="card-title">Welcome {accounts[0].name}</h5>
      <br />
      {graphData ? (
        <ProfileDataDiv graphData={graphData} />
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        <Button variant="secondary" onClick={RequestProfileData}>
          Request Profile Information
        </Button>
      )}
    </>
  );
}

function AADHierarchyContent() {
  const {instance, accounts} = useMsal();
  const [managerData, setManagerData] = useState<AADManagerData[]>();

  async function AADHierarchyData() {
    const silentRequest: SilentRequest = {
      scopes: graphAPIScopes.scopes,
      account: accounts[0]
    };
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent(silentRequest);
    const managerData = await getAADHierarchy(authenticationResult.accessToken);
    setManagerData(managerData);
  }

  return (
    <>
      <h5 className="card-title">Welcome {accounts[0].name}</h5>
      <br />
      {managerData ? (
        <label>
        Org stuff
          <textarea
            name="postContent"
            readOnly={true}
            rows={4} cols={40}
            value={"AAD Stuff here"}/>
        </label>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        <Button variant="secondary" onClick={AADHierarchyData}>
          Get AAD Hierarchy Information
        </Button>
      )}
    </>
  );
}

function SlackHierarchyContent() {
  const {instance, accounts} = useMsal();
  const [slackAtlasUsers, setSlackAtlasUsers] = useState<SlackAtlasUser[]>();

  const silentRequest: SilentRequest = {
    scopes: slackHierarchyAPIScopes.scopes,
    account: accounts[0]
  };

  async function slackHierarchyData(): Promise<void> {
    // Silently acquires an access token which is then attached to a request for MS Graph data
    const authenticationResult = await instance.acquireTokenSilent(silentRequest);
    // console.log(`authenticationResult for slackHierarchyData: ${inspect(authenticationResult, true, 99)}`);
    console.log(`authenticationResult.accessToken for slackHierarchyData: ${inspect(authenticationResult.accessToken, true, 99)}`);
    const slackAtlasUsers = await getSlackHierarchy(authenticationResult.accessToken);
    setSlackAtlasUsers(slackAtlasUsers);
  }
  return (
    <>
      {slackAtlasUsers ? (
        <label>
          TODO Slack Org Data coming here.
        </label>
      )
        :
        (
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          <Button variant="secondary" onClick={slackHierarchyData}>
          Get Slack Hierarchy Information
          </Button>
        )
      }
    </>
  );
}

/**
* If a user is authenticated the ProfileContent component above is rendered. Otherwise a message indicating a user is not authenticated is rendered.
*/
function MainContent() {
  return (
    <div className="App">
      <AuthenticatedTemplate>
        <ProfileContent />
        <AADHierarchyContent />
        <SlackHierarchyContent />
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <h5>
          <center>
            Please sign-in to Azure Active Directory and Slack using the buttons above.
          </center>
        </h5>
      </UnauthenticatedTemplate>
    </div>
  );
}

export default function App() {
  return (

    <PageLayout>
      <center>
        <MainContent />
      </center>
    </PageLayout>
  );
}