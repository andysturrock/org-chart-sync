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

  console.log(`response.data: ${inspect(response.data, false, 99)}`);
  return response.data;
}
