import {getSecretValue, putSecretValue} from "./awsAPI";
import axios, {AxiosRequestConfig} from "axios";
import querystring from 'querystring';
import {User} from "./slackTypes";
import util from "util";

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
  console.log(`refreshToken slackResponse.data: ${util.inspect(slackResponse.data, true, 99)}`);

  await putSecretValue('OrgChartSync', 'slackRefreshToken', slackResponse.data.refresh_token);

  return slackResponse.data.access_token;
}

/**
 * Get Users from Slack using SCIM API
 * @returns UsersResponse[]
 */
export async function getUsers() {
  type UsersResponse = {
    schemas: string[],
    id: string,
    userName: string,
    title: string
  };
  const slackBotToken = await refreshToken();

  const url = "https://api.slack.com/scim/v1/Users";
  const config: AxiosRequestConfig = {
    headers: { 
      "Authorization": `Bearer ${slackBotToken}`
    }
  };
  const usersResponse = await axios.get<UsersResponse[]>(url, config);

  console.log(`usersResponse.data: ${util.inspect(usersResponse.data, true, 99)}`);

  const users: User[] = [];
  for(const userResponse of usersResponse.data) {
    const user:User = {
      id: userResponse.id,
      userName: userResponse.userName,
      title: userResponse.title,
      managerId: undefined
    };
    users.push(user);
  }

  return users;
}