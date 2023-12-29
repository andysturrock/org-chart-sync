import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getUsers} from './slackAPI';

/**
 * Handle the request for Slack Atlas hierarchy
 * @param event the event from the API requesting the hierarchy
 * @returns HTTP 200 with both containing hierarchy information.
 */
export async function handleGetSlackAtlasHierarchy(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log(`event: ${util.inspect(event, true, 99)}`);
    
    const users = await getUsers();
    const result: APIGatewayProxyResult = {
      body: JSON.stringify({
        message: users,
      }),
      statusCode: 200
    };

    console.log(`Returning ${util.inspect(result, true, 99)}`);

    return result;
  }
  catch (error) {
    console.error(error);

    const json = {
      error: JSON.stringify(util.inspect(error))
    };

    const result: APIGatewayProxyResult = {
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}
