import inspect from 'browser-util-inspect';
import {slackConfig} from "./authConfig";
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
export async function patchSlackAtlasData(accessToken: string, id: string, managerId: string | null) {
  type PatchSlackAtlasUser = {
    id: string,
    managerId: string | null
  };

  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });
  const patchSlackAtlasUser: PatchSlackAtlasUser = {
    id,
    managerId
  };

  const config: AxiosRequestConfig<PatchSlackAtlasUser> = {};
  config.headers = headers;
  const {data} = await axios.patch<PatchSlackAtlasUser>(slackConfig.slackAtlasEndpoint, patchSlackAtlasUser, config);

  return (data.managerId === managerId);
}