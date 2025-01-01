import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import { useState } from 'react';
import './App.css';
import { AADSection, AADUser } from './components/aad/AADSection';
import { FileSection, FileUser } from './components/file/FileSection';
import { PageLayout } from './components/PageLayout';
import { SlackSection } from "./components/slack/SlackSection";
import { UserByEmail } from './components/UserHierarchy';
import { SlackAtlasUser } from './types/slack_atlas_user';

/**
* Renders information about the signed-in user or a button to retrieve data about the user
*/
function ProfileContent() {
  const { accounts } = useMsal();

  return (
    <>
      <hr />
      <h5 className="card-title">Welcome {accounts[0].name}</h5>
      <br />
      <p>Please note that to update Slack titles using this app you must first set the edit type to SCIM under Atlas&#8594;Configure Profiles using the Slack settings website.</p>
      <p>Unfortunately it is not possible to do this via API.</p>
    </>
  );
}

/**
* If a user is authenticated the ProfileContent component above is rendered. Otherwise a message indicating a user is not authenticated is rendered.
*/
function MainContent() {
  const [slackAtlasUsers, setSlackAtlasUsers] = useState<Map<string, SlackAtlasUser>>();
  const [fileUsers, setFileUsers] = useState<Map<string, FileUser>>();
  const [azureActiveDirectoryUsers, setAzureActiveDirectoryUsers] = useState<Map<string, AADUser>>();
  const [aadUserMap, setAADUserMap] = useState<UserByEmail>();
  const [slackUserMap, setSlackUserMap] = useState<UserByEmail>();

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
        <FileSection
          fileUsers={fileUsers}
          setFileUsers={setFileUsers}
          slackAtlasUsers={slackAtlasUsers}
          slackUserMap={slackUserMap}
          aadUserMap={aadUserMap}
        />
        <AADSection
          azureActiveDirectoryUsers={azureActiveDirectoryUsers}
          setAzureActiveDirectoryUsers={setAzureActiveDirectoryUsers}
          setUserMap={setAADUserMap}
        />
        <SlackSection
          slackAtlasUsers={slackAtlasUsers}
          setSlackAtlasUsers={setSlackAtlasUsers}
          setSlackUserMap={setSlackUserMap}
          fileUsers={fileUsers}
          azureActiveDirectoryUsers={azureActiveDirectoryUsers}
          aadUserMap={aadUserMap}
          slackUserMap={slackUserMap}
        />
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