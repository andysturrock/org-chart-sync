import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getSecretValue} from './awsAPI';
import {patchManager} from './slackAPI';
import axios from "axios";

type PatchSlackAtlasUser = {
  id: string,
  managerId: string | undefined | null
};

/**
 * Handle the request for POST to Slack Atlas
 * @param event the event from the API requesting the data
 * @returns HTTP 200 with body containing the new manager id
 */
export async function handlePatchSlackAtlasData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log(`event: ${util.inspect(event, true, 99)}`);
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const patchSlackAtlasUser: PatchSlackAtlasUser = JSON.parse(event.body) as PatchSlackAtlasUser;
    if(!patchSlackAtlasUser.id) {
      throw new Error("Missing id property");
    }
    if(!patchSlackAtlasUser.managerId) {
      patchSlackAtlasUser.managerId = null;
    }
 
    const returnedManagerId = await patchManager(patchSlackAtlasUser.id, patchSlackAtlasUser.managerId);
    if(returnedManagerId !== patchSlackAtlasUser.managerId) {
      throw new Error(`Update to manager ${patchSlackAtlasUser.managerId} for user id ${patchSlackAtlasUser.id} failed.`);
    }

    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify({managerId: returnedManagerId}),
      statusCode: 200
    };

    console.log(`Returning ${util.inspect(result, true, 99)}`);

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
