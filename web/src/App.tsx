import {useState} from 'react';
import {graphAPIScopes} from './authConfig';
import {AADManagerData, getAADHierarchy} from './graph';

import {AuthenticatedTemplate, UnauthenticatedTemplate, useMsal} from '@azure/msal-react';

import './App.css';

import Button from 'react-bootstrap/Button';
import {SilentRequest} from '@azure/msal-browser';
import {PageLayout} from './components/PageLayout';
import {FileSection, FileUser} from './components/FileSection';
import {SlackAtlasUser, SlackSection} from "./components/SlackSection";

/**
* Renders information about the signed-in user or a button to retrieve data about the user
*/
function ProfileContent() {
  const {accounts} = useMsal();

  return (
    <>
      <hr />
      <h5 className="card-title">Welcome {accounts[0].name}</h5>
      <br />
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
      <hr />
      <h5 className="card-title">AAD data</h5>
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

/**
* If a user is authenticated the ProfileContent component above is rendered. Otherwise a message indicating a user is not authenticated is rendered.
*/
function MainContent() {
  const [slackAtlasUsers, setSlackAtlasUsers] = useState<Map<string, SlackAtlasUser>>();
  const [fileUsers, setFileUsers] = useState<Map<string, FileUser>>();
  return (
    <div className="App">
      <AuthenticatedTemplate>
        <br />
        <br />
        <h5>
          <center>
          This app helps sync the Azure Active Directory and Slack Atlas with a structure defined in a file.
          </center>
        </h5>
        <ProfileContent />
        <FileSection fileUsers={fileUsers} setFileUsers={setFileUsers} slackAtlasUsers={slackAtlasUsers}/>
        <AADHierarchyContent />
        <SlackSection slackAtlasUsers={slackAtlasUsers} setSlackAtlasUsers={setSlackAtlasUsers} fileUsers={undefined}/>
      </AuthenticatedTemplate>

      <UnauthenticatedTemplate>
        <h5>
          <center>
            Please sign-in.
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