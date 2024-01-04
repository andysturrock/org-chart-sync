import 'source-map-support/register';
import * as util from 'util';
import {APIGatewayProxyEvent, APIGatewayProxyResult} from "aws-lambda";
import {getSecretValue} from './awsAPI';

/**
 * Handle the request for POST to Slack Atlas
 * @param event the event from the API requesting the data
 * @returns HTTP 200 with both containing hierarchy information.
 */
export async function handlePostSlackAtlasData(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  try {
    console.log(`event: ${util.inspect(event, true, 99)}`);

    const accessControlAllowOrigin = await getSecretValue('OrgChartSync', 'Access-Control-Allow-Origin');
    
    const body = "Hello World";
    const result: APIGatewayProxyResult = {
      headers: {
        "Access-Control-Allow-Origin" : accessControlAllowOrigin,
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(body),
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
      headers: {
        "Access-Control-Allow-Origin" : "*",  // OK to allow any origin to get the error message
        "Access-Control-Allow-Credentials" : true
      },
      body: JSON.stringify(json),
      statusCode: 200
    };
    return result;
  }
}
