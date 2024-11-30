import { useState } from 'react';
import { AuthenticatedTemplate, UnauthenticatedTemplate, useMsal } from '@azure/msal-react';
import './App.css';
import { PageLayout } from './components/PageLayout';
import { FileSection, FileUser } from './components/FileSection';
import { SlackAtlasUser, SlackSection } from "./components/SlackSection";
import { AADSection, AADUser } from './components/AADSection';

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
        />
        <AADSection
          azureActiveDirectoryUsers={azureActiveDirectoryUsers}
          setAzureActiveDirectoryUsers={setAzureActiveDirectoryUsers}
        />
        <SlackSection
          slackAtlasUsers={slackAtlasUsers}
          setSlackAtlasUsers={setSlackAtlasUsers}
          fileUsers={fileUsers}
          azureActiveDirectoryUsers={azureActiveDirectoryUsers}
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