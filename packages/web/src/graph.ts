import axios, { AxiosHeaders, AxiosRequestConfig } from "axios";
import { AADUser } from './components/aad/AADSection';

export async function getAADHierarchy(accessToken: string) {
  const azureActiveDirectoryUsers: AADUser[] = [];
  type AADUserResponse = {
    id: string,
    accountEnabled: boolean,
    displayName: string,
    employeeType: string | null,
    mail: string,
    jobTitle: string,
    manager?: {
      id: string
    }
  };
  type ManagerDataResponse = {
    "@odata.context": string;
    "@odata.nextLink": string | undefined;
    "value": AADUserResponse[]
  };
  try {
    let url = "https://graph.microsoft.com/v1.0/users?$expand=manager($levels=1;$select=id)&$select=id,accountEnabled,displayName,employeeType,mail,jobTitle";

    const headers = new AxiosHeaders({
      'Authorization': `Bearer ${accessToken}`
    });

    while(url !== "") {
      const config: AxiosRequestConfig<ManagerDataResponse> = {};
      config.headers = headers;
      const {data} = await axios.get<ManagerDataResponse>(url, config);
      url = data["@odata.nextLink"] ?? "";
      for(const value of data.value) {
        // Ignore entries with no mail set.
        if(!value.mail) {
          continue;
        }
        // Convert all email addresses to lowercase so we can use as Map keys
        value.mail = value.mail.toLowerCase();
        // We use a different type for the API response to the rest of the application
        // to decouple them.  They are fairly compatible at time of writing.
        const user: AADUser = {
          ...value,
          manager: undefined,
          managerId: value.manager?.id
        };
        azureActiveDirectoryUsers.push(user);
      }
    }
    return azureActiveDirectoryUsers;
  }
  catch (error) {
    console.error(error);
    return azureActiveDirectoryUsers;
  }
}

