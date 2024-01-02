import inspect from 'browser-util-inspect';
import axios, {AxiosHeaders, AxiosRequestConfig} from "axios";

export type AADManagerData = {
  id: string;
  displayName: string;
  jobTitle: string;
  mail: string;
  userPrincipalName: string;
};

export async function getAADHierarchy(accessToken: string) {
  type ManagerDataResponse = {
    "@odata.context": string;
    "@odata.nextLink": string;
    "value": AADManagerData[]
  };
  try {
    let url = "https://graph.microsoft.com/v1.0/users?$expand=manager($levels=max;$select=id,displayName)&$select=id,displayName,";

    const headers = new AxiosHeaders({
      'Authorization': `Bearer ${accessToken}`
    });
    console.log(`Access token: ${accessToken}`);

    let managerData: AADManagerData[] = [];

    while(url != undefined) {
      const config: AxiosRequestConfig<ManagerDataResponse> = {};
      config.headers = headers;
      const response = await axios.get<ManagerDataResponse>(url, config);
      url = response.data["@odata.nextLink"];
      console.log(`url = ${url}`);
      managerData = managerData.concat(response.data.value);
    }
    return managerData;
  }
  catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    console.error(inspect(console.error));
  }
}