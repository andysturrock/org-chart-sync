import inspect from 'browser-util-inspect';
import {slackConfig} from "./config";
import axios, {AxiosHeaders, AxiosRequestConfig} from "axios";
import {SlackAtlasUser} from './components/SlackSection';

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
  type PatchSlackAtlasUser = {
    patchType: "manager",
    id: string,
    managerId: string | null
  };

  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });
  const patchSlackAtlasUser: PatchSlackAtlasUser = {
    patchType: "manager",
    id,
    managerId
  };

  const config: AxiosRequestConfig<PatchSlackAtlasUser> = {};
  config.headers = headers;
  const {data} = await axios.patch<PatchSlackAtlasUser>(slackConfig.slackAtlasEndpoint, patchSlackAtlasUser, config);

  return (data.managerId === managerId);
}

/**
 * Patches a new title in Slack for the given user
 * @param accessToken AAD access token with appropriate scope
 * @param id id of user to update
 * @param managerId id of manager.  Set to null to remove manager.
 * @returns true on success, otherwise false
 */
export async function patchSlackAtlasTitle(accessToken: string, id: string, title: string | null) {
  type PatchSlackAtlasUser = {
    patchType: "title",
    id: string,
    title: string | null
  };

  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });
  const patchSlackAtlasUser: PatchSlackAtlasUser = {
    patchType: "title",
    id,
    title
  };

  const config: AxiosRequestConfig<PatchSlackAtlasUser> = {};
  config.headers = headers;
  const {data} = await axios.patch<PatchSlackAtlasUser>(slackConfig.slackAtlasEndpoint, patchSlackAtlasUser, config);

  return (data.title === title);
}

/**
 * Create a new profile-only Slack user
 * @param accessToken AAD access token with appropriate scope
 * @param firstName Firstname of new user
 * @param lastName  Lastname of new user
 * @param userName Username of the new user.  Must be unique in Slack and less than 22 chars.
 * @param title Job title of new user
 * @param email Email of new user
 * @param userType User type.  Set to "[[profile-only]]" for profile-only users.
 * @param managerId Manager id in Slack of new user
 * @returns id of new user
 */
export async function postSlackAtlasData(accessToken: string,
  firstName: string,
  lastName: string,
  userName: string,
  title: string,
  email: string,
  userType: string,
  managerId: string | undefined | null) {
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
  const {data} = await axios.post<PostSlackAtlasUserResponse>(slackConfig.slackAtlasEndpoint, postSlackAtlasUser, config);

  return data.id;
}