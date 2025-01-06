import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import 'source-map-support/register';
import util from 'util';
import { getSecretValue } from "./awsAPI";
import { getUsers } from "./slackAPI";


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

    console.log(`result = ${util.inspect(result)}`);

    return result;
  }
  catch (error) {
    console.error(error);

    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : "*",  // OK to allow any origin to get the error message
        "Access-Control-Allow-Credentials" : true
      },
      body: "There was an error, please contact support",
      statusCode: 500
    };
    return result;
  }
}
