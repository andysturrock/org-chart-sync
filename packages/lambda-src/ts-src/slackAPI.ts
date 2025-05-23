import axios, { AxiosRequestConfig } from "axios";
import querystring from 'querystring';
import { getSecretValue, putSecretValue } from "./awsAPI";
import { SlackAtlasUser } from "./slackTypes";

/**
 * Refreshes the refresh token and returns an access token
 * @returns new access token
 */
export async function refreshToken() {
  const slackClientId = await getSecretValue("OrgChartSync", "slackClientId");
  const slackClientSecret = await getSecretValue('OrgChartSync', 'slackClientSecret');
  const slackRefreshToken = await getSecretValue('OrgChartSync', 'slackRefreshToken');

  const config: AxiosRequestConfig = {
    headers: { 
      "Content-Type": "application/x-www-form-urlencoded"
    }
  };
  const url = "https://slack.com/api/oauth.v2.access";
  const form = querystring.stringify({
    grant_type: "refresh_token",
    refresh_token: slackRefreshToken,
    client_id: slackClientId,
    client_secret: slackClientSecret
  });
  type SlackResponse = {
    ok: boolean,
    app_id: string,
    user_id: string,
    scope: string,
    token_type: string,
    access_token: string,
    refresh_token: string,
    error?: string
  };
  const slackResponse = await axios.post<SlackResponse>(url, form, config);

  await putSecretValue('OrgChartSync', 'slackRefreshToken', slackResponse.data.refresh_token);

  return slackResponse.data.access_token;
}

/**
 * Get Users from Slack using SCIM API
 * @returns UsersResponse[]
 */
export async function getUsers() {
  type Email = {
    value: string,
    primary: boolean
  };
  type SchemaExtensionEnterprise1 = {
    manager: {
      managerId: string
    }
  };
  type Resource = {
    schemas: string[],
    id: string,
    userName: string,
    title: string,
    active: boolean,
    emails: Email[],
    "urn:scim:schemas:extension:enterprise:1.0"? : SchemaExtensionEnterprise1
  };
  type UsersResponse = {
    totalResults: number,
    itemsPerPage: number,
    startIndex: number,
    schemas: string[],
    Resources: Resource[]
  };
  const slackBotToken = await refreshToken();

  const users: SlackAtlasUser[] = [];
  let totalResults = 0;
  let startIndex = 1;
  let morePages = true;
  const count = 500;
  let url = `https://api.slack.com/scim/v1/Users?count=${count}&startIndex=${startIndex}`;
  const config: AxiosRequestConfig = {
    headers: { 
      "Authorization": `Bearer ${slackBotToken}`
    }
  };
  // Deal with pagination as per https://api.slack.com/changelog/2019-06-have-scim-will-paginate
  while(morePages) {
    const usersResponse = await axios.get<UsersResponse>(url, config);
    totalResults += usersResponse.data.itemsPerPage;
    morePages = totalResults < usersResponse.data.totalResults;
    startIndex += usersResponse.data.itemsPerPage;
    url = `https://api.slack.com/scim/v1/Users?count=${count}&startIndex=${startIndex}`;

    for(const resource of usersResponse.data.Resources) {
      let emailValue = "";
      for(const email of resource.emails) {
        if(email.primary) {
          emailValue = email.value;
        }
      }
      const user: SlackAtlasUser = {
        id: resource.id,
        userName: resource.userName,
        email: emailValue,
        title: resource.title,
        managerId: resource["urn:scim:schemas:extension:enterprise:1.0"]?.manager.managerId,
        active: resource.active
      };
      users.push(user);
    }
  }

  return users;
}

/**
 * Update a Slack user's activation state
 * @param id Slack id of the user being activated or deactivated
 * @returns The new activation state of the user (ie will return false if the user is deactivated)
 */
export async function patchUserActivationState(id: string, active: boolean) {
  const slackBotToken = await refreshToken();
  
  const config: AxiosRequestConfig = {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${slackBotToken}`
    }
  };

  // Slack is a bit strange how it activates and deactivates people.  You can't just PATCH the state.
  if(active) {
    // You use the https://slack.com/api/admin.users.assign API to reactivate them.
    // This adds them back into one of the workspaces in the grid and sets their "active" field to true.
    // They don't get added back to all the other workspaces automatically.
    // They also don't get added back to all their channels.
    const defaultTeam = await getSecretValue('OrgChartSync', 'defaultTeam');
    const postBody = {
      user_id: id,
      team_id: defaultTeam
    };

    type SlackResponse = {
      ok: boolean
    };
    const url = `https://slack.com/api/admin.users.assign`;
    const slackResponse = await axios.post<SlackResponse>(url, postBody, config);
    return slackResponse.data.ok;
  }
  else {
    // You have to use the DELETE verb in the SCIM API to deactivate people.
    // This sets their "active" field to false and presumably does something else in the background too.
    const url = `https://api.slack.com/scim/v1/Users/${id}`;
    await axios.delete(url, config);
    return false;
  }
}

/**
 * Update a Slack user's manager
 * @param id Slack id of the user being updated
 * @param managerId Slack id of the user's manager or null if removing the manaager
 * @returns The manager of the id that was set
 */
export async function patchManager(id: string, managerId: string | null) {
  const patchUsersRequest = {
    "urn:scim:schemas:extension:enterprise:1.0": {
      "manager": {
        "managerId": managerId
      }
    }
  };

  const slackBotToken = await refreshToken();
  const url = `https://api.slack.com/scim/v1/Users/${id}`;
  const config: AxiosRequestConfig = {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${slackBotToken}`
    }
  };
  type SlackResponse = {
    "urn:scim:schemas:extension:enterprise:1.0": {
      manager: {
          managerId: string
      }
  },
  };
  const slackResponse = await axios.patch<SlackResponse>(url, patchUsersRequest, config);
  return slackResponse.data['urn:scim:schemas:extension:enterprise:1.0'].manager.managerId;
}

/**
 * Update a Slack user's job title
 * @param id Slack id of the user being updated
 * @param title New job title or null if removing it
 * @returns The new title that was set
 */
export async function patchTitle(id: string, title: string | null) {
  const patchUsersRequest = {
    title
  };

  const slackBotToken = await refreshToken();
  const url = `https://api.slack.com/scim/v1/Users/${id}`;
  const config: AxiosRequestConfig = {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${slackBotToken}`
    }
  };
  type SlackResponse = {
    title:string
  };
  const slackResponse = await axios.patch<SlackResponse>(url, patchUsersRequest, config);
  return slackResponse.data.title;
}

/**
 * Create a Slack user
 * @param id Slack id of the user being updated
 * @param managerId Slack id of the user's manager or null if removing the manaager
 * @returns The manager of the id that was set
 */
export async function postUser(firstName: string,
  lastName: string,
  userName: string,
  title: string,
  email: string,
  userType: string | null,
  managerId: string | null) {
  const postUsersRequest = {
    schemas: [
      "urn:scim:schemas:core:1.0",
      "urn:scim:schemas:extension:enterprise:1.0"
    ],
    userName,
    name: {
      familyName: lastName,
      givenName: firstName,
    },
    displayName: `${firstName} ${lastName}`,
    emails: [
      {
        value: email,
        type: "work",
        primary: true
      }
    ],
    userType: userType,
    title: title,
    active: true,
    "urn:scim:schemas:extension:enterprise:1.0": {
      manager: {
        managerId: managerId
      }
    }
  };

  const slackBotToken = await refreshToken();
  const url = `https://api.slack.com/scim/v1/Users`;
  const config: AxiosRequestConfig = {
    headers: { 
      "Content-Type": "application/json",
      "Authorization": `Bearer ${slackBotToken}`
    }
  };
  type SlackResponse = {
    id: string
  };
  const {data} = await axios.post<SlackResponse>(url, postUsersRequest, config);
  return data.id;
}