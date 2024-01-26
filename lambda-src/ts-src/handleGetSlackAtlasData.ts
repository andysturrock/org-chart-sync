import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getUsers} from './slackAPI';
import {getSecretValue} from './awsAPI';

/**
 * Handle the request for Slack Atlas data
 * @param _event the event from the API requesting the data
 * @returns HTTP 200 with body containing Atlas information.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleGetSlackAtlasData(_event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const users = await getUsers();
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(users),
      statusCode: 200
    };

    return result;
  }
  catch (error) {
    console.error(error);

    const json = {
      error: JSON.stringify(util.inspect(error))
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
