import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import axios from "axios";
import 'source-map-support/register';
import util from 'util';
import { getSecretValue } from './awsAPI';
import { patchManager, patchTitle, patchUserActivationState as setUserActivationState } from './slackAPI';

type PatchSlackAtlasUser = {
  patchType: "manager" | "title" | "active",
  id: string;
  managerId: string | undefined | null;
  title: string | undefined | null;
  active?: boolean | null;
};

/**
 * Handle the request for PATCH to Slack Atlas
 * @param event the event from the API requesting the data
 * @returns HTTP 200 with body containing the new manager id
 */
export async function handlePatchSlackAtlasData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const patchSlackAtlasUser: PatchSlackAtlasUser = JSON.parse(event.body) as PatchSlackAtlasUser;
    if(!patchSlackAtlasUser.patchType) {
      throw new Error("Missing patchType property");
    }
    if(!patchSlackAtlasUser.id) {
      throw new Error("Missing id property");
    }

    let body = {};
    switch(patchSlackAtlasUser.patchType) {
    case "manager": {
      if(!patchSlackAtlasUser.managerId || patchSlackAtlasUser.managerId === "") {
        patchSlackAtlasUser.managerId = null;
      }
     
      const newManagerId = await patchManager(patchSlackAtlasUser.id, patchSlackAtlasUser.managerId);
      if(newManagerId !== patchSlackAtlasUser.managerId) {
        throw new Error(`Update to manager ${patchSlackAtlasUser.managerId} for user id ${patchSlackAtlasUser.id} failed.`);
      }
      body = {managerId: newManagerId};
      break;
    }
    case "title": {
      if(!patchSlackAtlasUser.title || patchSlackAtlasUser.title === "") {
        patchSlackAtlasUser.title = null;
      }
     
      const newTitle = await patchTitle(patchSlackAtlasUser.id, patchSlackAtlasUser.title);
      if(newTitle !== patchSlackAtlasUser.title) {
        throw new Error(`Update to title ${patchSlackAtlasUser.title} for user id ${patchSlackAtlasUser.id} failed.`);
      }
      body = {title: newTitle};
      break;
    }
    case "active": {
      // Set to explicitly false for any "falsey" (eg null, undefined) value
      patchSlackAtlasUser.active = patchSlackAtlasUser.active ?? false;
      const newActive = await setUserActivationState(patchSlackAtlasUser.id, patchSlackAtlasUser.active);
      if(newActive !== patchSlackAtlasUser.active) {
        throw new Error(`Update of active field to ${patchSlackAtlasUser.active} for user id ${patchSlackAtlasUser.id} failed.`);
      }
      body = {active: newActive};
      break;
    }
    default:
      throw new Error(`Unknown patch type ${util.inspect(patchSlackAtlasUser.patchType)}`);
    }

    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(body),
      statusCode: 200
    };

    return result;
  }
  catch (error) {
    let errorMessage = "Unknown error";
    
    if(axios.isAxiosError(error)) {
      if(error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error(error.response.data);
        console.error(error.response.status);
        console.error(error.response.headers);
        errorMessage = "Failed to patch user - error from Slack";
      } else if(error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        console.error(error.request);
        errorMessage = "Failed to patch user - no response from Slack";
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error', error.message);
        errorMessage = "Failed to patch user - failed to send to Slack";
      }
      console.error(error.config);
      errorMessage = "Failed to patch user - unknown error";
    }
    else {
      console.error(error);
      errorMessage = "Failed to patch user - unknown error";
    }

    const json = {
      error: errorMessage
    };

    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : "*",  // OK to allow any origin to get the error message
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(json),
      statusCode: 500
    };
    return result;
  }
}
