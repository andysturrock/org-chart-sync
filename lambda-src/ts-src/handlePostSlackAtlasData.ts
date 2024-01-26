import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getSecretValue} from './awsAPI';
import {postUser} from './slackAPI';
import axios from "axios";

type PostSlackAtlasUser = {
  firstName: string,
  lastName: string,
  userName: string,
  title: string,
  email: string,
  userType: string,
  managerId: string | undefined | null
};

/**
 * Handle the request for POST to Slack Atlas.  Creates Profile Only users.
 * @param event the event from the API requesting the data
 * @returns HTTP 200 with body containing the body of the call to Slack Atlas SCIM API.
 */
export async function handlePostSlackAtlasData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    if(!event.body) {
      throw new Error("Missing event body");
    }
    const postSlackAtlasUser: PostSlackAtlasUser = JSON.parse(event.body) as PostSlackAtlasUser;
    // TODO there is a better way to do this using keyof and a loop
    if(!postSlackAtlasUser.firstName) {
      throw new Error("Missing firstName property");
    }
    if(!postSlackAtlasUser.lastName) {
      throw new Error("Missing lastName property");
    }
    if(!postSlackAtlasUser.userName) {
      throw new Error("Missing userName property");
    }
    if(!postSlackAtlasUser.title) {
      throw new Error("Missing title property");
    }
    if(!postSlackAtlasUser.email) {
      throw new Error("Missing email property");
    }
    if(!postSlackAtlasUser.userType) {
      throw new Error("Missing userType property");
    }
    if(!postSlackAtlasUser.managerId) {
      postSlackAtlasUser.managerId = null;
    }

    const id = await postUser(postSlackAtlasUser.firstName,
      postSlackAtlasUser.lastName,
      postSlackAtlasUser.userName,
      postSlackAtlasUser.title,
      postSlackAtlasUser.email,
      postSlackAtlasUser.userType,
      postSlackAtlasUser.managerId);

    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify({id}),
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
