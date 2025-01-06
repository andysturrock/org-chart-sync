import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import { slackConfig } from "./config";
import { SlackAtlasUser } from './types/slack_atlas_user';

export async function getSlackAtlasData(accessToken: string) {
  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });

  const config: AxiosRequestConfig<SlackAtlasUser[]> = {};
  config.headers = headers;
  const response = await axios.get<SlackAtlasUser[]>(slackConfig.slackAtlasEndpoint, config);

  return response.data;
}

/**
 * Patches a new manager in Slack for the given user
 * @param accessToken AAD access token with appropriate scope
 * @param id id of user to update
 * @param managerId id of manager.  Set to null to remove manager.
 * @returns true on success, otherwise false
 */
export async function patchSlackAtlasManager(accessToken: string, id: string, managerId: string | null) {
  const patchedSlackAtlasUser: PatchedSlackAtlasUser = {
    patchType: "manager",
    id,
    managerId
  };

  const data = await patchSlackAtlasUser(accessToken, id, patchedSlackAtlasUser);

  return (data.managerId === managerId);
}

/**
 * Patches a new job title in Slack for the given user
 * @param accessToken AAD access token with appropriate scope
 * @param id id of user to update
 * @param title Job title for user.  Set to null to remove title.
 * @returns true on success, otherwise false
 */
export async function patchSlackAtlasTitle(accessToken: string, id: string, title: string | null) {
  const patchedSlackAtlasUser: PatchedSlackAtlasUser = {
    patchType: "title",
    id,
    title
  };

  const data = await patchSlackAtlasUser(accessToken, id, patchedSlackAtlasUser);

  return (data.title === title);
}

/**
 * Deactivates the given user in Slack
 * @param accessToken AAD access token with appropriate scope
 * @param id id of user to deactivate
 * @returns true on success (ie active state is now set to false), otherwise false
 */
export async function deactivateSlackAtlasUser(accessToken: string, id: string) {
  const patchedSlackAtlasUser: PatchedSlackAtlasUser = {
    patchType: "active",
    id,
    active: false
  };

  const data = await patchSlackAtlasUser(accessToken, id, patchedSlackAtlasUser);

  return (data.active === false);
}


type PatchedSlackAtlasUser = {
  patchType: "manager" | "title" | "active";
  id: string;
  // Explicit null means remove title
  title?: string | null;
  // Explicit null means remove manager
  managerId?: string | null;
  // Explicit false means deactivate
  active?: boolean | null;
};

async function patchSlackAtlasUser(accessToken: string, id: string, patchedSlackAtlasUser: PatchedSlackAtlasUser) {
  const config: AxiosRequestConfig<PatchedSlackAtlasUser> = {};
  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });
  config.headers = headers;
  console.log(`patchSlackAtlasUser: ${JSON.stringify(patchedSlackAtlasUser)}`)
  const { data } = await axios.patch<PatchedSlackAtlasUser>(slackConfig.slackAtlasEndpoint, patchedSlackAtlasUser, config);
  return data;
}

/**
 * Create a new Slack user.  Can be member or profile-only.
 * @param accessToken AAD access token with appropriate scope
 * @param firstName Firstname of new user
 * @param lastName  Lastname of new user
 * @param userName Username of the new user.  Must be unique in Slack and less than 22 chars.
 * @param title Job title of new user
 * @param email Email of new user
 * @param managerId Manager id in Slack of new user
 * @param profileOnly Create a profile-only user
 * @returns id of new user
 */
export async function postSlackAtlasData(accessToken: string,
  firstName: string,
  lastName: string,
  userName: string,
  title: string,
  email: string,
  managerId: string | undefined | null,
  profileOnly: boolean) {
  type PostSlackAtlasUser = {
    firstName: string,
    lastName: string,
    userName: string,
    title: string,
    email: string,
    userType: string,
    managerId: string | undefined | null
  };
  type PostSlackAtlasUserResponse = {
    id: string
  };

  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });

  const userType = profileOnly ? "[[profile-only]]" : "";
  const postSlackAtlasUser: PostSlackAtlasUser = {
    firstName,
    lastName,
    userName,
    title,
    email,
    userType,
    managerId
  };

  const config: AxiosRequestConfig<PostSlackAtlasUser> = {};
  config.headers = headers;
  const { data } = await axios.post<PostSlackAtlasUserResponse>(slackConfig.slackAtlasEndpoint, postSlackAtlasUser, config);

  return data.id;
}