import inspect from 'browser-util-inspect';
import {graphConfig, slackConfig} from "./authConfig";
import axios, {AxiosHeaders, AxiosRequestConfig} from "axios";

export type SlackAtlasData = {
  id: string;
  userName: string;
  title: string;
  email: string;
  managerId: string;
};

export async function getSlackHierarchy(accessToken: string) {
  const headers = new AxiosHeaders({
    'Authorization': `Bearer ${accessToken}`
  });

  const slackAtlasData: SlackAtlasData[] = [];
  slackAtlasData.push({
    id: 'andyID',
    userName: 'andy.sturrock',
    title: '',
    email: '',
    managerId: ''
  });

  const config: AxiosRequestConfig<SlackAtlasData[]> = {};
  config.headers = headers;
  const response = await axios.get<SlackAtlasData[]>(slackConfig.slackAtlasEndpoint, config);
  return response.data;
}
