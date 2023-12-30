import inspect from 'browser-util-inspect';
import {slackConfig} from "./authConfig";
import axios, {AxiosHeaders, AxiosRequestConfig} from "axios";

export type SlackAtlasUser = {
  id: string,
  userName: string,
  email: string,
  title: string,
  managerId: string | undefined,
  active: boolean
};

export async function getSlackHierarchy(accessToken: string) {
  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });

  const config: AxiosRequestConfig<SlackAtlasUser[]> = {};
  config.headers = headers;
  const response = await axios.get<SlackAtlasUser[]>(slackConfig.slackAtlasEndpoint, config);

  console.log(`response.data: ${inspect(response.data, false, 99)}`);
  return response.data;
}
